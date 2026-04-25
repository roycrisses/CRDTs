import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  Square,
  Circle as CircleIcon,
  Type,
  StickyNote,
  Pencil,
  MousePointer2,
  Trash2,
  Undo2,
  Redo2,
  X,
  Search,
  Hand
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

export interface ExtendedCanvas extends fabric.Canvas {
    lastPosX?: number;
    lastPosY?: number;
}

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number };
  pathData?: (string | number)[][];
};

type Tool = 'select' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'pencil' | 'hand';

const COLORS = [
  '#fecaca', '#fed7aa', '#fef08a', '#dcfce7', '#dbeafe', '#e0e7ff', '#f5d0fe', '#f3f4f6',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#6366f1', '#a855f7', '#374151'
];

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [vpt, setVpt] = useState<number[]>([1, 0, 0, 1, 0, 0]);
  const [cursors, setCursors] = useState<Map<number, { x: number; y: number; color: string; name: string }>>(new Map());

  const fabricRef = useRef<ExtendedCanvas | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);

  const addShape = useCallback((type: ElementData['type']) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const id = crypto.randomUUID();
    const center = fabricRef.current.getVpCenter();

    const data: ElementData = {
      id,
      type,
      position: { x: center.x - 50, y: center.y - 50 },
      size: type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 100, height: 100 },
      style: {
          fill: type === 'sticky' ? '#fef08a' : COLORS[Math.floor(Math.random() * 8) + 8],
          stroke: '#374151',
          strokeWidth: 2
      },
      content: type === 'text' ? 'Type something...' : (type === 'sticky' ? 'Note' : undefined)
    };

    yElementsRef.current.set(id, data);
    setActiveTool('select');
  }, []);

  const deleteSelected = useCallback(() => {
      if (!yElementsRef.current || !selectedId) return;
      yElementsRef.current.delete(selectedId);
      fabricRef.current?.discardActiveObject().renderAll();
  }, [selectedId]);

  const updateSelectedColor = useCallback((color: string) => {
      if (!yElementsRef.current || !selectedId) return;
      const data = yElementsRef.current.get(selectedId);
      if (data) {
          yElementsRef.current.set(selectedId, {
              ...data,
              style: { ...data.style, fill: color }
          });
      }
  }, [selectedId]);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;
    undoManagerRef.current = new Y.UndoManager(yElements);
    
    const dbProvider = new IndexeddbPersistence('syncboard-db', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-room', ydoc);
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    // Awareness
    const awareness = wsProvider.awareness;
    const userColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const userName = `User ${Math.floor(Math.random() * 100)}`;
    awareness.setLocalStateField('user', { name: userName, color: userColor });

    awareness.on('change', () => {
        const states = awareness.getStates();
        const newCursors = new Map();
        states.forEach((state, clientID) => {
            if (clientID === awareness.clientID) return;
            if (state.cursor) {
                newCursors.set(clientID, {
                    ...state.cursor,
                    color: state.user?.color || '#000',
                    name: state.user?.name || 'Anonymous'
                });
            }
        });
        setCursors(newCursors);
    });

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f9fafb',
      selection: true,
    }) as ExtendedCanvas;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    fabricCanvas.set({ subTargetCheck: true });
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string) => 
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key) as FabricObjectWithId & any;

      if (existing) {
        existing.set({
          left: data.position.x,
          top: data.position.y,
          fill: data.style.fill,
        });

        if (data.type === 'rectangle' || data.type === 'sticky') {
            existing.set({
                width: data.size.width / (existing.scaleX || 1),
                height: data.size.height / (existing.scaleY || 1),
            });
            if (data.type === 'sticky' && existing.type === 'group') {
                const rect = existing.getObjects().find((o: any) => o.type === 'rect');
                if (rect) rect.set({ fill: data.style.fill });
            }
        }

        if (data.type === 'circle' && data.size.radius) {
           existing.set({ radius: data.size.radius });
        }

        if (data.type === 'text') {
          existing.set({ text: data.content });
        }

        if (data.type === 'sticky' && existing.type === 'group') {
            const textObj = existing.getObjects().find((o: any) => o.type === 'i-text');
            if (textObj) textObj.set({ text: data.content });
        }

        existing.setCoords();
      } else {
        let obj: fabric.Object | null = null;
        if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 4, ry: 4
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || 'Text', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 24
          });
        } else if (data.type === 'sticky') {
            const rect = new fabric.Rect({
                width: 150, height: 150,
                fill: data.style.fill,
                shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
            });
            const text = new fabric.IText(data.content || 'Note', {
                fontSize: 16,
                fontFamily: 'Inter, system-ui, sans-serif',
                textAlign: 'center',
                originX: 'center', originY: 'center',
                left: 75, top: 75,
                width: 130,
            });
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            text.set({ splitByGrapheme: true });

            obj = new fabric.Group([rect, text], {
                left: data.position.x,
                top: data.position.y,
            });
        } else if (data.type === 'path' && data.pathData) {
            obj = new fabric.Path(data.pathData as any, {
                fill: 'transparent',
                stroke: data.style.stroke,
                strokeWidth: data.style.strokeWidth,
                strokeLineCap: 'round',
                strokeLineJoin: 'round',
                left: data.position.x,
                top: data.position.y,
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

    yElements.observe((event) => {
      if (isUpdatingRef.current) return;
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
      const obj = e.target as FabricObjectWithId & any;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        const newData: ElementData = {
          ...data,
          position: { x: obj.left, y: obj.top },
          size: { 
            width: obj.width * (obj.scaleX || 1),
            height: obj.height * (obj.scaleY || 1),
            radius: obj.radius ? obj.radius * Math.max(obj.scaleX || 1, obj.scaleY || 1) : data.size.radius
          },
        };

        if (obj.type === 'i-text') {
            newData.content = obj.text;
        } else if (obj.type === 'group' && data.type === 'sticky') {
            const textObj = obj.getObjects().find((o: any) => o.type === 'i-text');
            if (textObj) newData.content = textObj.text;
        }

        yElementsRef.current.set(obj.id, newData);
      }
    };

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', updateYjs); // Ensure real-time sync for paths and groups

    fabricCanvas.on('path:created', (e: any) => {
        if (isUpdatingRef.current || !yElementsRef.current) return;
        const id = crypto.randomUUID();
        const path = e.path;
        path.id = id;

        const data: ElementData = {
            id,
            type: 'path',
            position: { x: path.left, y: path.top },
            size: { width: path.width, height: path.height },
            style: { fill: 'transparent', stroke: path.stroke, strokeWidth: path.strokeWidth },
            pathData: path.path
        };
        yElementsRef.current.set(id, data);
    });

    fabricCanvas.on('selection:created', (e) => {
        const obj = e.selected?.[0] as FabricObjectWithId;
        if (obj?.id) setSelectedId(obj.id);
    });
    fabricCanvas.on('selection:cleared', () => setSelectedId(null));
    fabricCanvas.on('selection:updated', (e) => {
        const obj = e.selected?.[0] as FabricObjectWithId;
        if (obj?.id) setSelectedId(obj.id);
        else setSelectedId(null);
    });

    // Zoom and Pan
    fabricCanvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let zoomVal = fabricCanvas.getZoom();
        zoomVal *= 0.999 ** delta;
        if (zoomVal > 20) zoomVal = 20;
        if (zoomVal < 0.01) zoomVal = 0.01;
        fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoomVal);
        opt.e.preventDefault();
        opt.e.stopPropagation();
        setZoom(zoomVal);
        if (fabricCanvas.viewportTransform) setVpt([...fabricCanvas.viewportTransform]);
    });

    let isPanning = false;
    fabricCanvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        if (evt.altKey || activeTool === 'hand') {
            isPanning = true;
            fabricCanvas.selection = false;
            fabricCanvas.lastPosX = evt.clientX;
            fabricCanvas.lastPosY = evt.clientY;
        }
    });

    fabricCanvas.on('mouse:move', (opt) => {
        const pointer = fabricCanvas.getPointer(opt.e);
        awareness.setLocalStateField('cursor', {
            x: pointer.x,
            y: pointer.y
        });

        if (isPanning) {
            const e = opt.e;
            const currentVpt = fabricCanvas.viewportTransform;
            if (currentVpt) {
                currentVpt[4] += e.clientX - (fabricCanvas.lastPosX || 0);
                currentVpt[5] += e.clientY - (fabricCanvas.lastPosY || 0);
                fabricCanvas.requestRenderAll();
                fabricCanvas.lastPosX = e.clientX;
                fabricCanvas.lastPosY = e.clientY;
                setVpt([...currentVpt]);
            }
        }
    });

    fabricCanvas.on('mouse:up', () => {
        isPanning = false;
        fabricCanvas.selection = true;
    });

    window.addEventListener('resize', () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    });

    return () => {
      wsProvider.destroy();
      fabricCanvas.dispose();
    };
  }, [activeTool]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800 m-0 tracking-tight">SyncBoard</h1>
            <div className="h-4 w-[1px] bg-gray-200" />
            <div className="flex items-center gap-2">
                <div className={cn("h-2 w-2 rounded-full animate-pulse", status === 'connected' ? "bg-green-500" : "bg-red-500")} />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{status}</span>
            </div>
        </div>
        <div className="bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      <canvas ref={canvasRef} />

      {/* Other Users' Cursors */}
      {Array.from(cursors.entries()).map(([id, cursor]) => (
          <div
            key={id}
            className="absolute pointer-events-none z-50 transition-transform duration-75 ease-out"
            style={{
                left: 0, top: 0,
                transform: `translate(${cursor.x * zoom + vpt[4]}px, ${cursor.y * zoom + vpt[5]}px)`
            }}
          >
              <MousePointer2 size={18} fill={cursor.color} stroke="white" strokeWidth={1} />
              <div
                className="ml-3 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                style={{ backgroundColor: cursor.color }}
              >
                  {cursor.name}
              </div>
          </div>
      ))}

      {/* Property Panel */}
      {selectedId && (
          <div className="absolute top-4 right-4 z-10 animate-in fade-in slide-in-from-right-4 duration-200">
              <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-200 w-64">
                  <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-semibold text-gray-700">Properties</span>
                      <button onClick={() => fabricRef.current?.discardActiveObject().renderAll()} className="text-gray-400 hover:text-gray-600">
                          <X size={18} />
                      </button>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 block">Fill Color</label>
                          <div className="grid grid-cols-8 gap-2">
                              {COLORS.map(color => (
                                  <button
                                      key={color}
                                      onClick={() => updateSelectedColor(color)}
                                      className="w-5 h-5 rounded-full border border-gray-200 transition-transform hover:scale-110 active:scale-95"
                                      style={{ backgroundColor: color }}
                                  />
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Toolbar */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-2xl border border-gray-200/50 flex items-center gap-1">
            <ToolbarButton
                active={activeTool === 'select'}
                onClick={() => { setActiveTool('select'); if (fabricRef.current) fabricRef.current.isDrawingMode = false; }}
                icon={<MousePointer2 size={20} />}
                label="Select"
            />
             <ToolbarButton
                active={activeTool === 'hand'}
                onClick={() => { setActiveTool('hand'); if (fabricRef.current) fabricRef.current.isDrawingMode = false; }}
                icon={<Hand size={20} />}
                label="Pan"
            />
            <div className="w-[1px] h-6 bg-gray-200/50 mx-1" />
            <ToolbarButton
                active={activeTool === 'rectangle'}
                onClick={() => { setActiveTool('rectangle'); addShape('rectangle'); }}
                icon={<Square size={20} />}
                label="Rectangle"
            />
            <ToolbarButton
                active={activeTool === 'circle'}
                onClick={() => { setActiveTool('circle'); addShape('circle'); }}
                icon={<CircleIcon size={20} />}
                label="Circle"
            />
            <ToolbarButton
                active={activeTool === 'sticky'}
                onClick={() => { setActiveTool('sticky'); addShape('sticky'); }}
                icon={<StickyNote size={20} />}
                label="Sticky Note"
            />
            <ToolbarButton
                active={activeTool === 'text'}
                onClick={() => { setActiveTool('text'); addShape('text'); }}
                icon={<Type size={20} />}
                label="Text"
            />
            <ToolbarButton
                active={activeTool === 'pencil'}
                onClick={() => {
                    setActiveTool('pencil');
                    if (fabricRef.current) {
                        fabricRef.current.isDrawingMode = true;
                        fabricRef.current.freeDrawingBrush.width = 3;
                        fabricRef.current.freeDrawingBrush.color = '#374151';
                    }
                }}
                icon={<Pencil size={20} />}
                label="Pencil"
            />
            <div className="w-[1px] h-6 bg-gray-200/50 mx-1" />
            <ToolbarButton
                onClick={() => undoManagerRef.current?.undo()}
                icon={<Undo2 size={20} />}
                label="Undo"
            />
            <ToolbarButton
                onClick={() => undoManagerRef.current?.redo()}
                icon={<Redo2 size={20} />}
                label="Redo"
            />
            <div className="w-[1px] h-6 bg-gray-200/50 mx-1" />
            <ToolbarButton
                onClick={deleteSelected}
                disabled={!selectedId}
                icon={<Trash2 size={20} />}
                label="Delete"
                danger
            />
        </div>
      </div>
    </div>
  );
};

const ToolbarButton = ({
    icon,
    active,
    onClick,
    label,
    danger,
    disabled
}: {
    icon: React.ReactNode,
    active?: boolean,
    onClick: () => void,
    label: string,
    danger?: boolean,
    disabled?: boolean
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center relative group",
            active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 -translate-y-0.5" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
            danger && "hover:bg-red-50 hover:text-red-600",
            disabled && "opacity-30 cursor-not-allowed"
        )}
        title={label}
    >
        {icon}
        <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap font-medium shadow-xl">
            {label}
        </span>
    </button>
);
