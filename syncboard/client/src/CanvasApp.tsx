import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Toolbar } from './Toolbar';
import type { Tool } from './Toolbar';
import { StatusBar } from './StatusBar';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string };
  pathData?: string;
};

interface FabricObjectWithId extends fabric.Object {
  id?: string;
  scaleX: number;
  scaleY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  radius?: number;
  text?: string;
  path?: fabric.Path;
}

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('connecting');
  const [userCount, setUserCount] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>('select');

  const fabricRef = useRef<fabric.Canvas | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yUndoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;
    
    yUndoManagerRef.current = new Y.UndoManager(yElements);

    // Offline persistence
    const dbProvider = new IndexeddbPersistence('syncboard-db', ydoc);
    
    // Remote sync
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-room', ydoc);
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    // Awareness (Multiplayer Cursors)
    wsProvider.awareness.on('change', () => {
      setUserCount(wsProvider.awareness.getStates().size);
    });

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#ffffff',
      selection: true
    });
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string) => 
      fabricCanvas.getObjects().find((obj: fabric.Object) => (obj as FabricObjectWithId).id === id) as FabricObjectWithId | undefined;

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key);
      if (existing) {
        existing.set({
          left: data.position.x,
          top: data.position.y,
          width: data.size.width / (existing.scaleX || 1),
          height: data.size.height / (existing.scaleY || 1),
          radius: data.size.radius, 
          text: data.content,
          fill: data.style.fill
        });
        existing.setCoords();
      } else {
        let obj;
        if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill, rx: 4, ry: 4
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill
          });
        } else if (data.type === 'text' || data.type === 'sticky') {
          const isSticky = data.type === 'sticky';
          obj = new fabric.IText(data.content || (isSticky ? 'Note' : 'Text'), {
            left: data.position.x, top: data.position.y,
            fill: isSticky ? '#000000' : data.style.fill,
            backgroundColor: isSticky ? data.style.fill : undefined,
            fontFamily: 'Inter, sans-serif',
            fontSize: isSticky ? 18 : 24,
            padding: isSticky ? 20 : 5,
            textAlign: 'center'
          });
          if (isSticky) {
             (obj as fabric.Object).set({ width: 150, height: 150 });
          }
        } else if (data.type === 'path' && data.pathData) {
          obj = new fabric.Path(data.pathData, {
            left: data.position.x, top: data.position.y,
            stroke: data.style.fill,
            strokeWidth: 3,
            fill: 'transparent'
          });
        }

        if (obj) {
          (obj as FabricObjectWithId).id = key;
          fabricCanvas.add(obj);
        }
      }
    };

    const loadAll = () => {
      isUpdatingRef.current = true;
      yElements.forEach((data, key) => upsertFabricObject(key, data));
      fabricCanvas.renderAll();
      isUpdatingRef.current = false;
    };
    
    loadAll();
    dbProvider.on('synced', loadAll);

    // Sync Yjs -> Fabric
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

    // Sync Fabric -> Yjs
    const updateYjs = (e: fabric.IEvent) => {
      if (isUpdatingRef.current || !yElementsRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: obj.left || 0, y: obj.top || 0 },
          size: { 
            width: (obj.width || 0) * (obj.scaleX || 1),
            height: (obj.height || 0) * (obj.scaleY || 1),
            radius: obj.radius ? obj.radius * Math.max(obj.scaleX || 1, obj.scaleY || 1) : undefined
          },
          content: obj.text || data.content
        });
      }
    };

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', updateYjs);
    fabricCanvas.on('object:scaling', updateYjs);
    fabricCanvas.on('text:changed', updateYjs);

    fabricCanvas.on('path:created', (e: any) => {
      if (isUpdatingRef.current || !yElementsRef.current) return;
      const path = e.path as fabric.Path;
      const id = crypto.randomUUID();
      const data: ElementData = {
        id, type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: { fill: path.stroke || '#000000' },
        pathData: (path as any).path.map((segment: any) => segment.join(' ')).join(' ')
      };
      (path as FabricObjectWithId).id = id;
      yElementsRef.current.set(id, data);
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && fabricCanvas.getActiveObject()) {
        const activeObjects = fabricCanvas.getActiveObjects();
        activeObjects.forEach(obj => {
          const id = (obj as FabricObjectWithId).id;
          if (id) yElementsRef.current?.delete(id);
        });
        fabricCanvas.discardActiveObject().renderAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    });

    return () => {
      wsProvider.destroy();
      dbProvider.destroy();
      fabricCanvas.dispose();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool);
    if (!fabricRef.current) return;

    fabricRef.current.isDrawingMode = tool === 'pencil';
    fabricRef.current.selection = tool === 'select';

    if (tool !== 'select' && tool !== 'pencil') {
      addShape(tool as 'rectangle' | 'circle' | 'text' | 'sticky');
      setActiveTool('select');
    }
  };

  const addShape = (type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path') => {
    if (!yElementsRef.current) return;
    const id = crypto.randomUUID();
    const colors = type === 'sticky'
      ? ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2']
      : ['#1D4ED8', '#B91C1C', '#047857', '#B45309', '#4C1D95', '#111827'];

    const color = colors[Math.floor(Math.random() * colors.length)];

    const data: ElementData = {
      id, type,
      position: { x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 50 },
      size: type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 100 },
      content: type === 'text' || type === 'sticky' ? 'Type...' : undefined,
      style: { fill: color }
    };
    yElementsRef.current.set(id, data);
  };

  const deleteSelected = () => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    activeObjects.forEach(obj => {
      const id = (obj as FabricObjectWithId).id;
      if (id) yElementsRef.current!.delete(id);
    });
    fabricRef.current.discardActiveObject().renderAll();
  };

  const clearBoard = () => {
    if (!yElementsRef.current) return;
    yElementsRef.current.clear();
  };

  return (
    <div className="canvas-container">
      <Toolbar
        activeTool={activeTool}
        onToolSelect={handleToolSelect}
        onDelete={deleteSelected}
        onUndo={() => yUndoManagerRef.current?.undo()}
        onRedo={() => yUndoManagerRef.current?.redo()}
        onClear={clearBoard}
      />
      <StatusBar status={status} userCount={userCount} />
      <canvas ref={canvasRef} />
    </div>
  );
};
