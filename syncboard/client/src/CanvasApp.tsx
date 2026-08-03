/**
 * SYNCBOARD AUDIT LOG
 * ===================
 *
 * [2025-02-18] - Audit log initialized.
 * - Refactored CanvasApp.tsx types to support comprehensive ElementData including 'image' and 'highlighter' drawing.
 * - Implemented Room Name editing (50-char limit) with Yjs sync, avoiding React cascading render errors.
 * - Integrated snapping to grid with snapToGridRef to prevent lag.
 * - Added comprehensive Keyboard Shortcuts (V, H, P, I, A, R, O, T, S, Ctrl+D duplication, Del/Backspace).
 * - Fixed cleanup functions to unobserve Yjs structures and clear Fabric elements on unmount.
 * - Added remote user selection visualization with DOM overlays.
 * - Handled viewport transform updates during zooming/panning to correctly align floating PropertyMenu and remote indicators.
 * - Safe image deserialization from base64 strings using null-checks on fabric.Image.fromURL.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { CursorsLayer } from './components/CursorsLayer';
import { ZoomControls } from './components/ZoomControls';
import { PropertyMenu } from './components/PropertyMenu';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path' | 'arrow' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string; // stores text or base64 URL for images
  style: { fill: string; stroke?: string; strokeWidth?: number };
  path?: (string | number)[][];
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
};

export interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

export interface FabricCanvasExtended extends fabric.Canvas {
  isDragging?: boolean;
  lastPosX?: number;
  lastPosY?: number;
}

interface RemoteSelection {
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  userName: string;
}

interface RenderedRemoteSelection {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  userName: string;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
const USER_NAME = `User ${Math.floor(Math.random() * 1000)}`;
const USER_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)];

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('connecting');
  const [roomName, setRoomName] = useState('Main Workspace');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);

  // Track remote selections in state
  const [remoteSelections, setRemoteSelections] = useState<Record<number, RemoteSelection>>({});
  const [renderedRemoteSelections, setRenderedRemoteSelections] = useState<RenderedRemoteSelection[]>([]);

  // Viewport transform state to trigger absolute positioned DOM overlay updates on zoom/pan
  const [vpt, setVpt] = useState<number[]>([1, 0, 0, 1, 0, 0]);
  const [snapToGrid, setSnapToGrid] = useState(false);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yRoomNameRef = useRef<Y.Text | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const snapToGridRef = useRef(false);
  const localCreatedIdsRef = useRef<Set<string>>(new Set());

  // Store snapToGrid in ref for easy access inside listeners without re-initializing
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Duplicate active object callback
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObject = fabricRef.current.getActiveObject() as FabricObjectWithId;
    if (!activeObject || !activeObject.id) return;

    const sourceData = yElementsRef.current.get(activeObject.id);
    if (!sourceData) return;

    const id = crypto.randomUUID();
    localCreatedIdsRef.current.add(id);

    const duplicated: ElementData = {
      ...sourceData,
      id,
      position: {
        x: sourceData.position.x + 30,
        y: sourceData.position.y + 30,
      },
    };

    yElementsRef.current.set(id, duplicated);
  }, []);

  // Sync tool changes to Fabric instance
  useEffect(() => {
    activeToolRef.current = activeTool;
    const canvas = fabricRef.current;
    if (canvas) {
      canvas.isDrawingMode = activeTool === 'pencil' || activeTool === 'highlighter';
      canvas.selection = activeTool === 'select';
      canvas.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      if (activeTool === 'pencil') {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = 3;
        canvas.freeDrawingBrush.color = '#4f46e5';
      } else if (activeTool === 'highlighter') {
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.width = 20;
        canvas.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.4)';
      }

      // Disable or enable interactive selection of canvas items based on tool
      canvas.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select';
      });
      canvas.renderAll();
    }
  }, [activeTool]);

  // Handle entire room & collaborative elements initialization
  useEffect(() => {
    if (!canvasRef.current) return;

    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;

    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    const updateUndoRedoState = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    undoManager.on('stack-item-added', updateUndoRedoState);
    undoManager.on('stack-item-popped', updateUndoRedoState);

    const dbProvider = new IndexeddbPersistence('syncboard-v3', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: USER_NAME,
      color: USER_COLOR,
    });

    const roomNameObserver = () => {
      setRoomName(yRoomName.toString() || 'Main Workspace');
    };
    yRoomName.observe(roomNameObserver);

    // Initial setup for room name if populated asynchronously - safe from cascading render check
    const initialName = yRoomName.toString();
    if (initialName) {
      setTimeout(() => {
        setRoomName(initialName);
      }, 0);
    }

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    }) as FabricCanvasExtended;
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string): FabricObjectWithId | undefined =>
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key);
      const commonProps = {
        left: data.position.x,
        top: data.position.y,
        scaleX: data.scaleX || 1,
        scaleY: data.scaleY || 1,
        opacity: typeof data.opacity === 'number' ? data.opacity : 1,
      };

      if (existing) {
        if ((data.type as string) === 'path' && (existing as unknown as fabric.Path).path) return;

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rectObj = existing.item(0) as fabric.Rect;
          const textObj = existing.item(1) as unknown as fabric.IText;
          existing.set(commonProps);
          rectObj.set({ fill: data.style.fill });
          textObj.set({
            text: data.content,
            fontSize: data.fontSize || 16,
            fontFamily: data.fontFamily || 'Inter, sans-serif'
          });
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          const lineObj = existing.item(0) as unknown as fabric.Line;
          const tipObj = existing.item(1) as unknown as fabric.Triangle;
          existing.set(commonProps);
          lineObj.set({ stroke: data.style.fill });
          tipObj.set({ fill: data.style.fill });
        } else if (data.type === 'image' && existing instanceof fabric.Image) {
          existing.set({
            ...commonProps,
            width: data.size.width,
            height: data.size.height,
          });
        } else {
          existing.set({
            ...commonProps,
            width: data.size.width / (data.scaleX || 1),
            height: data.size.height / (data.scaleY || 1),
            fill: data.style.fill,
            stroke: data.style.stroke,
            strokeWidth: data.style.strokeWidth,
          });
          if (data.type === 'text' && existing instanceof fabric.IText) {
            existing.set({
              text: data.content,
              fontSize: data.fontSize || 24,
              fontFamily: data.fontFamily || 'Inter, sans-serif'
            });
          }
        }

        if (typeof data.zIndex === 'number') {
          existing.moveTo(data.zIndex);
        }
        existing.setCoords();
      } else {
        let obj: fabric.Object | undefined;
        if (data.type === 'sticky') {
          const rectObj = new fabric.Rect({
            width: 150,
            height: 150,
            fill: data.style.fill,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
          });
          const textObj = new fabric.IText(data.content || '', {
            fontSize: data.fontSize || 16,
            fontFamily: data.fontFamily || 'Inter, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: 75,
            top: 75,
            width: 130,
            // @ts-expect-error: splitByGrapheme is missing in types but present in fabric
            splitByGrapheme: true
          });
          obj = new fabric.Group([rectObj, textObj], {
            ...commonProps,
          });
        } else if (data.type === 'arrow') {
          const lineObj = new fabric.Line([0, 25, 100, 25], {
            stroke: data.style.fill,
            strokeWidth: 4,
            originX: 'center',
            originY: 'center',
          });
          const tipObj = new fabric.Triangle({
            width: 15,
            height: 15,
            fill: data.style.fill,
            left: 100,
            top: 25,
            angle: 90,
            originX: 'center',
            originY: 'center',
          });
          obj = new fabric.Group([lineObj, tipObj], {
            ...commonProps,
          });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            ...commonProps,
            width: data.size.width,
            height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            ...commonProps,
            radius: data.size.radius || 40,
            fill: data.style.fill,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            ...commonProps,
            fill: data.style.fill,
            fontFamily: data.fontFamily || 'Inter, sans-serif',
            fontSize: data.fontSize || 24,
          });
        } else if (data.type === 'path' && data.path) {
          obj = new fabric.Path(data.path as unknown as string, {
            ...commonProps,
            fill: 'transparent',
            stroke: data.style.stroke,
            strokeWidth: data.style.strokeWidth,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
          });
        } else if (data.type === 'image' && data.content) {
          // Safe loading of image to avoid crash on null string
          fabric.Image.fromURL(data.content, (img) => {
            if (!img) return;
            img.set({
              ...commonProps,
              width: data.size.width,
              height: data.size.height,
            });
            (img as FabricObjectWithId).id = key;
            img.selectable = activeToolRef.current === 'select';
            fabricCanvas.add(img);
            if (typeof data.zIndex === 'number') {
              img.moveTo(data.zIndex);
            }
            // If programmatically requested immediate selection
            if (localCreatedIdsRef.current.has(key)) {
              fabricCanvas.setActiveObject(img);
              setSelectedObject(img);
              localCreatedIdsRef.current.delete(key);
            }
            fabricCanvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        }

        if (obj) {
          (obj as FabricObjectWithId).id = key;
          obj.selectable = activeToolRef.current === 'select';
          fabricCanvas.add(obj);
          if (typeof data.zIndex === 'number') {
            obj.moveTo(data.zIndex);
          }
          if (localCreatedIdsRef.current.has(key)) {
            fabricCanvas.setActiveObject(obj);
            setSelectedObject(obj);
            localCreatedIdsRef.current.delete(key);
          }
        }
      }
    };

    const elementsObserver = (event: Y.YMapEvent<ElementData>) => {
      isUpdatingRef.current = true;
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const data = yElements.get(key);
          if (data) upsertFabricObject(key, data);
        } else if (change.action === 'delete') {
          const existing = findObjectById(key);
          if (existing) fabricCanvas.remove(existing);
        }
      });
      fabricCanvas.renderAll();
      isUpdatingRef.current = false;
    };
    yElements.observe(elementsObserver);

    const updateYjs = (e: fabric.IEvent) => {
      if (isUpdatingRef.current || !yElementsRef.current || !fabricRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;

      const data = yElementsRef.current.get(obj.id);
      if (data) {
        let contentValue = data.content;
        if (obj instanceof fabric.IText) {
          contentValue = obj.text;
        } else if (obj instanceof fabric.Group && obj.item(1) instanceof fabric.IText) {
          contentValue = (obj.item(1) as unknown as fabric.IText).text;
        }

        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: obj.left!, y: obj.top! },
          size: {
            width: obj.width!,
            height: obj.height!,
            radius: (obj as fabric.Circle).radius
          },
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          zIndex: fabricRef.current.getObjects().indexOf(obj),
          opacity: obj.opacity,
          content: contentValue,
        });
      }
    };

    // Shared awareness selection mapping logic
    const awarenessObserver = () => {
      const states = awareness.getStates();
      const users: { id: number; name: string; color: string; cursor?: { x: number; y: number } }[] = [];
      const selections: Record<number, RemoteSelection> = {};

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (user) {
          if (clientID !== ydoc.clientID) {
            users.push({
              id: clientID,
              name: user.name,
              color: user.color,
              cursor: state.cursor as { x: number; y: number } | undefined,
            });
          }

          // If remote selection is sent
          const remoteSel = state.selection as { left: number; top: number; width: number; height: number } | undefined;
          if (remoteSel && clientID !== ydoc.clientID) {
            selections[clientID] = {
              ...remoteSel,
              color: user.color,
              userName: user.name,
            };
          }
        }
      });
      setRemoteUsers(users);
      setRemoteSelections(selections);
    };

    awareness.on('change', awarenessObserver);

    // Grid snap math
    const snap = (val: number) => {
      return snapToGridRef.current ? Math.round(val / 20) * 20 : val;
    };

    // Fabric Canvas listeners
    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoomVal = fabricCanvas.getZoom();
      zoomVal *= 0.999 ** delta;
      if (zoomVal > 20) zoomVal = 20;
      if (zoomVal < 0.05) zoomVal = 0.05;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoomVal);
      setZoom(zoomVal);
      setVpt([...fabricCanvas.viewportTransform!]);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      if (
        evt.altKey === true ||
        activeToolRef.current === 'hand' ||
        (activeToolRef.current === 'select' && !opt.target)
      ) {
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;

      // Transform absolute cursor to canvas space coordinates for awareness
      const pointer = fabricCanvas.getPointer(e);
      awareness.setLocalStateField('cursor', {
        x: pointer.x,
        y: pointer.y,
      });

      if (fabricCanvas.isDragging) {
        const viewport = fabricCanvas.viewportTransform!;
        viewport[4] += e.clientX - fabricCanvas.lastPosX!;
        viewport[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
        setVpt([...viewport]);
      }
    });

    fabricCanvas.on('mouse:up', () => {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform!);
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
    });

    fabricCanvas.on('object:moving', (e) => {
      if (snapToGridRef.current && e.target) {
        e.target.left = snap(e.target.left || 0);
        e.target.top = snap(e.target.top || 0);
      }
      updateYjs(e);
    });

    fabricCanvas.on('object:scaling', (e) => {
      updateYjs(e);
    });

    fabricCanvas.on('object:modified', updateYjs);

    // Selection awareness state broadcasts
    const broadcastSelection = () => {
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj) {
        const rect = activeObj.getBoundingRect();
        awareness.setLocalStateField('selection', {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      } else {
        awareness.setLocalStateField('selection', null);
      }
    };

    fabricCanvas.on('selection:created', (e) => {
      if (fabricCanvas.getActiveObject()) {
        setSelectedObject(e.target || null);
        broadcastSelection();
      }
    });

    fabricCanvas.on('selection:updated', (e) => {
      if (fabricCanvas.getActiveObject()) {
        setSelectedObject(e.target || null);
        broadcastSelection();
      }
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      awareness.setLocalStateField('selection', null);
    });

    fabricCanvas.on('editing:entered', () => {
      isUpdatingRef.current = true;
    });

    fabricCanvas.on('editing:exited', (e) => {
      isUpdatingRef.current = false;
      updateYjs(e);
    });

    fabricCanvas.on('path:created', (e: fabric.IEvent) => {
      const pathObj = (e as unknown as { path: fabric.Path & { id?: string } }).path;
      const id = crypto.randomUUID();
      pathObj.id = id;

      const isHighlighter = activeToolRef.current === 'highlighter';
      const fillStroke = isHighlighter ? 'rgba(255, 255, 0, 0.4)' : '#4f46e5';
      const fillWidth = isHighlighter ? 20 : 3;

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: pathObj.left || 0, y: pathObj.top || 0 },
        size: { width: pathObj.width || 0, height: pathObj.height || 0 },
        style: { fill: 'transparent', stroke: fillStroke, strokeWidth: fillWidth },
        path: pathObj.path as unknown as (string | number)[][],
        opacity: isHighlighter ? 0.7 : 1,
      };

      yElementsRef.current?.set(id, data);
    });

    const handleResize = () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
      fabricCanvas.renderAll();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard keyboard shortcuts while editing input fields or active Text typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj && activeObj instanceof fabric.IText && activeObj.isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          undoManager.redo();
        } else {
          undoManager.undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        undoManager.redo();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        duplicateObject();
        e.preventDefault();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
          activeObjects.forEach((obj: FabricObjectWithId) => {
            if (obj.id) yElements.delete(obj.id);
          });
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
        }
      } else if (e.key.toLowerCase() === 'v') {
        setActiveTool('select');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTool('hand');
      } else if (e.key.toLowerCase() === 'p') {
        setActiveTool('pencil');
      } else if (e.key.toLowerCase() === 'i') {
        setActiveTool('highlighter');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool('arrow');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('rectangle');
      } else if (e.key.toLowerCase() === 'o') {
        setActiveTool('circle');
      } else if (e.key.toLowerCase() === 't') {
        setActiveTool('text');
      } else if (e.key.toLowerCase() === 's') {
        setActiveTool('sticky');
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Unobserve and cleanup listeners fully to prevent memory leaks and React StrictMode context failures
      yElements.unobserve(elementsObserver);
      yRoomName.unobserve(roomNameObserver);
      awareness.off('change', awarenessObserver);
      wsProvider.destroy();
      dbProvider.destroy();
      fabricCanvas.dispose();
      fabricRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject]);

  // Decoupled reactive effect to listen to Fabric rendering to update DOM indicator overlays
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleAfterRender = () => {
      setVpt([...canvas.viewportTransform!]);
    };

    canvas.on('after:render', handleAfterRender);
    return () => {
      canvas.off('after:render', handleAfterRender);
    };
  }, []);

  // Calculate transformed remote selections outside the render cycle in a reactive effect to avoid ref-access ESLint warnings
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const rendered = Object.entries(remoteSelections).map(([id, sel]) => {
      const p1 = fabric.util.transformPoint(new fabric.Point(sel.left, sel.top), canvas.viewportTransform!);
      const p2 = fabric.util.transformPoint(new fabric.Point(sel.left + sel.width, sel.top + sel.height), canvas.viewportTransform!);

      return {
        id,
        left: p1.x,
        top: p1.y,
        width: p2.x - p1.x,
        height: p2.y - p1.y,
        color: sel.color,
        userName: sel.userName,
      };
    });

    setRenderedRemoteSelections(rendered);
  }, [remoteSelections, vpt]);

  const addShape = useCallback((type: Tool, base64Content?: string) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fee2e2', '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff'];

    // Track the newly programmatically created ID
    localCreatedIdsRef.current.add(id);

    const data: ElementData = {
      id,
      type: type as 'rectangle' | 'circle' | 'text' | 'sticky' | 'arrow' | 'image',
      position: { x: center.x - 60, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: (type === 'text' || type === 'sticky') ? 'Type something...' : (type === 'image' ? base64Content : undefined),
      style: { fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)] }
    };

    if (type !== 'select' && type !== 'pencil' && type !== 'highlighter' && type !== 'hand') {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, content?: string) => {
    if (tool !== 'select' && tool !== 'pencil' && tool !== 'highlighter' && tool !== 'hand') {
      addShape(tool, content);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  const updateProperty = (props: Partial<fabric.ITextOptions> & { content?: string; zAction?: 'front' | 'back' }) => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;
      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const newData = { ...data };
        if ('fill' in props) newData.style.fill = props.fill as string;
        if ('stroke' in props) newData.style.stroke = props.stroke as string;
        if ('strokeWidth' in props) newData.style.strokeWidth = props.strokeWidth;
        if ('content' in props) newData.content = props.content;
        if ('opacity' in props) newData.opacity = props.opacity;
        if ('fontSize' in props) newData.fontSize = props.fontSize;
        if ('fontFamily' in props) newData.fontFamily = props.fontFamily;
        yElementsRef.current?.set(obj.id, newData);

        if (props.zAction === 'front') {
          obj.bringToFront();
        } else if (props.zAction === 'back') {
          obj.sendToBack();
        }
      }
    });
    fabricRef.current.requestRenderAll();
  };

  const handleZoomIn = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() * 1.25;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
    setVpt([...fabricRef.current.viewportTransform!]);
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() / 1.25;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
    setVpt([...fabricRef.current.viewportTransform!]);
  };

  const handleResetZoom = () => {
    if (!fabricRef.current) return;

    // Fit to Screen centering and scaling logic by manually calculating bounds of all canvas items
    const objects = fabricRef.current.getObjects();
    if (objects.length === 0) {
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoom(1);
      setVpt([1, 0, 0, 1, 0, 0]);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
      const rect = obj.getBoundingRect(true);
      if (rect.left < minX) minX = rect.left;
      if (rect.top < minY) minY = rect.top;
      if (rect.left + rect.width > maxX) maxX = rect.left + rect.width;
      if (rect.top + rect.height > maxY) maxY = rect.top + rect.height;
    });

    const padding = 60;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const scaleX = (window.innerWidth - padding * 2) / contentWidth;
    const scaleY = (window.innerHeight - padding * 2) / contentHeight;
    let fitZoom = Math.min(scaleX, scaleY);

    if (fitZoom > 3) fitZoom = 3;
    if (fitZoom < 0.1) fitZoom = 0.1;

    const vptX = window.innerWidth / 2 - (minX + contentWidth / 2) * fitZoom;
    const vptY = window.innerHeight / 2 - (minY + contentHeight / 2) * fitZoom;

    fabricRef.current.setViewportTransform([fitZoom, 0, 0, fitZoom, vptX, vptY]);
    setZoom(fitZoom);
    setVpt([fitZoom, 0, 0, fitZoom, vptX, vptY]);
  };

  const handleExportPNG = () => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: 'png',
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `syncboard-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleExportSVG = () => {
    if (!fabricRef.current) return;
    const svgStr = fabricRef.current.toSVG();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `syncboard-${Date.now()}.svg`;
    link.href = blobURL;
    link.click();
  };

  const clearBoard = () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
      yElementsRef.current?.clear();
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  const handleRoomNameChange = (newName: string) => {
    if (yRoomNameRef.current) {
      yRoomNameRef.current.delete(0, yRoomNameRef.current.length);
      yRoomNameRef.current.insert(0, newName);
    }
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden select-none">

      {/* Loading Overlay when status is connecting */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-md z-[999] flex flex-col items-center justify-center text-white">
          <svg className="animate-spin h-10 w-10 text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm font-semibold tracking-wide">Connecting to room...</p>
        </div>
      )}

      <TopBar
        status={status}
        roomName={roomName}
        onRoomNameChange={handleRoomNameChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        users={remoteUsers}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleToolChange}
        onClear={clearBoard}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
      />

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetZoom}
      />

      <PropertyMenu
        selectedObject={selectedObject}
        onUpdate={updateProperty}
        viewportTransform={vpt}
      />

      {/* Render Cursors relative to absolute coordinate tracking */}
      <CursorsLayer users={remoteUsers} />

      {/* Remote active user selection visualization box as a screen space DOM overlay */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {renderedRemoteSelections.map((sel) => {
          return (
            <div
              key={sel.id}
              className="absolute pointer-events-none border-2 border-dashed rounded transition-all duration-75"
              style={{
                left: sel.left,
                top: sel.top,
                width: sel.width,
                height: sel.height,
                borderColor: sel.color,
              }}
            >
              <div
                className="absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[10px] text-white font-bold whitespace-nowrap shadow"
                style={{ backgroundColor: sel.color }}
              >
                {sel.userName}
              </div>
            </div>
          );
        })}
      </div>

      <canvas ref={canvasRef} />
    </div>
  );
};
