import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { CursorsLayer } from './components/CursorsLayer';
import { PropertyMenu } from './components/PropertyMenu';
import { ZoomControls } from './components/ZoomControls';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path' | 'arrow';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  points?: number[];
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number };
  path?: (string | number)[][];
};

interface FabricObjectWithId extends fabric.Object {
  id?: string;
  subType?: 'sticky' | 'arrow';
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
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [zoom, setZoom] = useState(1);

  const fabricRef = useRef<fabric.Canvas | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (fabricRef.current) {
      fabricRef.current.isDrawingMode = activeTool === 'pencil';
      fabricRef.current.selection = activeTool === 'select';

      if (activeTool === 'hand') {
        fabricRef.current.defaultCursor = 'grab';
      } else if (activeTool === 'select') {
        fabricRef.current.defaultCursor = 'default';
      } else {
        fabricRef.current.defaultCursor = 'crosshair';
      }

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

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: USER_NAME,
      color: USER_COLOR,
    });

    awareness.on('change', () => {
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
    });

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f8fafc',
      preserveObjectStacking: true,
    });
    fabricRef.current = fabricCanvas;

    // Grid pattern
    const grid = 40;
    fabricCanvas.on('after:render', () => {
      const ctx = fabricCanvas.getContext();
      ctx.save();
      const zoom = fabricCanvas.getZoom();
      const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];

      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = vpt[4] % (grid * zoom); i < fabricCanvas.width!; i += grid * zoom) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, fabricCanvas.height!);
      }
      for (let i = vpt[5] % (grid * zoom); i < fabricCanvas.height!; i += grid * zoom) {
        ctx.moveTo(0, i);
        ctx.lineTo(fabricCanvas.width!, i);
      }
      ctx.stroke();
      ctx.restore();
    });

    const findObjectById = (id: string): FabricObjectWithId | undefined =>
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key);
      if (existing) {
        if (data.type === 'path' && (existing as unknown as fabric.Path).path) return;

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rect = existing.item(0) as fabric.Rect;
          const text = existing.item(1) as unknown as fabric.IText;
          existing.set({ left: data.position.x, top: data.position.y });
          rect.set({ fill: data.style.fill });
          text.set({ text: data.content });
        } else {
          existing.set({
            left: data.position.x,
            top: data.position.y,
            width: data.size.width / (existing.scaleX || 1),
            height: data.size.height / (existing.scaleY || 1),
            fill: data.style.fill,
            stroke: data.style.stroke,
            strokeWidth: data.style.strokeWidth,
          });
          if (data.type === 'text' && existing instanceof fabric.IText) {
            existing.set({ text: data.content });
          }
        }
        existing.setCoords();
      } else {
        let obj: fabric.Object | undefined;
        if (data.type === 'sticky') {
          const rect = new fabric.Rect({
            width: 150,
            height: 150,
            fill: data.style.fill,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.05)', blur: 15, offsetX: 5, offsetY: 5 }),
            rx: 4, ry: 4
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
            fill: '#1e293b',
            // @ts-expect-error: splitByGrapheme is missing in types but present in fabric
            splitByGrapheme: true
          });
          obj = new fabric.Group([rect, text], {
            left: data.position.x,
            top: data.position.y,
          });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: 'Inter, sans-serif',
            fontSize: 24
          });
        } else if (data.type === 'path' && data.path) {
          obj = new fabric.Path(data.path as unknown as string, {
            left: data.position.x,
            top: data.position.y,
            fill: 'transparent',
            stroke: data.style.stroke,
            strokeWidth: data.style.strokeWidth,
            strokeLineCap: 'round',
            strokeLineJoin: 'round'
          });
        } else if (data.type === 'arrow') {
          const points = data.points || [0, 0, 100, 0];
          const line = new fabric.Line(points, {
            stroke: data.style.fill,
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
          });
          const head = new fabric.Triangle({
            width: 10,
            height: 10,
            fill: data.style.fill,
            left: points[2],
            top: points[3],
            angle: 90,
            originX: 'center',
            originY: 'center',
          });
          obj = new fabric.Group([line, head], {
            left: data.position.x,
            top: data.position.y,
          });
          (obj as FabricObjectWithId).subType = 'arrow';
        }

        if (obj) {
          (obj as FabricObjectWithId).id = key;
          if (data.type === 'sticky') (obj as FabricObjectWithId).subType = 'sticky';
          obj.selectable = activeToolRef.current === 'select';
          fabricCanvas.add(obj);
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
      if (isUpdatingRef.current || !yElementsRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: obj.left!, y: obj.top! },
          size: { 
            width: obj.width! * obj.scaleX!,
            height: obj.height! * obj.scaleY!,
            // @ts-expect-error: radius is present on Circle
            radius: obj.radius ? obj.radius * Math.max(obj.scaleX!, obj.scaleY!) : undefined
          },
          // @ts-expect-error: text is present on IText
          content: obj.text || data.content
        });
      }
    };

    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let newZoom = fabricCanvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.01) newZoom = 0.01;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      if (evt.altKey === true || activeToolRef.current === 'hand' || (activeToolRef.current === 'select' && !fabricCanvas.getActiveObject())) {
        // @ts-expect-error: custom property on canvas
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        // @ts-expect-error: custom property on canvas
        fabricCanvas.lastPosX = evt.clientX;
        // @ts-expect-error: custom property on canvas
        fabricCanvas.lastPosY = evt.clientY;
        if (activeToolRef.current === 'hand') {
          fabricCanvas.defaultCursor = 'grabbing';
          fabricCanvas.renderAll();
        }
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;

      // Update local cursor for awareness
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      // @ts-expect-error: custom property on canvas
      if (fabricCanvas.isDragging) {
        const vpt = fabricCanvas.viewportTransform!;
        // @ts-expect-error: custom property on canvas
        vpt[4] += e.clientX - fabricCanvas.lastPosX;
        // @ts-expect-error: custom property on canvas
        vpt[5] += e.clientY - fabricCanvas.lastPosY;
        fabricCanvas.requestRenderAll();
        // @ts-expect-error: custom property on canvas
        fabricCanvas.lastPosX = e.clientX;
        // @ts-expect-error: custom property on canvas
        fabricCanvas.lastPosY = e.clientY;
      }
    });

    fabricCanvas.on('mouse:up', () => {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform!);
      // @ts-expect-error: custom property on canvas
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
      if (activeToolRef.current === 'hand') {
        fabricCanvas.defaultCursor = 'grab';
        fabricCanvas.renderAll();
      }
    });

    fabricCanvas.on('object:modified', updateYjs);

    fabricCanvas.on('selection:created', (e) => {
      if (e.target) {
        const rect = e.target.getBoundingRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          setMenuPosition({
            top: canvasRect.top + rect.top,
            left: canvasRect.left + rect.left + rect.width / 2
          });
        }
        setSelectedObject(e.target);
      }
    });

    fabricCanvas.on('selection:updated', (e) => {
      if (e.target) {
        const rect = e.target.getBoundingRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          setMenuPosition({
            top: canvasRect.top + rect.top,
            left: canvasRect.left + rect.left + rect.width / 2
          });
        }
        setSelectedObject(e.target);
      }
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    fabricCanvas.on('object:moving', (e) => {
      if (e.target) {
        const rect = e.target.getBoundingRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          setMenuPosition({
            top: canvasRect.top + rect.top,
            left: canvasRect.left + rect.left + rect.width / 2
          });
        }
      }
    });

    fabricCanvas.on('path:created', (e: fabric.IEvent) => {
      const path = (e as unknown as { path: fabric.Path & { id?: string } }).path;
      const id = crypto.randomUUID();
      path.id = id;

      const data: ElementData = {
        id,
        type: 'path' as const,
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: { fill: 'transparent', stroke: '#4f46e5', strokeWidth: 3 },
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
      fabricCanvas.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const addShape = useCallback((type: Tool) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fef9c3', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2', '#ffedd5'];

    const data: ElementData = {
      id,
      type: type as 'rectangle' | 'circle' | 'text' | 'sticky' | 'arrow',
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: (type === 'text' || type === 'sticky') ? 'Type something...' : undefined,
      style: {
        fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)],
        strokeWidth: ((type as string) === 'path' || type === 'arrow') ? 3 : 0
      },
      points: type === 'arrow' ? [0, 0, 100, 0] : undefined
    };

    if (type !== 'select' && type !== 'pencil' && type !== 'hand') {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool) => {
    if (tool !== 'select' && tool !== 'pencil' && tool !== 'hand') {
      addShape(tool);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  const handleStyleChange = (style: { fill?: string; stroke?: string; strokeWidth?: number }) => {
    if (!selectedObject || !yElementsRef.current) return;

    const obj = selectedObject as FabricObjectWithId;
    if (!obj.id) return;

    const data = yElementsRef.current.get(obj.id);
    if (data) {
      const newData = {
        ...data,
        style: {
          ...data.style,
          fill: style.fill || data.style.fill,
          stroke: style.stroke || data.style.stroke || (style.fill ? style.fill : data.style.stroke),
          strokeWidth: style.strokeWidth ?? data.style.strokeWidth
        }
      };
      yElementsRef.current.set(obj.id, newData);

      // Update fabric object locally for immediate feedback
      const dataType = data.type as string;
      const subType = obj.subType;

      if (subType === 'sticky' && obj instanceof fabric.Group) {
        const rect = obj.item(0) as fabric.Rect;
        if (style.fill) rect.set({ fill: style.fill });
      } else if (subType === 'arrow' && obj instanceof fabric.Group) {
        if (style.fill) {
          obj.getObjects().forEach((child) => {
            if (child instanceof fabric.Line) child.set({ stroke: style.fill });
            else child.set({ fill: style.fill });
          });
        }
        if (style.strokeWidth !== undefined) {
          const line = obj.item(0) as unknown as fabric.Line;
          line.set({ strokeWidth: style.strokeWidth });
        }
      } else {
        if (style.fill) {
          obj.set({ fill: style.fill });
          if (dataType === 'path' || dataType === 'arrow') {
            obj.set({ stroke: style.fill });
          }
        }
        if (style.strokeWidth !== undefined) obj.set({ strokeWidth: style.strokeWidth });
      }
      fabricRef.current?.renderAll();
    }
  };

  const clearBoard = () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
      yElementsRef.current?.clear();
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  const handleZoomIn = () => {
    if (!fabricRef.current) return;
    const newZoom = Math.min(fabricRef.current.getZoom() * 1.2, 20);
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = Math.max(fabricRef.current.getZoom() / 1.2, 0.01);
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomReset = () => {
    if (!fabricRef.current) return;
    fabricRef.current.setZoom(1);
    fabricRef.current.absolutePan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden">
      <TopBar
        status={status}
        roomName="Main Workspace"
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleToolChange}
        onClear={clearBoard}
      />

      <CursorsLayer users={remoteUsers} />

      <PropertyMenu
        activeObject={selectedObject}
        onStyleChange={handleStyleChange}
        position={menuPosition}
      />

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />

      <canvas ref={canvasRef} />
    </div>
  );
};
