import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Toolbar, type ToolType } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import './App.css';
import { Cursor } from './components/Cursor';

export interface FabricObjectWithId extends fabric.Object {
  id?: string;
  text?: string;
  path?: string;
  radius?: number;
}

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string };
  path?: string;
};

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('connecting');
  const [remoteCursors, setRemoteCursors] = useState<any[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);

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

    const awareness = wsProvider.awareness;
    const localColor = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
    awareness.setLocalStateField('user', {
      name: 'User ' + Math.floor(Math.random() * 100),
      color: localColor
    });

    awareness.on('change', () => {
      const states = awareness.getStates();
      const cursors: any[] = [];
      states.forEach((state, clientID) => {
        if (clientID !== ydoc.clientID && state.user && state.cursor) {
          cursors.push({
            clientID,
            name: state.user.name,
            color: state.user.color,
            x: state.cursor.x,
            y: state.cursor.y
          });
        }
      });
      setRemoteCursors(cursors);
    });

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 'transparent'
    });
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string) => 
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key) as FabricObjectWithId;
      if (existing) {
        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const textObj = existing.getObjects('itext')[0] as fabric.IText;
          if (textObj && textObj.text !== data.content) {
            textObj.set('text', data.content || '');
          }
        }
        existing.set({
          left: data.position.x,
          top: data.position.y,
          width: data.type === 'path' ? existing.width : data.size.width / (existing.scaleX || 1),
          height: data.type === 'path' ? existing.height : data.size.height / (existing.scaleY || 1),
          text: data.content,
          fill: data.style.fill
        } as any);
        if (data.size.radius) {
          (existing as any).set('radius', data.size.radius);
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
            fontFamily: 'sans-serif',
            fontSize: 24
          });
        } else if (data.type === 'sticky') {
          obj = new fabric.Group([
            new fabric.Rect({
              width: 150, height: 150,
              fill: data.style.fill,
              shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.2)', blur: 5, offsetX: 2, offsetY: 2 })
            }),
            new fabric.IText(data.content || '', {
              fontSize: 18,
              fontFamily: 'sans-serif',
              left: 10, top: 10,
              width: 130
            })
          ], { left: data.position.x, top: data.position.y });
        } else if (data.type === 'path' && data.path) {
          obj = new fabric.Path(data.path, {
            left: data.position.x, top: data.position.y,
            stroke: data.style.fill,
            fill: 'transparent',
            strokeWidth: 3
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
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        let content = obj.text;
        if (data.type === 'sticky') {
          content = (obj as fabric.Group).getObjects('itext')[0]?.['text' as keyof fabric.Object] as string;
        }

        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: obj.left || 0, y: obj.top || 0 },
          size: { 
            width: (obj.width || 0) * (obj.scaleX || 1),
            height: (obj.height || 0) * (obj.scaleY || 1),
            radius: obj.radius ? obj.radius * Math.max(obj.scaleX || 1, obj.scaleY || 1) : undefined
          },
          content: content || data.content
        });
      }
    };

    fabricCanvas.on('path:created', (e: any) => {
      if (!yElementsRef.current) return;
      const path = e.path as FabricObjectWithId;
      const id = crypto.randomUUID();

      // Extract the 'd' attribute from the path data
      const pathData = (path as any).path.map((segment: any) => segment.join(' ')).join(' ');

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: { fill: path.stroke || '#000' },
        path: pathData
      };
      path.id = id;
      yElementsRef.current.set(id, data);
    });

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', updateYjs);
    fabricCanvas.on('object:scaling', updateYjs);
    fabricCanvas.on('text:changed', updateYjs);

    fabricCanvas.on('selection:created', () => setShowPropertyPanel(true));
    fabricCanvas.on('selection:updated', () => setShowPropertyPanel(true));
    fabricCanvas.on('selection:cleared', () => setShowPropertyPanel(false));

    fabricCanvas.on('mouse:move', (options) => {
      const pointer = fabricCanvas.getPointer(options.e);
      awareness.setLocalStateField('cursor', {
        x: pointer.x,
        y: pointer.y
      });
    });

    fabricCanvas.on('mouse:out', () => {
      awareness.setLocalStateField('cursor', null);
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

    let isPanning = false;
    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      if (evt.altKey === true) {
        isPanning = true;
        fabricCanvas.selection = false;
        (fabricCanvas as any).lastPosX = evt.clientX;
        (fabricCanvas as any).lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      if (isPanning) {
        const e = opt.e;
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          vpt[4] += e.clientX - (fabricCanvas as any).lastPosX;
          vpt[5] += e.clientY - (fabricCanvas as any).lastPosY;
          fabricCanvas.requestRenderAll();
          (fabricCanvas as any).lastPosX = e.clientX;
          (fabricCanvas as any).lastPosY = e.clientY;
        }
      }
    });

    fabricCanvas.on('mouse:up', () => {
      isPanning = false;
      fabricCanvas.selection = true;
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isUpdatingRef.current) {
         const activeObjects = fabricCanvas.getActiveObjects();
         if (activeObjects.length > 0 && yElementsRef.current) {
           activeObjects.forEach(obj => {
             if ((obj as any).id) {
               yElementsRef.current?.delete((obj as any).id);
             }
           });
           fabricCanvas.discardActiveObject().renderAll();
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    window.addEventListener('resize', () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      wsProvider.destroy();
      fabricCanvas.dispose();
    };
  }, []);

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
    if (!fabricRef.current) return;

    fabricRef.current.isDrawingMode = tool === 'pen';
    if (tool === 'pen') {
       fabricRef.current.freeDrawingBrush.color = selectedColor;
       fabricRef.current.freeDrawingBrush.width = 3;
    }

    if (tool !== 'select' && tool !== 'pen') {
       addShape(tool as any);
       setTimeout(() => setActiveTool('select'), 100);
    }
  };

  const addShape = (type: 'rectangle' | 'circle' | 'text' | 'sticky') => {
    if (!yElementsRef.current) return;
    const id = crypto.randomUUID();
    const data: ElementData = {
      id, type,
      position: { x: 100 + Math.random() * 100, y: 100 + Math.random() * 100 },
      size: type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 },
      content: type === 'text' ? 'Type text...' : (type === 'sticky' ? 'Note' : undefined),
      style: { fill: selectedColor }
    };
    yElementsRef.current.set(id, data);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    if (!fabricRef.current) return;

    const activeObjects = fabricRef.current.getActiveObjects();
    activeObjects.forEach(obj => {
       if (obj instanceof fabric.Group && (obj as any).id) {
          // Sticky note
          const rect = (obj as fabric.Group).getObjects('rect')[0];
          if (rect) rect.set('fill', color);
       } else {
          obj.set('fill', color);
          if (obj.type === 'path') obj.set('stroke', color);
       }

       if ((obj as any).id && yElementsRef.current) {
          const data = yElementsRef.current.get((obj as any).id);
          if (data) {
             yElementsRef.current.set((obj as any).id, {
               ...data,
               style: { ...data.style, fill: color }
             });
          }
       }
    });
    fabricRef.current.renderAll();

    if (fabricRef.current.isDrawingMode) {
      fabricRef.current.freeDrawingBrush.color = color;
    }
  };

  const clearBoard = () => {
    if (!yElementsRef.current) return;
    const keys = Array.from(yElementsRef.current.keys());
    keys.forEach(k => yElementsRef.current!.delete(k));
  };

  const deleteSelected = () => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    activeObjects.forEach(obj => {
      if ((obj as any).id) {
        yElementsRef.current?.delete((obj as any).id);
      }
    });
    fabricRef.current.discardActiveObject().renderAll();
  };

  return (
    <div id="root">
      <div className="app-header">
        <div className="brand">
          <h2>SyncBoard verbeterd</h2>
          <span className={`status-badge ${status === 'connected' ? 'connected' : 'disconnected'}`}>
            {status === 'connected' ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>
      </div>

      <div className="canvas-container-wrapper">
        <canvas ref={canvasRef} />
        {remoteCursors.map(cursor => (
          <Cursor key={cursor.clientID} {...cursor} />
        ))}
      </div>

      <Toolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onClear={clearBoard}
        onDelete={deleteSelected}
      />

      <PropertyPanel
        selectedColor={selectedColor}
        onColorChange={handleColorChange}
        isVisible={showPropertyPanel || activeTool === 'pen'}
      />
    </div>
  );
};
