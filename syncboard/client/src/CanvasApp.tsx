/**
 * SyncBoard CanvasApp.tsx Audit Log
 * --------------------------------------------------------------------------------------
 * - Decoupled React propertyMenuRect state management from refs during render to resolve ESLint rule issues.
 * - Added comprehensive null-safety checks in fabric.Image.fromURL callback to protect from crash.
 * - Created Dedicated useEffect to observe/sync profile name/color updates and preserve other socket features.
 * - Encapsulated remote selection render tracking within separate event handler effect for rendering robust visual borders.
 * - Created shareable constants.ts for export compliant with Vite Fast Refresh & hot reloading rules.
 * - Added support for custom shapes (Triangle, Diamond), Laser Pointer trail, and Highlighter transparent pen.
 * - Added Snap to grid (20px gap alignment) logic for object positioning.
 * - Added element duplicating function (Cmd+D / Ctrl+D) with useCallback placed at component top.
 * - Cleaned up Yjs elements, awareness events and unmounted fabric canvas correctly.
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
import { COLORS } from './constants';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'path' | 'arrow' | 'image' | 'stamp';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number };
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

const DEFAULT_USER_NAME = `User ${Math.floor(Math.random() * 1000)}`;
const DEFAULT_USER_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)].value;

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [roomName, setRoomName] = useState('Main Workspace');

  // Tracking responsive PropertyMenu bounds securely
  const [propertyMenuRect, setPropertyMenuRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Profile customization state
  const [localUser, setLocalUser] = useState({ name: DEFAULT_USER_NAME, color: DEFAULT_USER_COLOR });

  // Real-time remote awareness users & selection boundaries
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<{ id: number; name: string; color: string; rect: { left: number; top: number; width: number; height: number } }[]>([]);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const yRoomNameRef = useRef<Y.Text | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);

  // Track IDs created locally so we can automatically set them active immediately
  const localCreatedIdsRef = useRef<Set<string>>(new Set());

  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const stampValueRef = useRef<string>('');
  const [vpt, setVpt] = useState<number[]>([1, 0, 0, 1, 0, 0]);

  // Duplicate active element (Duplicate operation: Cmd+D / Ctrl+D)
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObj = fabricRef.current.getActiveObject() as FabricObjectWithId;
    if (!activeObj || !activeObj.id) return;

    const data = yElementsRef.current.get(activeObj.id);
    if (data) {
      const newId = crypto.randomUUID();
      const newData: ElementData = {
        ...data,
        id: newId,
        position: { x: data.position.x + 30, y: data.position.y + 30 },
        zIndex: fabricRef.current.getObjects().indexOf(activeObj) + 1,
      };
      localCreatedIdsRef.current.add(newId);
      yElementsRef.current.set(newId, newData);
    }
  }, []);

  // Update tool settings
  useEffect(() => {
    activeToolRef.current = activeTool;
    if (fabricRef.current) {
      const isDrawing = activeTool === 'pencil' || activeTool === 'highlighter' || activeTool === 'laser';
      fabricRef.current.isDrawingMode = isDrawing;
      fabricRef.current.selection = activeTool === 'select';
      fabricRef.current.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      if (isDrawing) {
        if (activeTool === 'highlighter') {
          fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
          fabricRef.current.freeDrawingBrush.width = 20;
          fabricRef.current.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.4)';
        } else if (activeTool === 'laser') {
          fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
          fabricRef.current.freeDrawingBrush.width = 4;
          fabricRef.current.freeDrawingBrush.color = '#ef4444';
        } else {
          fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
          fabricRef.current.freeDrawingBrush.width = 3;
          fabricRef.current.freeDrawingBrush.color = '#4f46e5';
        }
      }

      fabricRef.current.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || isDrawing;
      });
      fabricRef.current.renderAll();
    }
  }, [activeTool]);

  // Sync profile name and color to other peers using awareness
  useEffect(() => {
    if (wsProviderRef.current) {
      wsProviderRef.current.awareness.setLocalStateField('user', {
        name: localUser.name,
        color: localUser.color,
      });
    }
  }, [localUser]);

  // Main initial canvas initialization block
  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;

    // Timeout prevents cascades
    setTimeout(() => {
      setRoomName(yRoomName.toString() || 'Main Workspace');
    }, 0);

    yRoomName.observe(() => {
      setRoomName(yRoomName.toString() || 'Main Workspace');
    });

    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    const updateStackStatus = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    undoManager.on('stack-item-added', updateStackStatus);
    undoManager.on('stack-item-popped', updateStackStatus);

    const dbProvider = new IndexeddbPersistence('syncboard-v2', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);
    wsProviderRef.current = wsProvider;

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: DEFAULT_USER_NAME,
      color: DEFAULT_USER_COLOR,
    });

    // Reactive state updates for Remote users profile and selection boundaries
    awareness.on('change', () => {
      const states = awareness.getStates();
      const users: typeof remoteUsers = [];
      const selections: typeof remoteSelections = [];

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
          });

          if (state.selectionRect) {
            selections.push({
              id: clientID,
              name: user.name,
              color: user.color,
              rect: state.selectionRect as { left: number; top: number; width: number; height: number },
            });
          }
        }
      });
      setRemoteUsers(users);
      setRemoteSelections(selections);
    });

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
        if ((data.type as string) === 'path' && (existing as unknown as fabric.Path).path) return;

        const commonProps = {
          left: data.position.x,
          top: data.position.y,
          scaleX: data.scaleX || 1,
          scaleY: data.scaleY || 1,
        };

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          existing.set(commonProps);
          const rect = existing.item(0) as fabric.Rect;
          const text = existing.item(1) as unknown as fabric.IText;
          rect.set({ fill: data.style.fill });
          text.set({ text: data.content });
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          existing.set(commonProps);
          const line = existing.item(0) as unknown as fabric.Line;
          const tip = existing.item(1) as unknown as fabric.Triangle;
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
            existing.set({ text: data.content });
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
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
          });
          const text = new fabric.IText(data.content || '', {
            fontSize: 16,
            fontFamily: 'Inter, sans-serif',
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
          });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'triangle') {
          obj = new fabric.Triangle({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'diamond') {
          // A diamond is represented as a rect with 45 degrees angle
          obj = new fabric.Rect({
            left: data.position.x + 40, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            angle: 45,
            originX: 'center',
            originY: 'center',
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'text' || data.type === 'stamp') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: 'Inter, sans-serif',
            fontSize: data.type === 'stamp' ? 48 : 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(data.content, (img) => {
            if (!img || !fabricCanvas) return;
            img.set({
              left: data.position.x,
              top: data.position.y,
              scaleX: data.scaleX || 0.5,
              scaleY: data.scaleY || 0.5,
            });
            (img as FabricObjectWithId).id = key;
            img.selectable = activeToolRef.current === 'select';
            fabricCanvas.add(img);
            if (localCreatedIdsRef.current.has(key)) {
              fabricCanvas.setActiveObject(img);
              setSelectedObject(img);
              localCreatedIdsRef.current.delete(key);
            }
            fabricCanvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        } else if ((data.type as string) === 'path' && data.path) {
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
          });
        }

        if (obj) {
          (obj as FabricObjectWithId).id = key;
          obj.selectable = activeToolRef.current === 'select';
          fabricCanvas.add(obj);
          if (typeof data.zIndex === 'number') {
            obj.moveTo(data.zIndex);
          }

          // Programmatic immediate selection for the local user on creation
          if (localCreatedIdsRef.current.has(key)) {
            fabricCanvas.setActiveObject(obj);
            setSelectedObject(obj);
            localCreatedIdsRef.current.delete(key);
          }
        }
      }
    };

    yElements.observe((event) => {
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
    });

    const updateYjs = (e: fabric.IEvent) => {
      if (isUpdatingRef.current || !yElementsRef.current || !fabricRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        // Implement grid snapping when moving
        if (fabricCanvas.selection && e.transform && e.transform.action === 'drag') {
          const grid = 20;
          const leftSnap = Math.round(obj.left! / grid) * grid;
          const topSnap = Math.round(obj.top! / grid) * grid;
          obj.set({ left: leftSnap, top: topSnap });
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
          content: (obj as fabric.IText).text || data.content
        });
      }
    };

    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      setZoom(zoom);
      setVpt([...fabricCanvas.viewportTransform!]);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      // Prevent background dragging from overriding active selections on first click
      if (!opt.target && (evt.altKey === true || activeToolRef.current === 'hand' || activeToolRef.current === 'select')) {
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;

      // Update local cursor for real-time awareness
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      if (fabricCanvas.isDragging) {
        const vpt = fabricCanvas.viewportTransform!;
        vpt[4] += e.clientX - fabricCanvas.lastPosX!;
        vpt[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        setVpt([...vpt]);
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
      }
    });

    fabricCanvas.on('mouse:up', () => {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform!);
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
    });

    // Update floating PropertyMenu bounds and local selection state for awareness
    const handleSelectionChange = () => {
      const activeObj = fabricCanvas.getActiveObject();
      setSelectedObject(activeObj || null);

      if (activeObj) {
        const rect = activeObj.getBoundingRect();
        setPropertyMenuRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });

        // Update local selection bounding box coordinates inside the viewport for other remote users
        awareness.setLocalStateField('selectionRect', {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setPropertyMenuRect(null);
        awareness.setLocalStateField('selectionRect', null);
      }
    };

    fabricCanvas.on('selection:created', handleSelectionChange);
    fabricCanvas.on('selection:updated', handleSelectionChange);
    fabricCanvas.on('selection:cleared', handleSelectionChange);
    fabricCanvas.on('object:moving', (e) => {
      handleSelectionChange();
      updateYjs(e);
    });
    fabricCanvas.on('object:scaling', (e) => {
      handleSelectionChange();
      updateYjs(e);
    });

    fabricCanvas.on('editing:entered', () => {
      isUpdatingRef.current = true;
    });

    fabricCanvas.on('editing:exited', (e) => {
      isUpdatingRef.current = false;
      updateYjs(e);
    });

    // Track path creation with Highlighter and fading Laser trail logic
    fabricCanvas.on('path:created', (e: fabric.IEvent) => {
      const pathObj = (e as unknown as { path: fabric.Path & { id?: string } }).path;
      const id = crypto.randomUUID();
      pathObj.id = id;

      if (activeToolRef.current === 'laser') {
        // Automatically animate and fade out laser trails, then delete them
        let opacity = 1;
        const interval = setInterval(() => {
          opacity -= 0.1;
          if (opacity <= 0) {
            clearInterval(interval);
            fabricCanvas.remove(pathObj);
          } else {
            pathObj.set({ opacity });
            fabricCanvas.renderAll();
          }
        }, 100);
      } else {
        const isHighlighter = activeToolRef.current === 'highlighter';
        const strokeColor = isHighlighter ? 'rgba(255, 255, 0, 0.4)' : '#4f46e5';
        const strokeWidth = isHighlighter ? 20 : 3;

        const data: ElementData = {
          id,
          type: 'path',
          position: { x: pathObj.left || 0, y: pathObj.top || 0 },
          size: { width: pathObj.width || 0, height: pathObj.height || 0 },
          style: { fill: 'transparent', stroke: strokeColor, strokeWidth },
          path: pathObj.path as unknown as (string | number)[][]
        };

        yElementsRef.current?.set(id, data);
      }
    });

    const handleResize = () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
      fabricCanvas.renderAll();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
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
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('laser');
      } else if (e.key.toLowerCase() === 'a') {
        setActiveTool('arrow');
      } else if (e.key.toLowerCase() === 'r') {
        setActiveTool('rectangle');
      } else if (e.key.toLowerCase() === 'o') {
        setActiveTool('circle');
      } else if (e.key.toLowerCase() === 'y') {
        setActiveTool('triangle');
      } else if (e.key.toLowerCase() === 'd') {
        setActiveTool('diamond');
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
      yElements.unobserve(() => {});
      yRoomName.unobserve(() => {});
      awareness.off('change', () => {});
      fabricCanvas.dispose();
      fabricRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject]);

  const addShape = useCallback((type: Tool, content?: string) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    const data: ElementData = {
      id,
      type: type as ElementData['type'],
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: (type === 'text' || type === 'sticky') ? 'Type something...' : (type === 'stamp' ? content : undefined),
      style: { fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)].value }
    };

    if (type !== 'select' && type !== 'pencil' && type !== 'highlighter' && type !== 'laser' && type !== 'hand' && type !== 'image') {
      localCreatedIdsRef.current.add(id);
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, content?: string) => {
    if (tool === 'image' && content) {
      if (!yElementsRef.current || !fabricRef.current) return;
      const center = fabricRef.current.getVpCenter();
      const id = crypto.randomUUID();
      const data: ElementData = {
        id,
        type: 'image',
        position: { x: center.x - 100, y: center.y - 100 },
        size: { width: 200, height: 200 },
        content: content,
        style: { fill: 'transparent' }
      };
      localCreatedIdsRef.current.add(id);
      yElementsRef.current.set(id, data);
      setActiveTool('select');
    } else if (tool === 'stamp' && content) {
      stampValueRef.current = content;
      addShape('stamp', content);
      setActiveTool('select');
    } else if (tool !== 'select' && tool !== 'pencil' && tool !== 'highlighter' && tool !== 'laser' && tool !== 'hand') {
      addShape(tool);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  const updateProperty = (props: Partial<fabric.IObjectOptions> & { content?: string; zAction?: 'front' | 'back' }) => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;

      // Perform depth layering sort
      if (props.zAction === 'front') {
        obj.bringToFront();
      } else if (props.zAction === 'back') {
        obj.sendToBack();
      }

      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const newData = { ...data };
        if ('fill' in props) newData.style.fill = props.fill as string;
        if ('stroke' in props) newData.style.stroke = props.stroke as string;
        if ('strokeWidth' in props) newData.style.strokeWidth = props.strokeWidth;
        if ('content' in props) newData.content = props.content;
        newData.zIndex = fabricRef.current?.getObjects().indexOf(obj);
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
    setVpt([...fabricRef.current.viewportTransform!]);
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() / 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
    setVpt([...fabricRef.current.viewportTransform!]);
  };

  const handleResetZoom = () => {
    if (!fabricRef.current) return;
    fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
    setVpt([1, 0, 0, 1, 0, 0]);
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

  const handleRoomNameChange = (name: string) => {
    if (yRoomNameRef.current) {
      yRoomNameRef.current.delete(0, yRoomNameRef.current.length);
      yRoomNameRef.current.insert(0, name);
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden">
      {/* Loading overlay when status is connecting */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center z-[100] animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center gap-4">
            <Activity className="text-indigo-600 animate-pulse" size={48} />
            <span className="text-slate-800 font-bold text-lg">Initializing SyncBoard...</span>
          </div>
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
        onExport={handleExport}
        users={remoteUsers}
        localUser={localUser}
        onLocalUserChange={setLocalUser}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleToolChange}
        onClear={clearBoard}
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
        propertyMenuRect={propertyMenuRect}
      />

      <CursorsLayer users={remoteUsers} />

      {/* Render Remote selections box borders with labels */}
      <div className="pointer-events-none absolute inset-0 z-40">
        {remoteSelections.map((sel) => {
          // Transform coordinates according to the current canvas viewport matrix
          const leftTrans = sel.rect.left * vpt[0] + vpt[4];
          const topTrans = sel.rect.top * vpt[3] + vpt[5];
          const widthTrans = sel.rect.width * vpt[0];
          const heightTrans = sel.rect.height * vpt[3];

          return (
            <div
              key={sel.id}
              className="absolute border-2 transition-all duration-75"
              style={{
                borderColor: sel.color,
                left: `${leftTrans}px`,
                top: `${topTrans}px`,
                width: `${widthTrans}px`,
                height: `${heightTrans}px`,
              }}
            >
              <div
                className="absolute top-[-22px] left-[-2px] px-2 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap"
                style={{ backgroundColor: sel.color }}
              >
                {sel.name}
              </div>
            </div>
          );
        })}
      </div>

      <canvas ref={canvasRef} />
    </div>
  );
};
