import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string };
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
}

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('connecting');
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;
    
    // Offline persistence
    const dbProvider = new IndexeddbPersistence('syncboard-db', ydoc);
    
    // Remote sync
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-room', ydoc);
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth - 40,
      height: window.innerHeight - 150,
      backgroundColor: '#f3f4f6'
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
            fontFamily: 'sans-serif',
            fontSize: 24
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

    window.addEventListener('resize', () => {
      fabricCanvas.setDimensions({ width: window.innerWidth - 40, height: window.innerHeight - 150 });
    });

    return () => {
      wsProvider.destroy();
      fabricCanvas.dispose();
    };
  }, []);

  const addShape = (type: 'rectangle' | 'circle' | 'text') => {
    if (!yElementsRef.current) return;
    const id = crypto.randomUUID();
    const colors = ['#1D4ED8', '#B91C1C', '#047857', '#B45309', '#4C1D95', '#111827'];
    const data: ElementData = {
      id, type,
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      size: type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 },
      content: type === 'text' ? 'Type text...' : undefined,
      style: { fill: colors[Math.floor(Math.random() * colors.length)] }
    };
    yElementsRef.current.set(id, data);
  };

  const clearBoard = () => {
    if (!yElementsRef.current) return;
    const keys = Array.from(yElementsRef.current.keys());
    keys.forEach(k => yElementsRef.current!.delete(k));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>SyncBoard MVP</h2>
        <span style={{ 
          padding: '6px 12px', borderRadius: '12px', background: status === 'connected' ? '#dcfce7' : '#fee2e2', 
          color: status === 'connected' ? '#166534' : '#991b1b', fontWeight: 'bold', fontSize: '14px' 
        }}>
          {status === 'connected' ? '🟢 Online' : '🔴 Offline'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button onClick={() => addShape('rectangle')}>⬜ Rectangle</button>
        <button onClick={() => addShape('circle')}>⭕ Circle</button>
        <button onClick={() => addShape('text')}>📝 Text</button>
        <button onClick={clearBoard} style={{ marginLeft: 'auto', background: '#fee2e2', color: '#991b1b', border: 'none' }}>🗑️ Clear</button>
      </div>
      <div style={{ border: '2px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};
