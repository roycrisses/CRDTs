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
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number };
  path?: (string | number)[][];
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
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
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);
  const [roomName, setRoomName] = useState('Main Workspace');
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [vpt, setVpt] = useState<number[]>([1, 0, 0, 1, 0, 0]);

  const [remoteSelections, setRemoteSelections] = useState<{
    [clientId: string]: {
      id: string;
      name: string;
      color: string;
      rect: { left: number; top: number; width: number; height: number };
    };
  }>({});

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yRoomNameRef = useRef<Y.Text | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const snapToGridRef = useRef(true);

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (fabricRef.current) {
      const isDrawing = activeTool === 'pencil' || activeTool === 'highlighter';
      fabricRef.current.isDrawingMode = isDrawing;
      fabricRef.current.selection = activeTool === 'select';
      fabricRef.current.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      if (isDrawing) {
        if (activeTool === 'pencil') {
          fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
          fabricRef.current.freeDrawingBrush.color = '#4f46e5';
          fabricRef.current.freeDrawingBrush.width = 3;
        } else {
          fabricRef.current.freeDrawingBrush = new fabric.PencilBrush(fabricRef.current);
          fabricRef.current.freeDrawingBrush.color = 'rgba(234, 179, 8, 0.4)';
          fabricRef.current.freeDrawingBrush.width = 20;
        }
      }

      // Disable object selection unless in select mode
      fabricRef.current.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || isDrawing;
      });
      fabricRef.current.renderAll();
    }
  }, [activeTool]);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;
    if (yRoomName.toString() === '') {
      yRoomName.insert(0, 'Main Workspace');
    }
    const initialRoomName = yRoomName.toString();
    const roomNameTimer = setTimeout(() => {
      setRoomName(initialRoomName);
    }, 0);
    yRoomName.observe(() => {
      setRoomName(yRoomName.toString());
    });
    
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

    const dbProvider = new IndexeddbPersistence('syncboard-v3', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);
    
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: USER_NAME,
      color: USER_COLOR,
    });

    awareness.on('change', () => {
      const states = awareness.getStates();
      const users: typeof remoteUsers = [];
      const selections: typeof remoteSelections = {};

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
          });

          const selectedId = state.selection as string | undefined;
          if (selectedId && fabricCanvas) {
            const existingObj = fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === selectedId);
            if (existingObj) {
              const rect = existingObj.getBoundingRect();
              selections[clientID] = {
                id: selectedId,
                name: user.name,
                color: user.color,
                rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
              };
            }
          }
        }
      });
      setRemoteUsers(users);
      setRemoteSelections(selections);
    });

    let fabricCanvas: FabricCanvasExtended | null = null;
    if (canvasRef.current) {
      fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 'transparent',
        preserveObjectStacking: true,
      }) as FabricCanvasExtended;
      fabricRef.current = fabricCanvas;
      setVpt([...fabricCanvas.viewportTransform!]);
    }

    const findObjectById = (id: string): FabricObjectWithId | undefined => {
      if (!fabricCanvas) return undefined;
      return fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);
    };

    const upsertFabricObject = (key: string, data: ElementData) => {
      if (!fabricCanvas) return;
      const existing = findObjectById(key);
      if (existing) {
        if (data.type === 'path' && (existing as unknown as fabric.Path).path) return;

        const commonProps = {
          left: data.position.x,
          top: data.position.y,
          scaleX: data.scaleX || 1,
          scaleY: data.scaleY || 1,
          opacity: typeof data.opacity === 'number' ? data.opacity : 1,
        };

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rectObj = existing.item(0) as fabric.Rect;
          const textObj = existing.item(1) as unknown as fabric.IText;
          existing.set(commonProps);
          rectObj.set({ fill: data.style.fill });
          textObj.set({
            text: data.content,
            fontFamily: data.fontFamily || 'Inter, sans-serif',
            fontSize: data.fontSize || 16,
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
              fontFamily: data.fontFamily || 'Inter, sans-serif',
              fontSize: data.fontSize || 24,
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
            left: data.position.x,
            top: data.position.y,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
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
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.fontFamily || 'Inter, sans-serif',
            fontSize: data.fontSize || 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
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
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(data.content, (img) => {
            img.set({
              left: data.position.x,
              top: data.position.y,
              scaleX: data.scaleX || 1,
              scaleY: data.scaleY || 1,
              opacity: typeof data.opacity === 'number' ? data.opacity : 1,
            });
            (img as FabricObjectWithId).id = key;
            img.selectable = activeToolRef.current === 'select';
            fabricCanvas.add(img);
            if (typeof data.zIndex === 'number') {
              img.moveTo(data.zIndex);
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
        }
      }
    };

    yElements.observe((event) => {
      if (!fabricCanvas) return;
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

    const snapToGridVal = (val: number, gridSize = 20) => {
      return Math.round(val / gridSize) * gridSize;
    };

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
          opacity: obj.opacity,
        });
      }
    };

    if (fabricCanvas) {
      fabricCanvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let zoomVal = fabricCanvas!.getZoom();
        zoomVal *= 0.999 ** delta;
        if (zoomVal > 20) zoomVal = 20;
        if (zoomVal < 0.05) zoomVal = 0.05;
        fabricCanvas!.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoomVal);
        setZoom(zoomVal);
        setVpt([...fabricCanvas!.viewportTransform!]);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      });

      fabricCanvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        if (evt.altKey === true || activeToolRef.current === 'hand' || (activeToolRef.current === 'select' && !fabricCanvas!.getActiveObject())) {
          fabricCanvas!.isDragging = true;
          fabricCanvas!.selection = false;
          fabricCanvas!.lastPosX = evt.clientX;
          fabricCanvas!.lastPosY = evt.clientY;
        }
      });

      fabricCanvas.on('mouse:move', (opt) => {
        const e = opt.e;

        // Update local cursor in canvas-space
        const pointer = fabricCanvas!.getPointer(e);
        awareness.setLocalStateField('cursor', {
          x: pointer.x,
          y: pointer.y,
        });

        if (fabricCanvas!.isDragging) {
          const vptArr = fabricCanvas!.viewportTransform!;
          vptArr[4] += e.clientX - fabricCanvas!.lastPosX!;
          vptArr[5] += e.clientY - fabricCanvas!.lastPosY!;
          fabricCanvas!.requestRenderAll();
          setVpt([...vptArr]);
          fabricCanvas!.lastPosX = e.clientX;
          fabricCanvas!.lastPosY = e.clientY;
        }
      });

      fabricCanvas.on('mouse:up', () => {
        fabricCanvas!.setViewportTransform(fabricCanvas!.viewportTransform!);
        fabricCanvas!.isDragging = false;
        fabricCanvas!.selection = activeToolRef.current === 'select';
      });

      fabricCanvas.on('selection:created', (e) => {
        const target = e.target || null;
        setSelectedObject(target);
        if (target && (target as FabricObjectWithId).id) {
          awareness.setLocalStateField('selection', (target as FabricObjectWithId).id);
        }
      });
      fabricCanvas.on('selection:updated', (e) => {
        const target = e.target || null;
        setSelectedObject(target);
        if (target && (target as FabricObjectWithId).id) {
          awareness.setLocalStateField('selection', (target as FabricObjectWithId).id);
        }
      });
      fabricCanvas.on('selection:cleared', () => {
        setSelectedObject(null);
        awareness.setLocalStateField('selection', null);
      });

      fabricCanvas.on('object:modified', updateYjs);

      fabricCanvas.on('object:moving', (options) => {
        if (snapToGridRef.current && options.target) {
          options.target.set({
            left: snapToGridVal(options.target.left || 0),
            top: snapToGridVal(options.target.top || 0)
          });
        }
        updateYjs(options);
      });

      fabricCanvas.on('object:scaling', (options) => {
        if (snapToGridRef.current && options.target) {
          const target = options.target;
          if (target.left !== undefined && target.top !== undefined) {
            target.set({
              left: snapToGridVal(target.left),
              top: snapToGridVal(target.top),
            });
          }
        }
        updateYjs(options);
      });

      fabricCanvas.on('after:render', () => {
        // Re-calculate the actual screen position of remote selections
        const latestStates = awareness.getStates();
        const selections: typeof remoteSelections = {};
        latestStates.forEach((state: Record<string, unknown>, clientID) => {
          const user = state.user as { name: string; color: string } | undefined;
          const selectedId = state.selection as string | undefined;
          if (clientID !== ydoc.clientID && user && selectedId) {
            const existingObj = fabricCanvas!.getObjects().find((obj: FabricObjectWithId) => obj.id === selectedId);
            if (existingObj) {
              const rect = existingObj.getBoundingRect();
              selections[clientID] = {
                id: selectedId,
                name: user.name,
                color: user.color,
                rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
              };
            }
          }
        });
        setRemoteSelections(selections);
      });

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

        const strokeColor = activeToolRef.current === 'highlighter' ? 'rgba(234, 179, 8, 0.4)' : '#4f46e5';
        const strokeWidth = activeToolRef.current === 'highlighter' ? 20 : 3;

        const data: ElementData = {
          id,
          type: 'path',
          position: { x: path.left || 0, y: path.top || 0 },
          size: { width: path.width || 0, height: path.height || 0 },
          style: { fill: 'transparent', stroke: strokeColor, strokeWidth: strokeWidth },
          path: path.path as unknown as (string | number)[][]
        };

        yElementsRef.current?.set(id, data);
      });
    }

    const handleResize = () => {
      if (fabricCanvas) {
        fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
        fabricCanvas.renderAll();
      }
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
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (fabricCanvas) {
          const activeObjects = fabricCanvas.getActiveObjects();
          if (activeObjects.length > 0) {
            activeObjects.forEach((obj: FabricObjectWithId) => {
              if (obj.id) yElements.delete(obj.id);
            });
            fabricCanvas.discardActiveObject();
            fabricCanvas.renderAll();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (fabricCanvas) {
          const activeObject = fabricCanvas.getActiveObject() as FabricObjectWithId;
          if (activeObject && activeObject.id && yElementsRef.current) {
            const originalData = yElementsRef.current.get(activeObject.id);
            if (originalData) {
              const newId = crypto.randomUUID();
              const clonedData: ElementData = {
                ...originalData,
                id: newId,
                position: {
                  x: originalData.position.x + 30,
                  y: originalData.position.y + 30,
                },
                zIndex: fabricCanvas.getObjects().indexOf(activeObject) + 1,
              };
              yElementsRef.current.set(newId, clonedData);
              setTimeout(() => {
                const newObj = fabricCanvas!.getObjects().find((obj: FabricObjectWithId) => obj.id === newId);
                if (newObj) {
                  fabricCanvas!.setActiveObject(newObj);
                  fabricCanvas!.renderAll();
                }
              }, 50);
            }
          }
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
      clearTimeout(roomNameTimer);
      wsProvider.destroy();
      dbProvider.destroy();
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
      fabricRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const addShape = useCallback((type: Tool, content?: string) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    const data: ElementData = {
      id,
      type: type === 'image' ? 'image' : (type as 'rectangle' | 'circle' | 'text' | 'sticky' | 'arrow'),
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: content || ((type === 'text' || type === 'sticky') ? 'Type something...' : undefined),
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
        if ('fontFamily' in props) newData.fontFamily = props.fontFamily as string;
        if ('fontSize' in props) newData.fontSize = props.fontSize as number;

        if (props.zAction === 'front') {
          obj.bringToFront();
          newData.zIndex = fabricRef.current!.getObjects().indexOf(obj);
        } else if (props.zAction === 'back') {
          obj.sendToBack();
          newData.zIndex = fabricRef.current!.getObjects().indexOf(obj);
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
    setVpt([...fabricRef.current.viewportTransform!]);
  };

  const handleFitToScreen = () => {
    if (!fabricRef.current) return;
    const objects = fabricRef.current.getObjects();
    if (objects.length === 0) {
      handleResetZoom();
      return;
    }

    // Calculate bounding box of all objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
      const rect = obj.getBoundingRect(true);
      if (rect.left < minX) minX = rect.left;
      if (rect.top < minY) minY = rect.top;
      if (rect.left + rect.width > maxX) maxX = rect.left + rect.width;
      if (rect.top + rect.height > maxY) maxY = rect.top + rect.height;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const padding = 60;

    const scaleX = (window.innerWidth - padding * 2) / width;
    const scaleY = (window.innerHeight - padding * 2) / height;
    const newZoom = Math.min(scaleX, scaleY, 4); // Cap at 4x zoom max

    const vptArr = fabricRef.current.viewportTransform!;
    vptArr[0] = newZoom;
    vptArr[3] = newZoom;
    vptArr[4] = window.innerWidth / 2 - (minX + width / 2) * newZoom;
    vptArr[5] = window.innerHeight / 2 - (minY + height / 2) * newZoom;

    fabricRef.current.setViewportTransform(vptArr);
    setZoom(newZoom);
    setVpt([...vptArr]);
    fabricRef.current.requestRenderAll();
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

  const handleRoomNameChange = (newName: string) => {
    if (yRoomNameRef.current) {
      yRoomNameRef.current.delete(0, yRoomNameRef.current.length);
      yRoomNameRef.current.insert(0, newName);
    }
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden bg-slate-50">
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
        onFit={handleFitToScreen}
      />

      <PropertyMenu
        selectedObject={selectedObject}
        onUpdate={updateProperty}
      />

      {/* Collaborative Selection Overlays */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {Object.entries(remoteSelections).map(([clientId, sel]) => {
          if (!sel.rect) return null;
          return (
            <div
              key={clientId}
              className="absolute border-2 border-dashed rounded transition-all duration-75"
              style={{
                left: sel.rect.left,
                top: sel.rect.top,
                width: sel.rect.width,
                height: sel.rect.height,
                borderColor: sel.color,
              }}
            >
              <div
                className="absolute -top-6 left-0 px-2 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap shadow"
                style={{ backgroundColor: sel.color }}
              >
                {sel.name}
              </div>
            </div>
          );
        })}
      </div>

      <CursorsLayer users={remoteUsers} vpt={vpt} />

      <canvas ref={canvasRef} />
    </div>
  );
};
