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
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number };
  path?: (string | number)[][];
};

interface FabricObjectWithId extends fabric.Object {
  id?: string;
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
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);
  const [selectedObject, setSelectedObject] = useState<{ id: string; type: string; color: string; menuPosition: { x: number; y: number } } | null>(null);

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

      const cursors: Record<Tool, string> = {
        select: 'default',
        hand: 'grab',
        pencil: 'crosshair',
        arrow: 'crosshair',
        rectangle: 'crosshair',
        circle: 'crosshair',
        text: 'text',
        sticky: 'copy'
      };
      fabricRef.current.defaultCursor = cursors[activeTool] || 'default';

      // Disable object selection unless in select mode
      fabricRef.current.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || activeTool === 'pencil' || activeTool === 'hand';
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
      const offset = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = offset[4] % (grid * zoom); i < fabricCanvas.width!; i += grid * zoom) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, fabricCanvas.height!);
      }
      for (let i = offset[5] % (grid * zoom); i < fabricCanvas.height!; i += grid * zoom) {
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
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          const line = existing.item(0) as unknown as fabric.Line;
          const triangle = existing.item(1) as unknown as fabric.Triangle;
          existing.set({ left: data.position.x, top: data.position.y });
          line.set({ stroke: data.style.fill });
          triangle.set({ fill: data.style.fill });
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
          const line = new fabric.Line([0, 0, 100, 0], {
            stroke: data.style.fill,
            strokeWidth: 4,
            originX: 'center',
            originY: 'center'
          });
          const triangle = new fabric.Triangle({
            width: 15,
            height: 15,
            fill: data.style.fill,
            left: 50,
            top: 0,
            angle: 90,
            originX: 'center',
            originY: 'center'
          });
          obj = new fabric.Group([line, triangle], {
            left: data.position.x,
            top: data.position.y,
          });
        }

        if (obj) {
          (obj as FabricObjectWithId).id = key;
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
      if (evt.altKey === true || activeToolRef.current === 'hand' || activeToolRef.current === 'select') {
        if (!fabricCanvas.getActiveObject()) {
          // @ts-expect-error: custom property on canvas
          fabricCanvas.isDragging = true;
          fabricCanvas.selection = false;
          if (activeToolRef.current === 'hand') fabricCanvas.defaultCursor = 'grabbing';
          // @ts-expect-error: custom property on canvas
          fabricCanvas.lastPosX = evt.clientX;
          // @ts-expect-error: custom property on canvas
          fabricCanvas.lastPosY = evt.clientY;
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
      if (activeToolRef.current === 'hand') fabricCanvas.defaultCursor = 'grab';
    });

    fabricCanvas.on('object:modified', (e) => {
      updateYjs(e);
      if (e.target) {
        const obj = e.target as FabricObjectWithId;
        const rect = obj.getBoundingRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          setSelectedObject(prev => prev ? {
            ...prev,
            menuPosition: {
              x: canvasRect.left + rect.left + rect.width / 2,
              y: canvasRect.top + rect.top
            }
          } : null);
        }
      }
    });

    const updateSelection = () => {
      const active = fabricCanvas.getActiveObject() as FabricObjectWithId;
      if (active && active.id) {
        const rect = active.getBoundingRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const data = yElements.get(active.id);
          setSelectedObject({
            id: active.id,
            type: data?.type || 'object',
            color: (active.fill as string) || (active.stroke as string) || '#000000',
            menuPosition: {
              x: canvasRect.left + rect.left + rect.width / 2,
              y: canvasRect.top + rect.top
            }
          });
        }
      } else {
        setSelectedObject(null);
      }
    };

    fabricCanvas.on('selection:created', updateSelection);
    fabricCanvas.on('selection:updated', updateSelection);
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    fabricCanvas.on('path:created', (e: fabric.IEvent) => {
      const path = (e as unknown as { path: fabric.Path & { id?: string } }).path;
      const id = crypto.randomUUID();
      path.id = id;

      const data: ElementData = {
        id,
        type: 'path',
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
    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    const data: ElementData = {
      id,
      type: type as 'rectangle' | 'circle' | 'text' | 'sticky' | 'arrow',
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: (type === 'text' || type === 'sticky') ? 'Type something...' : undefined,
      style: { fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)] }
    };

    if (type !== 'select' && type !== 'pencil') {
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

  const clearBoard = () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
      yElementsRef.current?.clear();
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  const handleExport = () => {
    if (!fabricRef.current) return;

    // Deselect before exporting
    fabricRef.current.discardActiveObject().renderAll();

    const dataURL = fabricRef.current.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // High resolution
    });

    const link = document.createElement('a');
    link.download = `syncboard-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const handleZoomIn = () => {
    if (!fabricRef.current) return;
    const newZoom = Math.min(fabricRef.current.getZoom() * 1.1, 20);
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = Math.max(fabricRef.current.getZoom() / 1.1, 0.01);
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomReset = () => {
    if (!fabricRef.current) return;
    fabricRef.current.setZoom(1);
    fabricRef.current.absolutePan({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleColorChange = (color: string) => {
    if (!selectedObject || !yElementsRef.current || !fabricRef.current) return;
    const data = yElementsRef.current.get(selectedObject.id);
    if (data) {
      yElementsRef.current.set(selectedObject.id, {
        ...data,
        style: { ...data.style, fill: color }
      });
      setSelectedObject({ ...selectedObject, color });
    }
  };

  const handleDelete = () => {
    if (!selectedObject || !yElementsRef.current) return;
    yElementsRef.current.delete(selectedObject.id);
    fabricRef.current?.discardActiveObject().renderAll();
    setSelectedObject(null);
  };

  const handleDuplicate = () => {
    if (!selectedObject || !yElementsRef.current) return;
    const data = yElementsRef.current.get(selectedObject.id);
    if (data) {
      const id = crypto.randomUUID();
      yElementsRef.current.set(id, {
        ...data,
        id,
        position: { x: data.position.x + 20, y: data.position.y + 20 }
      });
    }
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
        onExport={handleExport}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleToolChange}
        onClear={clearBoard}
      />

      <CursorsLayer users={remoteUsers} />

      {selectedObject && (
        <PropertyMenu
          position={selectedObject.menuPosition}
          color={selectedObject.color}
          onColorChange={handleColorChange}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          type={selectedObject.type}
        />
      )}

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
