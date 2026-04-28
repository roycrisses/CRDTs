import { useEffect, useRef, useState, useMemo } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Type,
  Pencil,
  StickyNote,
  Trash2,
  Undo2,
  Redo2,
  ChevronUp
} from 'lucide-react';
import { cn } from './lib/utils';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'path' | 'sticky';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number };
  path?: (string | number)[][];
};

type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'text' | 'sticky';

interface UserPresence {
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

// Custom interface for Fabric objects with ID
interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

// Custom interface for Fabric Canvas with panning state
interface FabricCanvasWithPanning extends fabric.Canvas {
  lastPosX?: number;
  lastPosY?: number;
}

// Generate random user info outside to keep it pure
const RANDOM_COLOR = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'][Math.floor(Math.random() * 7)];
const RANDOM_NAME = `User ${Math.floor(Math.random() * 1000)}`;

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [users, setUsers] = useState<Record<string, UserPresence>>({});
  const [localClientID, setLocalClientID] = useState<string | null>(null);

  const fabricRef = useRef<FabricCanvasWithPanning | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const addShape = (type: Tool) => {
    if (!yElementsRef.current) return;
    if (type === 'select' || type === 'pencil') {
      setActiveTool(type);
      return;
    }

    const id = crypto.randomUUID();
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#111827'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    let data: ElementData;
    const pos = { x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 40 };

    if (type === 'rectangle') {
      data = { id, type, position: pos, size: { width: 120, height: 80 }, style: { fill: color } };
    } else if (type === 'circle') {
      data = { id, type, position: pos, size: { width: 80, height: 80, radius: 40 }, style: { fill: color } };
    } else if (type === 'text') {
      data = { id, type, position: pos, size: { width: 150, height: 40 }, content: 'Type something...', style: { fill: color } };
    } else if (type === 'sticky') {
       data = { id, type, position: pos, size: { width: 150, height: 150 }, content: 'Sticky Note', style: { fill: '#fef08a' } };
    } else {
      return;
    }

    yElementsRef.current.set(id, data);
    setActiveTool('select');
  };

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;
    
