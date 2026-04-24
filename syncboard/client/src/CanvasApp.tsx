import React, { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';
import { fabric } from 'fabric';
import * as Y from 'yjs';
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
  Share2
} from 'lucide-react';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'path' | 'sticky';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  path?: (string | number)[][];
  style: { fill: string; stroke?: string; strokeWidth?: number };
};

export interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

export type Tool = 'select' | 'rectangle' | 'circle' | 'text' | 'pencil' | 'sticky';

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fabricRef = useRef<fabric.Canvas | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;
    undoManagerRef.current = new Y.UndoManager(yElements);
    
    // Offline persistence
    const dbProvider = new IndexeddbPersistence('syncboard-db', ydoc);
    
    // Remote sync
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-room', ydoc);
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#f8fafc',
      selection: true
    });
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string) => 
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key) as any; // Using any here because fabric objects have different properties
      if (existing) {
        if (data.type === 'sticky') {
          const text = existing.item(1);
          const rect = existing.item(0);
          rect.set({ fill: data.style.fill });
          text.set({ text: data.content });
          existing.set({
            left: data.position.x,
            top: data.position.y,
          });
        } else if (data.type === 'path') {
          existing.set({
            left: data.position.x,
            top: data.position.y,
            scaleX: 1,
            scaleY: 1
          });
        } else {
          existing.set({
            left: data.position.x,
            top: data.position.y,
            width: data.size.width / existing.scaleX,
            height: data.size.height / existing.scaleY,
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
          obj = new fabric.IText(data.content || 'Text', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: 'sans-serif',
            fontSize: 24
          });
        } else if (data.type === 'path') {
          obj = new fabric.Path(data.path, {
            left: data.position.x, top: data.position.y,
            fill: 'transparent',
            stroke: data.style.stroke,
            strokeWidth: data.style.strokeWidth
          });
        } else if (data.type === 'sticky') {
          const rect = new fabric.Rect({
            width: 150, height: 150,
            fill: data.style.fill,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
          });
          const text = new fabric.IText(data.content || 'Note', {
            fontSize: 16,
            left: 15, top: 15,
            width: 120,
            fontFamily: 'sans-serif'
          });
          obj = new fabric.Group([rect, text], {
            left: data.position.x, top: data.position.y,
          });
        }
        if (obj) {
          (obj as any).id = key;
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
    
    // Load initial data
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
      const obj = e.target as any;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        const newData = {
          ...data,
          position: { x: obj.left, y: obj.top },
          size: { 
            width: obj.width * obj.scaleX, 
            height: obj.height * obj.scaleY, 
            radius: obj.radius ? obj.radius * Math.max(obj.scaleX, obj.scaleY) : undefined 
          }
        };

        if (data.type === 'sticky') {
          newData.content = obj.item(1).text;
        } else if (data.type === 'text') {
          newData.content = obj.text;
        }

        yElementsRef.current.set(obj.id, newData);
      }
    };

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', updateYjs);
    fabricCanvas.on('object:scaling', updateYjs);
    fabricCanvas.on('text:changed', updateYjs);
    fabricCanvas.on('text:editing:exited', updateYjs);

    fabricCanvas.on('selection:created', (e) => setSelectedId((e.selected?.[0] as FabricObjectWithId)?.id || null));
    fabricCanvas.on('selection:updated', (e) => setSelectedId((e.selected?.[0] as FabricObjectWithId)?.id || null));
    fabricCanvas.on('selection:cleared', () => setSelectedId(null));

    // Zooming
    fabricCanvas.on('mouse:wheel', function(opt) {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Panning
    fabricCanvas.on('mouse:down', function(opt) {
      const evt = opt.e;
      if (evt.altKey === true || activeTool === 'select') {
        (this as any).isDragging = true;
        this.selection = false;
        (this as any).lastPosX = evt.clientX;
        (this as any).lastPosY = evt.clientY;
      }
    });
    fabricCanvas.on('mouse:move', function(opt) {
      if ((this as any).isDragging) {
        const e = opt.e;
        const vpt = this.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - (this as any).lastPosX;
          vpt[5] += e.clientY - (this as any).lastPosY;
          this.requestRenderAll();
          (this as any).lastPosX = e.clientX;
          (this as any).lastPosY = e.clientY;
        }
      }
    });
    fabricCanvas.on('mouse:up', function() {
      if (this.viewportTransform) {
        this.setViewportTransform(this.viewportTransform);
      }
      (this as any).isDragging = false;
      this.selection = true;
    });

    // Handle tool changes
    if (activeTool === 'pencil') {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush.width = 3;
      fabricCanvas.freeDrawingBrush.color = '#1e293b';
    } else {
      fabricCanvas.isDrawingMode = false;
    }

    fabricCanvas.on('path:created', (e: any) => {
      if (!yElementsRef.current) return;
      const id = crypto.randomUUID();
      const path = e.path;
      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left, y: path.top },
        size: { width: path.width, height: path.height },
        path: path.path,
        style: { fill: 'transparent', stroke: path.stroke, strokeWidth: path.strokeWidth }
      };
      yElementsRef.current.set(id, data);
      fabricCanvas.remove(path); // Remove temporary fabric path, Yjs observer will add the synced one
    });

    window.addEventListener('resize', () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    });

    return () => {
      wsProvider.destroy();
      fabricCanvas.dispose();
    };
  }, [activeTool]);

  const addShape = useCallback((type: 'rectangle' | 'circle' | 'text' | 'sticky') => {
    if (!yElementsRef.current) return;
    const id = crypto.randomUUID();
    const colors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#f5d0fe'];
    const data: ElementData = {
      id, type,
      position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 200 },
      size: type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 },
      content: type === 'text' ? 'Type text...' : type === 'sticky' ? 'Note' : undefined,
      style: { fill: type === 'sticky' ? colors[Math.floor(Math.random() * colors.length)] : '#3b82f6' }
    };
    yElementsRef.current.set(id, data);
  }, []);

  const clearBoard = () => {
    if (!yElementsRef.current) return;
    const keys = Array.from(yElementsRef.current.keys());
    keys.forEach(k => yElementsRef.current!.delete(k));
  };

  const deleteSelected = () => {
    if (!selectedId || !yElementsRef.current) return;
    yElementsRef.current.delete(selectedId);
    setSelectedId(null);
  };

  const updateColor = (color: string) => {
    if (!selectedId || !yElementsRef.current) return;
    const data = yElementsRef.current.get(selectedId);
    if (data) {
      yElementsRef.current.set(selectedId, {
        ...data,
        style: { ...data.style, fill: color }
      });
    }
  };

  const toolbarButtons: { tool: Tool; icon: any; label: string; action?: () => void }[] = [
    { tool: 'select', icon: MousePointer2, label: 'Select' },
    { tool: 'rectangle', icon: Square, label: 'Rectangle', action: () => addShape('rectangle') },
    { tool: 'circle', icon: CircleIcon, label: 'Circle', action: () => addShape('circle') },
    { tool: 'text', icon: Type, label: 'Text', action: () => addShape('text') },
    { tool: 'pencil', icon: Pencil, label: 'Pencil' },
    { tool: 'sticky', icon: StickyNote, label: 'Sticky Note', action: () => addShape('sticky') },
  ];

  const colors = ['#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#94a3b8', '#1e293b', '#ffffff'];

  return (
    <div className="app-container">
      {/* Header */}
      <div className="app-header">
        <div className="brand">
          <div className="logo-icon"><Share2 size={20} /></div>
          <h1>SyncBoard</h1>
        </div>

        <div className="header-actions">
          <div className={`status-badge ${status}`}>
            {status === 'connected' ? 'Connected' : 'Disconnected'}
          </div>
          <button className="btn-icon" title="Undo" onClick={() => undoManagerRef.current?.undo()}><Undo2 size={18} /></button>
          <button className="btn-icon" title="Redo" onClick={() => undoManagerRef.current?.redo()}><Redo2 size={18} /></button>
          <button className="btn-primary">Share</button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>

      {/* Toolbar */}
      <div className="floating-toolbar">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.tool}
            className={`tool-btn ${activeTool === btn.tool ? 'active' : ''}`}
            onClick={() => {
              setActiveTool(btn.tool);
              if (btn.action) btn.action();
            }}
            title={btn.label}
          >
            <btn.icon size={20} />
          </button>
        ))}
        <div className="divider" />
        <button className="tool-btn delete" onClick={clearBoard} title="Clear Board">
          <Trash2 size={20} />
        </button>
      </div>

      {/* Properties Panel */}
      {selectedId && (
        <div className="properties-panel">
          <h3>Properties</h3>
          <div className="section">
            <label>Color</label>
            <div className="color-grid">
              {colors.map(c => (
                <button
                  key={c}
                  className="color-swatch"
                  style={{ backgroundColor: c }}
                  onClick={() => updateColor(c)}
                />
              ))}
            </div>
          </div>
          <div className="divider" />
          <button className="btn-danger" onClick={deleteSelected}>
            <Trash2 size={16} /> Delete Object
          </button>
        </div>
      )}
    </div>
  );
};
