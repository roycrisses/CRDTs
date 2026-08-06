/**
 * SYNCBOARD WHITEBOARD APPLICATION - AUDIT LOG
 * -------------------------------------------------------------
 * Daily Checks, Fixes, & Features implemented:
 *
 * 1. UI Upgrades:
 *    - Implemented a modern glassmorphism aesthetic across all components:
 *      TopBar, Toolbar, ZoomControls, and PropertyMenu using bg-white/90,
 *      backdrop-blur-2xl, custom shadows, and borders.
 *    - Added a beautiful dot grid background pattern via radial/linear gradients.
 *    - Added a loading overlay with a pulsing activity icon during connection.
 *
 * 2. Collaborative Features & Syncing:
 *    - Integrated Yjs Text synchronization for the Room Name, allowing editability
 *      with input constraints (max 50 chars).
 *    - Implemented remote selection boxes and user labels in absolute screen coordinates
 *      dynamically tracking panning and zoom.
 *    - Real-time mouse cursor synchronization using Yjs awareness.
 *    - Tracking locally created element IDs in `localCreatedIdsRef` Set to automatically
 *      programmatically select them on the local client without remote interference.
 *    - Robust unmount cleanup of Yjs and awareness listeners to prevent leaks/errors.
 *
 * 3. Advanced Tools & Operations:
 *    - Highlighter tool implemented using PencilBrush with width 20 and opacity 0.4.
 *    - Image upload support limiting files to 3MB and enforcing image MIME types,
 *      converting to base64 for Yjs persistence, and loading safely via fabric.Image.fromURL.
 *    - Snap to Grid alignment utilizing state and a synchronized `snapToGridRef`.
 *    - Custom center/scale calculation for Fit-to-Screen zoom logic.
 *    - Keyboard shortcuts mapping (V, H, P, I, A, R, O, T, S, Ctrl+D duplication, Del, Undo/Redo).
 *    - Object duplication (Ctrl+D / Cmd+D) with precise offset spacing.
 *    - Opacity, Stroke, Font sizing, and Font family styling in PropertyMenu.
 * -------------------------------------------------------------
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Activity } from 'lucide-react';
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
  content?: string;
  style: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    fontSize?: number;
    fontFamily?: string;
  };
  path?: (string | number)[][];
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
};

export interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

export interface FabricCanvasExtended extends fabric.Canvas {
  isDragging?: boolean;
  lastPosX?: number;
  lastPosY?: number;
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
const USER_NAME = `User ${Math.floor(Math.random() * 1000)}`;
const USER_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)];

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [roomName, setRoomName] = useState('Main Workspace');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<Record<number, { left: number; top: number; width: number; height: number; color: string; name: string }>>({});
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [propertyMenuRect, setPropertyMenuRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const snapToGridRef = useRef(false);
  const localCreatedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Duplicate functionality defined with useCallback and placed at top to avoid ESLint TDZ issues
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObj = fabricRef.current.getActiveObject();
    if (!activeObj) return;

    // Handle single or grouped objects
    const targetObj = activeObj as FabricObjectWithId;
    if (!targetObj.id) return;

    const sourceData = yElementsRef.current.get(targetObj.id);
    if (!sourceData) return;

    const id = crypto.randomUUID();
    localCreatedIdsRef.current.add(id);

    const duplicatedData: ElementData = {
      ...sourceData,
      id,
      position: {
        x: sourceData.position.x + 20,
        y: sourceData.position.y + 20,
      },
      zIndex: fabricRef.current.getObjects().indexOf(targetObj) + 1,
    };

    yElementsRef.current.set(id, duplicatedData);
  }, []);

  useEffect(() => {
    if (fabricRef.current) {
      const isFreeDrawing = activeTool === 'pencil' || activeTool === 'highlighter';
      fabricRef.current.isDrawingMode = isFreeDrawing;
      fabricRef.current.selection = activeTool === 'select';
      fabricRef.current.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      if (isFreeDrawing) {
        fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
        if (activeTool === 'pencil') {
          fabricRef.current.freeDrawingBrush.color = '#4f46e5';
          fabricRef.current.freeDrawingBrush.width = 3;
        } else if (activeTool === 'highlighter') {
          fabricRef.current.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.4)';
          fabricRef.current.freeDrawingBrush.width = 20;
        }
      }

      // Disable object selection unless in select mode
      fabricRef.current.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || activeTool === 'pencil' || activeTool === 'highlighter';
      });
      fabricRef.current.renderAll();
    }
  }, [activeTool]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');

    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    undoManager.on('stack-item-added', () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    });
    undoManager.on('stack-item-popped', () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    });

    const dbProvider = new IndexeddbPersistence('syncboard-v2', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);
    wsProviderRef.current = wsProvider;

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: USER_NAME,
      color: USER_COLOR,
    });

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const users: { id: number; name: string; color: string; cursor?: { x: number; y: number } }[] = [];
      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
          });
        }
      });
      setRemoteUsers(users);
    };

    awareness.on('change', handleAwarenessChange);

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
      if (existing) {
        if (data.type === 'path' && (existing as unknown as fabric.Path).path) return;

        const commonProps = {
          left: data.position.x,
          top: data.position.y,
          scaleX: data.scaleX || 1,
          scaleY: data.scaleY || 1,
          opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
        };

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rect = existing.item(0) as fabric.Rect;
          const text = existing.item(1) as unknown as fabric.IText;
          existing.set(commonProps);
          rect.set({ fill: data.style.fill });
          text.set({
            text: data.content,
            fontSize: data.style.fontSize || 16,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
          });
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          const line = existing.item(0) as unknown as fabric.Line;
          const tip = existing.item(1) as unknown as fabric.Triangle;
          existing.set(commonProps);
          line.set({ stroke: data.style.fill });
          tip.set({ fill: data.style.fill });
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
              fontSize: data.style.fontSize || 24,
              fontFamily: data.style.fontFamily || 'Inter, sans-serif',
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
          const rect = new fabric.Rect({
            width: 150,
            height: 150,
            fill: data.style.fill,
            rx: 8, ry: 8,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
          });
          const text = new fabric.IText(data.content || '', {
            fontSize: data.style.fontSize || 16,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fill: '#1e293b',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: 75,
            top: 75,
            width: 130,
            // @ts-expect-error: splitByGrapheme is missing in types but present in fabric
            splitByGrapheme: true
          });
          obj = new fabric.Group([rect, text], {
            left: data.position.x,
            top: data.position.y,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
          });
        } else if (data.type === 'arrow') {
          const line = new fabric.Line([0, 25, 100, 25], {
            stroke: data.style.fill,
            strokeWidth: 4,
            originX: 'center',
            originY: 'center',
          });
          const tip = new fabric.Triangle({
            width: 15,
            height: 15,
            fill: data.style.fill,
            left: 100,
            top: 25,
            angle: 90,
            originX: 'center',
            originY: 'center',
          });
          obj = new fabric.Group([line, tip], {
            left: data.position.x,
            top: data.position.y,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
          });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fontSize: data.style.fontSize || 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
          });
        } else if (data.type === 'path' && data.path) {
          obj = new fabric.Path(data.path as unknown as string, {
            left: data.position.x,
            top: data.position.y,
            fill: 'transparent',
            stroke: data.style.stroke,
            strokeWidth: data.style.strokeWidth,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(data.content, (img) => {
            if (!img) return; // Null-safety check
            img.set({
              left: data.position.x,
              top: data.position.y,
              scaleX: data.scaleX || 1,
              scaleY: data.scaleY || 1,
              opacity: data.style.opacity !== undefined ? data.style.opacity : 1,
            });
            (img as FabricObjectWithId).id = key;
            img.selectable = activeToolRef.current === 'select';
            fabricCanvas.add(img);
            if (typeof data.zIndex === 'number') {
              img.moveTo(data.zIndex);
            }

            if (localCreatedIdsRef.current.has(key)) {
              localCreatedIdsRef.current.delete(key);
              fabricCanvas.discardActiveObject();
              fabricCanvas.setActiveObject(img);
              setSelectedObject(img);
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

          // Programmatic selection if created locally
          if (localCreatedIdsRef.current.has(key)) {
            localCreatedIdsRef.current.delete(key);
            fabricCanvas.discardActiveObject();
            fabricCanvas.setActiveObject(obj);
            setSelectedObject(obj);
          }
        }
      }
    };

    const handleElementsObserve = (event: Y.YMapEvent<ElementData>) => {
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

    yElements.observe(handleElementsObserve);

    const handleRoomNameObserve = () => {
      setRoomName(yRoomName.toString());
    };
    yRoomName.observe(handleRoomNameObserve);

    // Initial load of room name
    if (yRoomName.toString() === '') {
      yRoomName.insert(0, 'Main Workspace');
    }

    const updateYjs = (e: fabric.IEvent) => {
      if (isUpdatingRef.current || !yElementsRef.current || !fabricRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;

      const data = yElementsRef.current.get(obj.id);
      if (data) {
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
          content: (obj as fabric.IText).text || data.content,
          style: {
            ...data.style,
            opacity: obj.opacity
          }
        });
      }
    };

    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.05) zoom = 0.05;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      setZoom(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      // !opt.target ensures background dragging doesn't override selection on click
      if (evt.altKey === true || activeToolRef.current === 'hand' || (activeToolRef.current === 'select' && !opt.target)) {
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;

      // Update local cursor inside awareness
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      if (fabricCanvas.isDragging) {
        const vpt = fabricCanvas.viewportTransform!;
        vpt[4] += e.clientX - fabricCanvas.lastPosX!;
        vpt[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
      }
    });

    fabricCanvas.on('mouse:up', () => {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform!);
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
    });

    // Handle selections carefully, querying activeObject and keeping it updated
    const handleSelection = () => {
      const activeObj = fabricCanvas.getActiveObject();
      setSelectedObject(activeObj || null);
      if (activeObj && (activeObj as FabricObjectWithId).id) {
        awareness.setLocalStateField('selectedId', (activeObj as FabricObjectWithId).id);
      } else {
        awareness.setLocalStateField('selectedId', null);
      }
    };

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', handleSelection);

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', (e) => {
      if (snapToGridRef.current && e.target) {
        const obj = e.target;
        obj.set({
          left: Math.round(obj.left! / 20) * 20,
          top: Math.round(obj.top! / 20) * 20,
        });
      }
      updateYjs(e);
    });
    fabricCanvas.on('object:scaling', updateYjs);

    fabricCanvas.on('editing:entered', () => {
      isUpdatingRef.current = true;
    });

    fabricCanvas.on('editing:exited', (e) => {
      isUpdatingRef.current = false;
      updateYjs(e);
    });

    fabricCanvas.on('path:created', (e: fabric.IEvent) => {
      const path = (e as unknown as { path: fabric.Path & { id?: string } }).path;
      const id = crypto.randomUUID();
      path.id = id;

      const isHighlighter = activeToolRef.current === 'highlighter';

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: {
          fill: 'transparent',
          stroke: isHighlighter ? 'rgba(255, 255, 0, 0.4)' : '#4f46e5',
          strokeWidth: isHighlighter ? 20 : 3,
          opacity: isHighlighter ? 0.4 : 1,
        },
        path: path.path as unknown as (string | number)[][]
      };

      yElementsRef.current?.set(id, data);
    });

    const handleResize = () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
      fabricCanvas.renderAll();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard to prevent accidental tool switches while editing text
      const activeObj = fabricCanvas.getActiveObject();
      const isEditingText = activeObj instanceof fabric.IText && activeObj.isEditing;
      if (isEditingText) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          undoManager.redo();
        } else {
          undoManager.undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
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
      wsProvider.destroy();
      dbProvider.destroy();
      yElements.unobserve(handleElementsObserve);
      yRoomName.unobserve(handleRoomNameObserve);
      awareness.off('change', handleAwarenessChange);
      fabricCanvas.dispose();
      fabricRef.current = null; // Prevent stale effects under React StrictMode
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject]);

  // Decoupled remote selection effect listening to 'after:render' to avoid redundant canvas init
  useEffect(() => {
    if (!fabricRef.current) return;
    const fabricCanvas = fabricRef.current;

    const updateSelections = () => {
      if (!fabricCanvas || !wsProviderRef.current) return;
      const awareness = wsProviderRef.current.awareness;
      const states = awareness.getStates();
      const selections: typeof remoteSelections = {};

      states.forEach((state: Record<string, unknown>, clientID) => {
        if (clientID === ydocRef.current?.clientID) return;
        const user = state.user as { name: string; color: string } | undefined;
        const selectedId = state.selectedId as string | undefined;

        if (user && selectedId) {
          const obj = fabricCanvas.getObjects().find((o: FabricObjectWithId) => o.id === selectedId);
          if (obj) {
            const rect = obj.getBoundingRect();
            const vpt = fabricCanvas.viewportTransform!;
            const topLeft = fabric.util.transformPoint(new fabric.Point(rect.left, rect.top), vpt);
            const bottomRight = fabric.util.transformPoint(new fabric.Point(rect.left + rect.width, rect.top + rect.height), vpt);
            selections[clientID] = {
              left: topLeft.x,
              top: topLeft.y,
              width: bottomRight.x - topLeft.x,
              height: bottomRight.y - topLeft.y,
              color: user.color,
              name: user.name,
            };
          }
        }
      });

      setRemoteSelections(prev => {
        const keys1 = Object.keys(prev);
        const keys2 = Object.keys(selections);
        if (keys1.length !== keys2.length) return selections;
        for (const k of keys1) {
          const p = prev[Number(k)];
          const s = selections[Number(k)];
          if (!s) return selections;
          if (p.left !== s.left || p.top !== s.top || p.width !== s.width || p.height !== s.height || p.color !== s.color || p.name !== s.name) {
            return selections;
          }
        }
        return prev;
      });
    };

    const awareness = wsProviderRef.current?.awareness;
    if (awareness) {
      awareness.on('change', updateSelections);
    }
    fabricCanvas.on('after:render', updateSelections);

    return () => {
      if (awareness) {
        awareness.off('change', updateSelections);
      }
      fabricCanvas.off('after:render', updateSelections);
    };
  }, [status]);

  const addShape = useCallback((type: Tool, base64Image?: string) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    localCreatedIdsRef.current.add(id);

    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    if (type === 'image' && base64Image) {
      const data: ElementData = {
        id,
        type: 'image',
        position: { x: center.x - 150, y: center.y - 150 },
        size: { width: 300, height: 300 },
        content: base64Image,
        style: { fill: 'transparent' }
      };
      yElementsRef.current.set(id, data);
      return;
    }

    const data: ElementData = {
      id,
      type: type as 'rectangle' | 'circle' | 'text' | 'sticky' | 'arrow',
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: (type === 'text' || type === 'sticky') ? 'Type something...' : undefined,
      style: {
        fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)],
        fontSize: type === 'sticky' ? 16 : (type === 'text' ? 24 : undefined),
        fontFamily: 'Inter, sans-serif'
      }
    };

    if (type !== 'select' && type !== 'pencil' && type !== 'highlighter' && type !== 'hand') {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, payload?: string) => {
    if (tool !== 'select' && tool !== 'pencil' && tool !== 'highlighter' && tool !== 'hand') {
      addShape(tool, payload);
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

        // Handle text properties safely
        if ('fill' in props) newData.style.fill = props.fill as string;
        if ('stroke' in props) newData.style.stroke = props.stroke as string;
        if ('strokeWidth' in props) newData.style.strokeWidth = props.strokeWidth;
        if ('opacity' in props) newData.style.opacity = props.opacity;
        if ('fontSize' in props) newData.style.fontSize = props.fontSize;
        if ('fontFamily' in props) newData.style.fontFamily = props.fontFamily;
        if ('content' in props) newData.content = props.content;

        // Sync zIndex if requested
        if (props.zAction === 'front') {
          newData.zIndex = fabricRef.current!.getObjects().length;
        } else if (props.zAction === 'back') {
          newData.zIndex = 0;
        }

        yElementsRef.current?.set(obj.id, newData);
      }
    });
    fabricRef.current.requestRenderAll();
  };

  const handleZoomIn = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() * 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() / 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleResetZoom = () => {
    if (!fabricRef.current) return;

    // Center and Fit to Screen Zoom Logic
    const objects = fabricRef.current.getObjects();
    if (objects.length === 0) {
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoom(1);
      return;
    }

    // Calculate overall bounding rect safely to avoid temporary group coordinate corruption
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
      const bound = obj.getBoundingRect();
      if (bound.left < minX) minX = bound.left;
      if (bound.top < minY) minY = bound.top;
      if (bound.left + bound.width > maxX) maxX = bound.left + bound.width;
      if (bound.top + bound.height > maxY) maxY = bound.top + bound.height;
    });

    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;
    const scaleX = (window.innerWidth - 100) / rectWidth;
    const scaleY = (window.innerHeight - 100) / rectHeight;
    let newZoom = Math.min(scaleX, scaleY);
    if (newZoom > 2) newZoom = 2;
    if (newZoom < 0.2) newZoom = 0.2;

    const centerX = minX + rectWidth / 2;
    const centerY = minY + rectHeight / 2;

    const vpt = fabricRef.current.viewportTransform!;
    vpt[0] = newZoom;
    vpt[3] = newZoom;
    vpt[4] = window.innerWidth / 2 - centerX * newZoom;
    vpt[5] = window.innerHeight / 2 - centerY * newZoom;

    fabricRef.current.requestRenderAll();
    setZoom(newZoom);
  };

  const handleExport = () => {
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

  const clearBoard = () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
      yElementsRef.current?.clear();
    }
  };

  const updateRoomName = (newName: string) => {
    if (ydocRef.current) {
      const yRoomName = ydocRef.current.getText('roomName');
      ydocRef.current.transact(() => {
        yRoomName.delete(0, yRoomName.length);
        yRoomName.insert(0, newName);
      });
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  // Decoupled PropertyMenu positioning update effect (reads ref inside event listener/effect)
  useEffect(() => {
    if (!fabricRef.current) return;
    const fabricCanvas = fabricRef.current;

    const updateMenuPos = () => {
      const activeObj = fabricCanvas.getActiveObject();
      if (activeObj) {
        const bound = activeObj.getBoundingRect();
        const vpt = fabricCanvas.viewportTransform!;
        const topLeft = fabric.util.transformPoint(new fabric.Point(bound.left, bound.top), vpt);
        const bottomRight = fabric.util.transformPoint(new fabric.Point(bound.left + bound.width, bound.top + bound.height), vpt);
        setPropertyMenuRect({
          left: topLeft.x,
          top: topLeft.y,
          width: bottomRight.x - topLeft.x,
          height: bottomRight.y - topLeft.y,
        });
      } else {
        setPropertyMenuRect(null);
      }
    };

    fabricCanvas.on('selection:created', updateMenuPos);
    fabricCanvas.on('selection:updated', updateMenuPos);
    fabricCanvas.on('selection:cleared', updateMenuPos);
    fabricCanvas.on('object:moving', updateMenuPos);
    fabricCanvas.on('object:scaling', updateMenuPos);
    fabricCanvas.on('after:render', updateMenuPos);

    return () => {
      fabricCanvas.off('selection:created', updateMenuPos);
      fabricCanvas.off('selection:updated', updateMenuPos);
      fabricCanvas.off('selection:cleared', updateMenuPos);
      fabricCanvas.off('object:moving', updateMenuPos);
      fabricCanvas.off('object:scaling', updateMenuPos);
      fabricCanvas.off('after:render', updateMenuPos);
    };
  }, [status, selectedObject]);

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-[#fcfcfd] overflow-hidden">
      {/* Loading overlay with pulsing icon */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-md flex items-center justify-center z-50 transition-all duration-300">
          <div className="bg-white/90 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-slate-100 animate-pulse">
            <Activity className="text-indigo-600 animate-spin" size={40} />
            <p className="text-sm font-semibold text-slate-700">Connecting to whiteboard...</p>
          </div>
        </div>
      )}

      <TopBar
        status={status}
        roomName={roomName}
        onRoomNameChange={updateRoomName}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={handleExport}
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
        viewportRect={propertyMenuRect}
        onUpdate={updateProperty}
      />

      <CursorsLayer users={remoteUsers} />

      {/* Render remote selections */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
        {Object.entries(remoteSelections).map(([id, s]) => (
          <div
            key={id}
            className="absolute border-2 transition-all duration-75"
            style={{
              left: s.left,
              top: s.top,
              width: s.width,
              height: s.height,
              borderColor: s.color,
            }}
          >
            <span
              className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow"
              style={{ backgroundColor: s.color }}
            >
              {s.name}
            </span>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} />
    </div>
  );
};
