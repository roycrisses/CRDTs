import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { Activity } from 'lucide-react';
import { CursorsLayer } from './components/CursorsLayer';
import { ZoomControls } from './components/ZoomControls';
import { PropertyMenu } from './components/PropertyMenu';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path' | 'arrow' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string; // Also used for base64 image data
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

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);

  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;
      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const id = crypto.randomUUID();
        const newData = {
          ...data,
          id,
          position: { x: obj.left! + 20, y: obj.top! + 20 },
          zIndex: fabricRef.current!.getObjects().length
        };
        yElementsRef.current?.set(id, newData);
      }
    });
  }, []);
  const [status, setStatus] = useState('connecting');
  const [roomName, setRoomName] = useState('Main Workspace');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [vpt, setVpt] = useState<number[]>([1, 0, 0, 1, 0, 0]);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [remoteSelections, setRemoteSelections] = useState<Record<number, { id: string; rect: { left: number; top: number; width: number; height: number } }>>({});
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);

  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const snapToGridRef = useRef(false);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (fabricRef.current) {
      fabricRef.current.isDrawingMode = activeTool === 'pencil' || activeTool === 'highlighter';
      if (fabricRef.current.isDrawingMode) {
        const brush = new fabric.PencilBrush(fabricRef.current);
        brush.width = activeTool === 'highlighter' ? 20 : 3;
        brush.color = activeTool === 'highlighter' ? 'rgba(255, 255, 0, 0.4)' : '#4f46e5';
        fabricRef.current.freeDrawingBrush = brush;
      }
      fabricRef.current.selection = activeTool === 'select';
      fabricRef.current.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      // Disable object selection unless in select mode
      fabricRef.current.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || activeTool === 'pencil';
      });
      fabricRef.current.renderAll();
    }
  }, [activeTool]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;
    
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
    
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const yRoomName = ydoc.getText('roomName');
    if (yRoomName.toString() === '') {
      yRoomName.insert(0, 'Main Workspace');
    }

    yRoomName.observe(() => {
      setRoomName(yRoomName.toString());
    });

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: USER_NAME,
      color: USER_COLOR,
    });

    awareness.on('change', () => {
      const states = awareness.getStates();
      const users: { id: number; name: string; color: string; cursor?: { x: number; y: number } }[] = [];
      const selections: Record<number, { id: string; rect: { left: number; top: number; width: number; height: number } }> = {};

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
          });

          if (state.selection) {
            selections[clientID] = state.selection as { id: string; rect: { left: number; top: number; width: number; height: number } };
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
        if (data.type === 'path' && (existing as unknown as fabric.Path).path) return;

        const commonProps = {
          left: data.position.x,
          top: data.position.y,
          scaleX: data.scaleX || 1,
          scaleY: data.scaleY || 1,
        };

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rect = existing.item(0) as fabric.Rect;
          const text = existing.item(1) as unknown as fabric.IText;
          existing.set({ ...commonProps, opacity: data.style.opacity ?? 1 });
          rect.set({ fill: data.style.fill });
          text.set({
            text: data.content,
            fontSize: data.style.fontSize || 16,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif'
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
            opacity: data.style.opacity ?? 1,
          });
          if (data.type === 'text' && existing instanceof fabric.IText) {
            existing.set({
              text: data.content,
              fontSize: data.style.fontSize || 24,
              fontFamily: data.style.fontFamily || 'Inter, sans-serif'
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
            opacity: data.style.opacity ?? 1,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fontSize: data.style.fontSize || 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: data.style.opacity ?? 1,
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
            opacity: data.style.opacity ?? 1,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(data.content, (img) => {
            img.set({
              left: data.position.x,
              top: data.position.y,
              scaleX: data.scaleX || 1,
              scaleY: data.scaleY || 1,
            });
            (img as FabricObjectWithId).id = key;
            fabricCanvas.add(img);
            if (typeof data.zIndex === 'number') {
              img.moveTo(data.zIndex);
            }
            fabricCanvas.renderAll();
          }, { crossOrigin: 'anonymous' });
          return;
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

    fabricCanvas.on('selection:created', (e) => {
      const target = e.target as FabricObjectWithId;
      setSelectedObject(target || null);
      if (target?.id) {
        awareness.setLocalStateField('selection', {
          id: target.id,
          rect: target.getBoundingRect()
        });
      }
    });
    fabricCanvas.on('selection:updated', (e) => {
      const target = e.target as FabricObjectWithId;
      setSelectedObject(target || null);
      if (target?.id) {
        awareness.setLocalStateField('selection', {
          id: target.id,
          rect: target.getBoundingRect()
        });
      }
    });
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      awareness.setLocalStateField('selection', null);
    });

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', (e) => {
      if (snapToGridRef.current) {
        e.target!.set({
          left: Math.round(e.target!.left! / 20) * 20,
          top: Math.round(e.target!.top! / 20) * 20,
        });
      }
      updateYjs(e);
    });
    fabricCanvas.on('object:scaling', (e) => {
      if (snapToGridRef.current) {
        e.target!.set({
          left: Math.round(e.target!.left! / 20) * 20,
          top: Math.round(e.target!.top! / 20) * 20,
        });
      }
      updateYjs(e);
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
          opacity: isHighlighter ? 0.5 : 1
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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        duplicateObject();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      wsProvider.destroy();
      dbProvider.destroy();
      fabricCanvas.dispose();
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
      type: type as 'rectangle' | 'circle' | 'text' | 'sticky' | 'arrow' | 'image',
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: content || ((type === 'text' || type === 'sticky') ? 'Type something...' : undefined),
      style: { fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)] }
    };

    if (type !== 'select' && type !== 'pencil' && type !== 'hand' && type !== 'highlighter') {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, content?: string) => {
    if (tool !== 'select' && tool !== 'pencil' && tool !== 'hand' && tool !== 'highlighter') {
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

      if (props.zAction === 'front') obj.bringToFront();
      if (props.zAction === 'back') obj.sendToBack();

      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const newData = { ...data };
        if ('fill' in props) newData.style.fill = props.fill as string;
        if ('stroke' in props) newData.style.stroke = props.stroke as string;
        if ('strokeWidth' in props) newData.style.strokeWidth = props.strokeWidth;
        if ('content' in props) newData.content = props.content;
        if ('opacity' in props) newData.style.opacity = props.opacity;
        if ('fontSize' in props) newData.style.fontSize = props.fontSize;
        if ('fontFamily' in props) newData.style.fontFamily = props.fontFamily;

        newData.zIndex = fabricRef.current!.getObjects().indexOf(obj);
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
    const objects = fabricRef.current.getObjects();
    if (objects.length === 0) {
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoom(1);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objects.forEach(obj => {
      const rect = obj.getBoundingRect();
      minX = Math.min(minX, rect.left);
      minY = Math.min(minY, rect.top);
      maxX = Math.max(maxX, rect.left + rect.width);
      maxY = Math.max(maxY, rect.top + rect.height);
    });

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const scaleX = window.innerWidth / width;
    const scaleY = window.innerHeight / height;
    const newZoom = Math.min(scaleX, scaleY, 1);

    const vpt = fabricRef.current.viewportTransform!;
    vpt[0] = newZoom;
    vpt[3] = newZoom;
    vpt[4] = (window.innerWidth - (maxX + minX) * newZoom) / 2;
    vpt[5] = (window.innerHeight - (maxY + minY) * newZoom) / 2;

    fabricRef.current.requestRenderAll();
    setZoom(newZoom);
    setVpt([...vpt]);
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
    if (!yElementsRef.current) return;
    const ydoc = yElementsRef.current.doc;
    if (ydoc) {
      const yRoomName = ydoc.getText('roomName');
      ydoc.transact(() => {
        yRoomName.delete(0, yRoomName.length);
        yRoomName.insert(0, newName);
      });
    }
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden">
      {status === 'connecting' && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-indigo-200 shadow-2xl animate-bounce">
              <Activity className="text-white" size={32} />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h2 className="text-xl font-bold text-slate-900">Connecting to Room</h2>
              <p className="text-sm text-slate-500 font-medium">Setting up your collaborative workspace...</p>
            </div>
            <div className="flex gap-1 mt-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" />
            </div>
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
      />

      <CursorsLayer users={remoteUsers} />

      {Object.entries(remoteSelections).map(([clientId, selection]) => {
        const user = remoteUsers.find(u => u.id === parseInt(clientId));
        if (!user) return null;

        const left = selection.rect.left * vpt[0] + vpt[4];
        const top = selection.rect.top * vpt[3] + vpt[5];
        const width = selection.rect.width * vpt[0];
        const height = selection.rect.height * vpt[3];

        return (
          <div
            key={clientId}
            className="absolute pointer-events-none border-2 z-40 transition-all duration-100"
            style={{
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              borderColor: user.color,
            }}
          >
            <div
              className="absolute -top-6 left-0 px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap rounded-t-sm"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}

      <canvas ref={canvasRef} />
    </div>
  );
};