    // Undo Manager
    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    const dbProvider = new IndexeddbPersistence('syncboard-db', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-room', ydoc);
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    // Sync local client ID via an effect indirectly
    const id = wsProvider.awareness.clientID.toString();
    setTimeout(() => setLocalClientID(id), 0);

    // Awareness for presence
    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: RANDOM_NAME,
      color: RANDOM_COLOR,
    });

    awareness.on('change', () => {
      const states = awareness.getStates();
      const newUsers: Record<string, UserPresence> = {};
      states.forEach((state: any, clientID: number) => {
        if (state.user) {
          newUsers[clientID.toString()] = {
            ...state.user,
            cursor: state.cursor
          };
        }
      });
      setUsers(newUsers);
    });

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f9fafb',
      selection: true,
      fireRightClick: true,
      stopContextMenu: true,
    }) as FabricCanvasWithPanning;
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string) => 
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const createStickyNote = (data: ElementData) => {
      const rect = new fabric.Rect({
        width: data.size.width,
        height: data.size.height,
        fill: data.style.fill,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 }),
        originX: 'center',
        originY: 'center'
      });

      const text = new fabric.IText(data.content || 'Note', {
        fontSize: 20,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        width: data.size.width - 20,
      } as any);

      const group = new fabric.Group([rect, text], {
        left: data.position.x,
        top: data.position.y,
        selectable: true,
      }) as FabricObjectWithId;

      group.id = data.id;
      return group;
    };

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key) as any;
      if (existing) {
        if (data.type === 'path') return;

        if (data.type === 'sticky' && existing.type === 'group') {
           const textObj = existing.item(1) as fabric.IText;
           if (textObj.text !== data.content) {
             textObj.set({ text: data.content });
           }
           existing.set({
             left: data.position.x,
             top: data.position.y,
             scaleX: data.size.width / (existing.width || 1),
             scaleY: data.size.height / (existing.height || 1)
           });
        } else {
          existing.set({
            left: data.position.x,
            top: data.position.y,
            width: data.size.width / (existing.scaleX || 1),
            height: data.size.height / (existing.scaleY || 1),
            radius: data.size.radius,
            text: data.content,
            fill: data.style.fill
          });
        }
        existing.setCoords();
      } else {
        let obj;
        if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 25,
            fill: data.style.fill
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || 'Text', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: 'Inter, sans-serif',
            fontSize: 24
          });
        } else if (data.type === 'sticky') {
          obj = createStickyNote(data);
        } else if (data.type === 'path' && data.path) {
          obj = new fabric.Path(data.path as any, {
            left: data.position.x,
            top: data.position.y,
            fill: undefined,
            stroke: data.style.fill,
            strokeWidth: data.style.strokeWidth || 2,
            selectable: true
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
    
    dbProvider.on('synced', loadAll);

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
        const content = (obj as any).text || (obj.type === 'group' ? (obj as fabric.Group).item(1).get('text' as any) : data.content);

        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: obj.left || 0, y: obj.top || 0 },
          size: { 
            width: (obj.width || 0) * (obj.scaleX || 1),
            height: (obj.height || 0) * (obj.scaleY || 1),
            radius: (obj as any).radius ? (obj as any).radius * Math.max(obj.scaleX || 1, obj.scaleY || 1) : undefined
          },
          content: content as string
        });
      }
    };

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('path:created', (e: any) => {
      if (isUpdatingRef.current || !yElementsRef.current) return;
      const path = e.path;
      const id = crypto.randomUUID();
      path.id = id;

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left, y: path.top },
        size: { width: path.width, height: path.height },
        style: { fill: path.stroke },
        path: path.path
      };
      yElementsRef.current.set(id, data);
    });

    // Navigation: Zoom and Pan
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

    let isPanning = false;
    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      if (evt.altKey === true || activeToolRef.current === 'select' && !opt.target) {
        isPanning = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;
      if (isPanning) {
        const vpt = fabricCanvas.viewportTransform;
        if (vpt && fabricCanvas.lastPosX !== undefined && fabricCanvas.lastPosY !== undefined) {
          vpt[4] += e.clientX - fabricCanvas.lastPosX;
          vpt[5] += e.clientY - fabricCanvas.lastPosY;
          fabricCanvas.requestRenderAll();
          fabricCanvas.lastPosX = e.clientX;
          fabricCanvas.lastPosY = e.clientY;
        }
      }

      // Cursor tracking
      if (opt.pointer) {
        awareness.setLocalStateField('cursor', {
          x: opt.pointer.x,
          y: opt.pointer.y
        });
      }
    });

    fabricCanvas.on('mouse:up', () => {
      isPanning = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
    });

    fabricCanvas.on('mouse:out', () => {
      awareness.setLocalStateField('cursor', null);
    });

    // Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          undoManager.redo();
        } else {
          undoManager.undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        undoManager.redo();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const activeObjects = fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
          activeObjects.forEach(obj => {
            const id = (obj as FabricObjectWithId).id;
            if (id) yElements.delete(id);
          });
          fabricCanvas.discardActiveObject();
        }
      } else if (e.key === 'v') setActiveTool('select');
      else if (e.key === 'p') setActiveTool('pencil');
      else if (e.key === 'r') addShape('rectangle');
      else if (e.key === 'o') addShape('circle');
      else if (e.key === 't') addShape('text');
      else if (e.key === 's') addShape('sticky');
    };

    window.addEventListener('keydown', handleKeyDown);

    const handleResize = () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      wsProvider.destroy();
      fabricCanvas.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync tool state with Fabric
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    canvas.isDrawingMode = activeTool === 'pencil';
    canvas.selection = activeTool === 'select';

    canvas.getObjects().forEach(obj => {
      obj.selectable = activeTool === 'select';
    });

    if (activeTool === 'pencil') {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = 3;
      canvas.freeDrawingBrush.color = '#111827';
    } else {
      canvas.defaultCursor = activeTool === 'select' ? 'default' : 'crosshair';
    }

    canvas.renderAll();
  }, [activeTool]);

  const clearBoard = () => {
    if (window.confirm('Clear all elements?')) {
      yElementsRef.current?.clear();
    }
  };

  const remoteUsers = useMemo(() => {
    return Object.entries(users).filter(([id]) => id !== localClientID);
  }, [users, localClientID]);
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="relative w-screen h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Cursors Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {remoteUsers.map(([id, user]) => user.cursor && (
          <div
            key={id}
            className="absolute transition-all duration-75 ease-out"
            style={{ left: user.cursor.x, top: user.cursor.y }}
          >
            <MousePointer2
              size={18}
              fill={user.color}
              stroke="white"
              strokeWidth={1.5}
              className="drop-shadow-sm"
            />
            <div
              className="ml-3 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        ))}
      </div>

      {/* Header / Status */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-sm">SB</div>
          <span className="font-semibold text-gray-700">SyncBoard</span>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors",
          status === 'connected' ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
        )}>
          <div className={cn("w-1.5 h-1.5 rounded-full", status === 'connected' ? "bg-green-500" : "bg-red-500")} />
          {status === 'connected' ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white p-1.5 rounded-2xl shadow-xl border border-gray-200 flex items-center gap-1">
          <ToolbarButton
            active={activeTool === 'select'}
            onClick={() => setActiveTool('select')}
            icon={<MousePointer2 size={20} />}
            label="Select (V)"
          />
          <ToolbarButton
            active={activeTool === 'pencil'}
            onClick={() => setActiveTool('pencil')}
            icon={<Pencil size={20} />}
            label="Pencil (P)"
          />
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <ToolbarButton
            active={activeTool === 'rectangle'}
            onClick={() => addShape('rectangle')}
            icon={<Square size={20} />}
            label="Rectangle (R)"
          />
          <ToolbarButton
            active={activeTool === 'circle'}
            onClick={() => addShape('circle')}
            icon={<CircleIcon size={20} />}
            label="Circle (O)"
          />
          <ToolbarButton
            active={activeTool === 'text'}
            onClick={() => addShape('text')}
            icon={<Type size={20} />}
            label="Text (T)"
          />
          <ToolbarButton
            active={activeTool === 'sticky'}
            onClick={() => addShape('sticky')}
            icon={<StickyNote size={20} />}
            label="Sticky Note (S)"
          />
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <ToolbarButton
            onClick={clearBoard}
            icon={<Trash2 size={20} />}
            label="Clear Board"
            className="hover:bg-red-50 hover:text-red-600"
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2">
          <div className="flex -space-x-2 overflow-hidden">
             {Object.entries(users).map(([id, user]) => (
               <div
                 key={id}
                 title={user.name}
                 className="inline-block h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                 style={{ backgroundColor: user.color }}
               >
                 {user.name.charAt(0)}
               </div>
             ))}
          </div>
          <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500">
            <ChevronUp size={16} />
          </button>
        </div>
        <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 flex flex-col">
           <ToolbarButton
             onClick={() => undoManagerRef.current?.undo()}
             icon={<Undo2 size={18} />}
             label="Undo (Cmd+Z)"
           />
           <ToolbarButton
             onClick={() => undoManagerRef.current?.redo()}
             icon={<Redo2 size={18} />}
             label="Redo (Cmd+Shift+Z)"
           />
        </div>
      </div>

      {/* Canvas */}
      <div className={cn("w-full h-full", activeTool === 'select' ? "cursor-default" : "cursor-crosshair")}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const ToolbarButton = ({ icon, label, active, onClick, className }: ToolbarButtonProps) => (
  <button
    onClick={onClick}
    title={label}
    className={cn(
      "p-2.5 rounded-xl transition-all duration-200 relative group flex items-center justify-center",
      active
        ? "bg-indigo-50 text-indigo-600"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700",
      className
    )}
  >
    {icon}
    {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full" />}
    <span className="absolute bottom-full mb-3 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
      {label}
    </span>
  </button>
);
