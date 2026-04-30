import { useEffect, useRef, useState, useMemo } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Toolbar } from './components/Toolbar';
import type { Tool } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { CursorsLayer } from './components/CursorsLayer';

export type ElementData = {
  id: string;
  type: string;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  path?: (string | number)[][];
  objects?: any[];
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  rx?: number;
  ry?: number;
};

interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

const USER_NAMES = ['Astro', 'Cosmo', 'Nova', 'Quasar', 'Stellar', 'Orion', 'Luna', 'Sol'];
const USER_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const INITIAL_USER = {
  name: USER_NAMES[Math.floor(Math.random() * USER_NAMES.length)],
  color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
};

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [userCount, setUserCount] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [awarenessStates, setAwarenessStates] = useState<[number, any][]>([]);
  const [selfId, setSelfId] = useState<number>(0);

  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');

  const userInfo = useMemo(() => INITIAL_USER, []);

  useEffect(() => {
    activeToolRef.current = activeTool;
    const fabricCanvas = fabricRef.current;
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = activeTool === 'pencil';
      fabricCanvas.selection = activeTool === 'select';
      fabricCanvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';

      fabricCanvas.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select';
      });
      fabricCanvas.renderAll();
    }
  }, [activeTool]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;
    
    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    const updateUndoRedoStatus = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };

    undoManager.on('stack-item-added', updateUndoRedoStatus);
    undoManager.on('stack-item-popped', updateUndoRedoStatus);

    const dbProvider = new IndexeddbPersistence('syncboard-v2', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-room-v2', ydoc);
    
    // Using a microtask to avoid "setState during render" lint error
    queueMicrotask(() => {
      setSelfId(ydoc.clientID);
    });

    wsProvider.awareness.setLocalStateField('user', userInfo);

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const updateAwareness = () => {
      const states = Array.from(wsProvider.awareness.getStates().entries());
      setAwarenessStates(states);
      setUserCount(states.length);
    };

    wsProvider.awareness.on('change', updateAwareness);

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f8f9fa',
      preserveObjectStacking: true,
    });
    fabricRef.current = fabricCanvas;

    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.width = 3;
    fabricCanvas.freeDrawingBrush.color = userInfo.color;

    const findObjectById = (id: string) => 
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const createFabricObject = (data: ElementData, id: string) => {
      let obj: fabric.Object | undefined;
      const { type, ...options } = data;

      switch (type) {
        case 'rect':
          obj = new fabric.Rect(options);
          break;
        case 'circle':
          obj = new fabric.Circle(options);
          break;
        case 'i-text':
          obj = new fabric.IText(data.text || '', options as fabric.ITextOptions);
          break;
        case 'path':
          obj = new fabric.Path(data.path as any, options as fabric.IPathOptions);
          break;
        case 'group': {
          const rect = new fabric.Rect({
            width: data.width,
            height: data.height,
            fill: data.fill,
            rx: 4, ry: 4,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
          });
          const text = new fabric.IText(data.text || '', {
            fontSize: 20,
            originX: 'center',
            originY: 'center',
            left: (data.width || 0) / 2,
            top: (data.height || 0) / 2,
            textAlign: 'center',
            width: (data.width || 0) - 20,
          } as any);
          obj = new fabric.Group([rect, text], options);
          break;
        }
      }

      if (obj) {
        (obj as FabricObjectWithId).id = id;
        obj.selectable = activeToolRef.current === 'select';
        obj.evented = activeToolRef.current === 'select';
        fabricCanvas.add(obj);
      }
      return obj;
    };

    const updateFabricObject = (obj: fabric.Object, data: ElementData) => {
      isUpdatingRef.current = true;
      const { id: _id, type, ...props } = data;
      console.log('Updating object', _id);

      if (type === 'group' && obj instanceof fabric.Group) {
        const textObj = obj.getObjects('i-text')[0] as fabric.IText;
        if (textObj && data.text !== undefined) {
          textObj.set('text', data.text);
        }
      }

      obj.set(props);
      obj.setCoords();
      fabricCanvas.renderAll();
      isUpdatingRef.current = false;
    };

    yElements.observe((event) => {
      if (isUpdatingRef.current) return;
      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const data = yElements.get(key);
          if (!data) return;
          const existing = findObjectById(key);
          if (existing) updateFabricObject(existing, data);
          else createFabricObject(data, key);
        } else if (change.action === 'delete') {
          const existing = findObjectById(key);
          if (existing) fabricCanvas.remove(existing);
        }
      });
      fabricCanvas.renderAll();
    });

    fabricCanvas.on('object:modified', (e) => {
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id || isUpdatingRef.current) return;
      const data = obj.toObject(['id', 'selectable', 'evented']);
      if (obj instanceof fabric.Group) {
        const textObj = obj.getObjects('i-text')[0] as fabric.IText;
        data.text = textObj.text;
      }
      yElements.set(obj.id, { ...data, type: obj.type || '' });
    });

    fabricCanvas.on('path:created', (e: any) => {
      const path = e.path as FabricObjectWithId;
      const id = crypto.randomUUID();
      path.id = id;
      const data = path.toObject(['id']);
      yElements.set(id, { ...data, type: 'path' });
    });

    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (options) => {
      const canvas = fabricCanvas as any;
      if (options.e.altKey || (activeToolRef.current === 'select' && !options.target)) {
        canvas.isDragging = true;
        fabricCanvas.selection = false;
        canvas.lastPosX = options.e.clientX;
        canvas.lastPosY = options.e.clientY;
        return;
      }

      if (activeToolRef.current === 'select' || fabricCanvas.isDrawingMode) return;
      
      const pointer = fabricCanvas.getPointer(options.e);
      const id = crypto.randomUUID();
      const colors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#ddd6fe'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      let data: ElementData | null = null;
      if (activeToolRef.current === 'rectangle') {
        data = { type: 'rect', left: pointer.x, top: pointer.y, width: 100, height: 100, fill: '#3b82f6', id };
      } else if (activeToolRef.current === 'circle') {
        data = { type: 'circle', left: pointer.x, top: pointer.y, radius: 50, fill: '#ef4444', id };
      } else if (activeToolRef.current === 'text') {
        data = { type: 'i-text', left: pointer.x, top: pointer.y, text: 'Type...', fill: '#18181b', id };
      } else if (activeToolRef.current === 'sticky') {
        data = { type: 'group', left: pointer.x, top: pointer.y, width: 150, height: 150, fill: color, text: '', id };
      }

      if (data) {
        yElements.set(id, data);
        setActiveTool('select');
      }
    });

    fabricCanvas.on('mouse:move', (options) => {
      wsProvider.awareness.setLocalStateField('cursor', {
        x: options.e.clientX,
        y: options.e.clientY
      });

      const canvas = fabricCanvas as any;
      if (canvas.isDragging) {
        const e = options.e;
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - canvas.lastPosX;
          vpt[5] += e.clientY - canvas.lastPosY;
          fabricCanvas.requestRenderAll();
          canvas.lastPosX = e.clientX;
          canvas.lastPosY = e.clientY;
        }
      }
    });

    fabricCanvas.on('mouse:up', () => {
      const canvas = fabricCanvas as any;
      if (canvas.isDragging) {
        fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform!);
        canvas.isDragging = false;
        fabricCanvas.selection = activeToolRef.current === 'select';
      }
    });

    const handleResize = () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Backspace' || e.key === 'Delete') && !((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).isContentEditable)) {
        const activeObjects = fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
          ydoc.transact(() => {
            activeObjects.forEach((obj: FabricObjectWithId) => {
              if (obj.id) yElements.delete(obj.id);
            });
          });
          fabricCanvas.discardActiveObject().renderAll();
        }
      }

      if (!((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).isContentEditable)) {
        switch (e.key.toLowerCase()) {
          case 'v': setActiveTool('select'); break;
          case 'p': setActiveTool('pencil'); break;
          case 'r': setActiveTool('rectangle'); break;
          case 'o': setActiveTool('circle'); break;
          case 't': setActiveTool('text'); break;
          case 's': setActiveTool('sticky'); break;
          case 'z':
            if (e.ctrlKey || e.metaKey) {
              if (e.shiftKey) undoManager.redo();
              else undoManager.undo();
            }
            break;
          case 'y':
            if (e.ctrlKey || e.metaKey) undoManager.redo();
            break;
        }
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
  }, [userInfo]);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <TopBar status={status} userCount={userCount} />
      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onClear={() => {
          if (confirm('Clear entire board?')) {
            yElementsRef.current?.clear();
          }
        }}
        onUndo={() => undoManagerRef.current?.undo()}
        onRedo={() => undoManagerRef.current?.redo()}
        canUndo={canUndo}
        canRedo={canRedo}
      />
      <CursorsLayer connections={awarenessStates} selfId={selfId} />
      <canvas ref={canvasRef} />
    </div>
  );
};
