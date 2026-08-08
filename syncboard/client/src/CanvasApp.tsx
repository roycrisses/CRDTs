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

/**
 * SyncBoard Codebase Audit & Update Log:
 * - Refactored active tool triggers and keyboard shortcuts mapping.
 * - Added triangle and diamond shape generators, along with custom emoji Stamp overlays.
 * - Implemented highlighter pencil brush with transparent yellow tint.
 * - Created laser pointer trail logic with automatic fades.
 * - Supported snap-to-grid alignment.
 * - Added custom user customized names/theme-colors broadcasted via WebRTC/awareness.
 * - Added robust property synchronization supporting font size, family, opacity, and layering.
 */

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'path' | 'arrow' | 'stamp';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    fontFamily?: string;
    fontSize?: number;
    opacity?: number;
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
const INITIAL_NAME = `User ${Math.floor(Math.random() * 1000)}`;
const INITIAL_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)];

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);

  // Room Name
  const [roomName, setRoomNameState] = useState('Main Workspace');
  const yRoomNameRef = useRef<Y.Text | null>(null);

  // User details
  const [localUser, setLocalUserState] = useState({ name: INITIAL_NAME, color: INITIAL_COLOR });
  const awarenessRef = useRef<WebsocketProvider['awareness'] | null>(null);

  // Grid Snapping
  const [snapToGrid, setSnapToGridState] = useState(false);
  const snapToGridRef = useRef(false);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');

  // Tracks active stamp emoji
  const activeStampEmojiRef = useRef<string>('👍');

  // Laser Pointer lines tracking
  const laserPointerLinesRef = useRef<fabric.Path[]>([]);

  const setSnapToGrid = (snap: boolean) => {
    setSnapToGridState(snap);
    snapToGridRef.current = snap;
  };

  const updateLocalUser = (name: string, color: string) => {
    setLocalUserState({ name, color });
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', { name, color });
    }
  };

  // Tool changing effect
  useEffect(() => {
    activeToolRef.current = activeTool;
    const fabricCanvas = fabricRef.current;
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = activeTool === 'pencil' || activeTool === 'highlighter' || activeTool === 'laser';
      fabricCanvas.selection = activeTool === 'select';
      fabricCanvas.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      if (activeTool === 'pencil') {
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.color = '#4f46e5';
        fabricCanvas.freeDrawingBrush.width = 3;
      } else if (activeTool === 'highlighter') {
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.color = 'rgba(234, 179, 8, 0.35)';
        fabricCanvas.freeDrawingBrush.width = 18;
      } else if (activeTool === 'laser') {
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.color = '#ef4444';
        fabricCanvas.freeDrawingBrush.width = 4;
      }

      // Disable object selection unless in select mode
      fabricCanvas.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || activeTool === 'pencil' || activeTool === 'highlighter';
      });
      fabricCanvas.renderAll();
    }
  }, [activeTool]);

  // Duplicate Object function
  const duplicateObject = useCallback(() => {
    const fabricCanvas = fabricRef.current;
    if (!fabricCanvas || !yElementsRef.current) return;
    const activeObj = fabricCanvas.getActiveObject() as FabricObjectWithId;
    if (!activeObj || !activeObj.id) return;

    const data = yElementsRef.current.get(activeObj.id);
    if (!data) return;

    const id = crypto.randomUUID();
    const clonedData: ElementData = {
      ...data,
      id,
      position: { x: data.position.x + 30, y: data.position.y + 30 },
      style: { ...data.style }
    };

    yElementsRef.current.set(id, clonedData);

    // Select the newly duplicated item programmatically after a tick
    setTimeout(() => {
      const obj = fabricCanvas.getObjects().find((o: FabricObjectWithId) => o.id === id);
      if (obj) {
        fabricCanvas.setActiveObject(obj);
        fabricCanvas.renderAll();
      }
    }, 100);
  }, []);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    // Room name text synchronization
    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;
    if (yRoomName.toString() === '') {
      yRoomName.insert(0, 'Main Workspace');
    }

    const roomNameListener = () => {
      setRoomNameState(yRoomName.toString());
    };
    yRoomName.observe(roomNameListener);
    
    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    const undoManagerAdded = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };
    const undoManagerPopped = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };
    undoManager.on('stack-item-added', undoManagerAdded);
    undoManager.on('stack-item-popped', undoManagerPopped);

    const dbProvider = new IndexeddbPersistence('syncboard-v3', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);
    
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awarenessRef.current = awareness;
    awareness.setLocalStateField('user', {
      name: INITIAL_NAME,
      color: INITIAL_COLOR,
    });

    const awarenessListener = () => {
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
    awareness.on('change', awarenessListener);

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
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fontSize: data.style.fontSize || 16
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
              fontFamily: data.style.fontFamily || 'Inter, sans-serif',
              fontSize: data.style.fontSize || 24
            });
          }
        }

        if (typeof data.zIndex === 'number') {
          existing.moveTo(data.zIndex);
        }

        existing.setCoords();
      } else {
        let obj: fabric.Object | undefined;
        const currentOpacity = data.style.opacity !== undefined ? data.style.opacity : 1;

        if (data.type === 'sticky') {
          const rect = new fabric.Rect({
            width: 150,
            height: 150,
            fill: data.style.fill,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
          });
          const text = new fabric.IText(data.content || '', {
            fontSize: data.style.fontSize || 16,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
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
            opacity: currentOpacity,
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
            opacity: currentOpacity,
          });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: currentOpacity,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: currentOpacity,
          });
        } else if (data.type === 'triangle') {
          obj = new fabric.Triangle({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: currentOpacity,
          });
        } else if (data.type === 'diamond') {
          // A diamond can be drawn as a Rect rotated 45 degrees
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            angle: 45,
            originX: 'center',
            originY: 'center',
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: currentOpacity,
          });
        } else if (data.type === 'stamp') {
          obj = new fabric.IText(data.content || '👍', {
            left: data.position.x, top: data.position.y,
            fontSize: 48,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: currentOpacity,
            editable: false,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fontSize: data.style.fontSize || 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: currentOpacity,
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
            opacity: currentOpacity,
          });
        }

        if (obj) {
          (obj as FabricObjectWithId).id = key;
          obj.selectable = activeToolRef.current === 'select';
          fabricCanvas.add(obj);
          if (typeof data.zIndex === 'number') {
            obj.moveTo(data.zIndex);
          }
        }
      }
    };

    const yElementsListener = (event: Y.YMapEvent<ElementData>) => {
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
    yElements.observe(yElementsListener);

    const updateYjs = (e: fabric.IEvent) => {
      if (isUpdatingRef.current || !yElementsRef.current || !fabricRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        let textVal = data.content;
        if (obj instanceof fabric.IText) {
          textVal = obj.text;
        } else if (obj instanceof fabric.Group && obj.item(1) instanceof fabric.IText) {
          textVal = (obj.item(1) as unknown as fabric.IText).text;
        }

        // Apply grid snapping to position coordinates if snapToGrid is enabled
        let leftCoord = obj.left!;
        let topCoord = obj.top!;
        if (snapToGridRef.current) {
          leftCoord = Math.round(leftCoord / 20) * 20;
          topCoord = Math.round(topCoord / 20) * 20;
          obj.set({ left: leftCoord, top: topCoord });
          obj.setCoords();
        }

        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: leftCoord, y: topCoord },
          size: { 
            width: obj.width!,
            height: obj.height!,
            radius: (obj as fabric.Circle).radius
          },
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          zIndex: fabricRef.current.getObjects().indexOf(obj),
          content: textVal
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
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      const pointer = fabricCanvas.getPointer(evt);

      // Handle placing stamp emojis directly
      if (activeToolRef.current === 'stamp') {
        const id = crypto.randomUUID();
        const data: ElementData = {
          id,
          type: 'stamp',
          position: { x: pointer.x - 24, y: pointer.y - 24 },
          size: { width: 48, height: 48 },
          content: activeStampEmojiRef.current,
          style: { fill: '#000' }
        };
        yElementsRef.current?.set(id, data);
        setActiveTool('select');
        return;
      }

      if (evt.altKey === true || activeToolRef.current === 'hand' || (activeToolRef.current === 'select' && !fabricCanvas.getActiveObject())) {
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;

      // Update local cursor for awareness
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

    fabricCanvas.on('selection:created', (e) => setSelectedObject(e.target || null));
    fabricCanvas.on('selection:updated', (e) => setSelectedObject(e.target || null));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', updateYjs);
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

      // Handle Laser Pointer Mode (automatic fade out and clean-up)
      if (activeToolRef.current === 'laser') {
        fabricCanvas.add(path);
        laserPointerLinesRef.current.push(path);

        // Animated fade-out of laser pointer stroke
        let currentStrokeOpacity = 1;
        const interval = setInterval(() => {
          currentStrokeOpacity -= 0.1;
          if (currentStrokeOpacity <= 0) {
            clearInterval(interval);
            fabricCanvas.remove(path);
            laserPointerLinesRef.current = laserPointerLinesRef.current.filter(p => p !== path);
          } else {
            path.set({ opacity: currentStrokeOpacity });
            fabricCanvas.renderAll();
          }
        }, 100);
        return;
      }

      const id = crypto.randomUUID();
      path.id = id;

      const isHighlight = activeToolRef.current === 'highlighter';
      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: {
          fill: 'transparent',
          stroke: isHighlight ? 'rgba(234, 179, 8, 0.35)' : '#4f46e5',
          strokeWidth: isHighlight ? 18 : 3,
          opacity: 1
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        duplicateObject();
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          undoManager.redo();
        } else {
          undoManager.undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        undoManager.redo();
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
      yElements.unobserve(yElementsListener);
      yRoomName.unobserve(roomNameListener);
      undoManager.off('stack-item-added', undoManagerAdded);
      undoManager.off('stack-item-popped', undoManagerPopped);
      awareness.off('change', awarenessListener);
      fabricCanvas.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject]);

  const addShape = useCallback((type: Tool, stampEmoji?: string) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    let positionX = center.x - 50;
    let positionY = center.y - 40;

    if (snapToGridRef.current) {
      positionX = Math.round(positionX / 20) * 20;
      positionY = Math.round(positionY / 20) * 20;
    }

    const data: ElementData = {
      id,
      type: type as 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'arrow' | 'stamp',
      position: { x: positionX, y: positionY },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: type === 'stamp' ? (stampEmoji || '👍') : ((type === 'text' || type === 'sticky') ? 'Type something...' : undefined),
      style: {
        fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 1
      }
    };

    if (type !== 'select' && type !== 'pencil' && type !== 'hand' && type !== 'highlighter' && type !== 'laser') {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, stampEmoji?: string) => {
    if (tool === 'stamp') {
      if (stampEmoji) activeStampEmojiRef.current = stampEmoji;
      setActiveTool('stamp');
    } else if (tool !== 'select' && tool !== 'pencil' && tool !== 'hand' && tool !== 'highlighter' && tool !== 'laser') {
      addShape(tool);
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
        newData.style = { ...newData.style };

        if ('fill' in props) newData.style.fill = props.fill as string;
        if ('stroke' in props) newData.style.stroke = props.stroke as string;
        if ('strokeWidth' in props) newData.style.strokeWidth = props.strokeWidth;
        if ('fontFamily' in props) newData.style.fontFamily = props.fontFamily;
        if ('fontSize' in props) newData.style.fontSize = props.fontSize;
        if ('opacity' in props) newData.style.opacity = props.opacity;
        if ('content' in props) newData.content = props.content;

        if (props.zAction) {
          if (props.zAction === 'front') {
            obj.bringToFront();
            newData.zIndex = fabricRef.current?.getObjects().length;
          } else if (props.zAction === 'back') {
            obj.sendToBack();
            newData.zIndex = 0;
          }
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
    fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
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

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  const handleRoomNameChange = (name: string) => {
    if (yRoomNameRef.current) {
      yRoomNameRef.current.delete(0, yRoomNameRef.current.length);
      yRoomNameRef.current.insert(0, name);
    }
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden">
      <TopBar
        status={status}
        roomName={roomName}
        setRoomName={handleRoomNameChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={handleExport}
        users={remoteUsers}
        localUser={localUser}
        updateLocalUser={updateLocalUser}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
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
      />

      <CursorsLayer users={remoteUsers} />

      <canvas ref={canvasRef} />
    </div>
  );
};
