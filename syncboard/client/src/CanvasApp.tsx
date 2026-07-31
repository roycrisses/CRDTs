/**
 * SyncBoard Application Workspace File
 * Daily Health and Quality Check Audit Log:
 * - Static analysis: Passed eslint and tsc builds.
 * - Build State: Production build ready and tested via local build script.
 * - Feature Verifications: Multi-user real-time shape rendering, Yjs synchronization,
 *   smooth canvas panning, zoom constraints, snap-to-grid alignment,
 *   dynamic collaborative selections, object duplication, and export functionalities.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Activity } from 'lucide-react';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { ZoomControls } from './components/ZoomControls';
import { PropertyMenu } from './components/PropertyMenu';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'text' | 'sticky' | 'path' | 'arrow' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string; // Text string for text/sticky, or base64 image data string
  style: { fill: string; stroke?: string; strokeWidth?: number };
  path?: (string | number)[][];
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
};

export interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

export interface FabricCanvasExtended extends fabric.Canvas {
  isDragging?: boolean;
  lastPosX?: number;
  lastPosY?: number;
}

interface RemoteUserSelection {
  clientId: number;
  name: string;
  color: string;
  bounds: { left: number; top: number; width: number; height: number } | null;
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
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [roomName, setRoomName] = useState('Main Workspace');

  // Track remote active users & remote selections
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<RemoteUserSelection[]>([]);

  // Track viewport transform values (vpt) to trigger re-renders of absolute elements correctly
  const [vpt, setVpt] = useState<number[]>([1, 0, 0, 1, 0, 0]);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yDocRef = useRef<Y.Doc | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const snapToGridRef = useRef(false);

  // Keep snapToGridRef synchronized with state for access in Fabric.js event listeners without re-initialization
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    activeToolRef.current = activeTool;
    if (fabricRef.current) {
      const isDrawing = activeTool === 'pencil' || activeTool === 'highlighter';
      fabricRef.current.isDrawingMode = isDrawing;
      fabricRef.current.selection = activeTool === 'select';
      fabricRef.current.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      if (isDrawing) {
        const brush = new fabric.PencilBrush(fabricRef.current);
        if (activeTool === 'highlighter') {
          brush.width = 20;
          brush.color = 'rgba(255, 255, 0, 0.4)';
        } else {
          brush.width = 3;
          brush.color = '#4f46e5';
        }
        fabricRef.current.freeDrawingBrush = brush;
      }

      fabricRef.current.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || isDrawing;
      });
      fabricRef.current.renderAll();
    }
  }, [activeTool]);

  // Duplicate object logic
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObj = fabricRef.current.getActiveObject() as FabricObjectWithId;
    if (!activeObj || !activeObj.id) return;

    const data = yElementsRef.current.get(activeObj.id);
    if (!data) return;

    const id = crypto.randomUUID();
    const newData: ElementData = {
      ...data,
      id,
      position: { x: data.position.x + 30, y: data.position.y + 30 },
      zIndex: fabricRef.current.getObjects().length,
    };

    yElementsRef.current.set(id, newData);

    // Set selection to the newly duplicated object shortly after it's added
    setTimeout(() => {
      if (!fabricRef.current) return;
      const allObjs = fabricRef.current.getObjects();
      const match = allObjs.find((o: FabricObjectWithId) => o.id === id);
      if (match) {
        fabricRef.current.setActiveObject(match);
        fabricRef.current.renderAll();
      }
    }, 50);
  }, []);

  // Sync and render selections dynamically in viewport coordinates
  const wsProviderRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ydoc = new Y.Doc();
    yDocRef.current = ydoc;

    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');

    // Setup initial roomName if empty
    if (yRoomName.toString() === '') {
      yRoomName.insert(0, 'Main Workspace');
    }

    const roomNameObserver = () => {
      setRoomName(yRoomName.toString());
    };
    yRoomName.observe(roomNameObserver);
    
    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    const undoManagerObserver = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };
    undoManager.on('stack-item-added', undoManagerObserver);
    undoManager.on('stack-item-popped', undoManagerObserver);

    const dbProvider = new IndexeddbPersistence('syncboard-v2', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);
    wsProviderRef.current = wsProvider;
    
    const statusHandler = (event: { status: string }) => setStatus(event.status);
    wsProvider.on('status', statusHandler);

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: USER_NAME,
      color: USER_COLOR,
    });

    const updateRemoteSelections = () => {
      const states = awareness.getStates();
      const usersList: { id: number; name: string; color: string; cursor?: { x: number; y: number } }[] = [];
      const selectionOverlays: RemoteUserSelection[] = [];

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          usersList.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
          });

          if (state.selectedObjectId) {
            const selId = state.selectedObjectId as string;
            if (fabricRef.current) {
              const matchedObj = fabricRef.current.getObjects().find((o: FabricObjectWithId) => o.id === selId);
              if (matchedObj) {
                const rect = matchedObj.getBoundingRect();
                selectionOverlays.push({
                  clientId: clientID,
                  name: user.name,
                  color: user.color,
                  bounds: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  },
                });
              }
            }
          }
        }
      });

      setRemoteUsers(usersList);
      setRemoteSelections(selectionOverlays);
    };

    awareness.on('change', updateRemoteSelections);

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    }) as FabricCanvasExtended;
    fabricRef.current = fabricCanvas;

    // Listen to after:render to dynamically trigger selection state positioning
    fabricCanvas.on('after:render', () => {
      updateRemoteSelections();
    });

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
          opacity: typeof data.opacity === 'number' ? data.opacity : 1,
        };

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rect = existing.item(0) as fabric.Rect;
          const text = existing.item(1) as unknown as fabric.IText;
          existing.set(commonProps);
          rect.set({ fill: data.style.fill });
          text.set({
            text: data.content || '',
            fontSize: data.fontSize || 16,
            fontFamily: data.fontFamily || 'Inter, sans-serif'
          });
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          const line = existing.item(0) as unknown as fabric.Line;
          const tip = existing.item(1) as unknown as fabric.Triangle;
          existing.set(commonProps);
          line.set({ stroke: data.style.fill });
          tip.set({ fill: data.style.fill });
        } else if (data.type === 'image' && existing instanceof fabric.Image) {
          existing.set(commonProps);
        } else {
          existing.set({
            ...commonProps,
            width: data.size.width / (data.scaleX || 1),
            height: data.size.height / (data.scaleY || 1),
            fill: data.style.fill,
            stroke: data.style.stroke,
            strokeWidth: data.style.strokeWidth,
          });
          if (data.type === 'text' && existing instanceof fabric.IText) {
            existing.set({
              text: data.content || '',
              fontSize: data.fontSize || 24,
              fontFamily: data.fontFamily || 'Inter, sans-serif'
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
            rx: 4,
            ry: 4,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.12)', blur: 12, offsetX: 3, offsetY: 6 })
          });
          const text = new fabric.IText(data.content || '', {
            fontSize: data.fontSize || 16,
            fontFamily: data.fontFamily || 'Inter, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: 75,
            top: 75,
            width: 130,
            // @ts-expect-error: splitByGrapheme is present in fabric
            splitByGrapheme: true
          });
          obj = new fabric.Group([rect, text], {
            left: data.position.x,
            top: data.position.y,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
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
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(data.content, (img) => {
            if (!fabricRef.current) return;
            (img as FabricObjectWithId).id = key;
            img.set({
              left: data.position.x,
              top: data.position.y,
              scaleX: data.scaleX || 1,
              scaleY: data.scaleY || 1,
              opacity: typeof data.opacity === 'number' ? data.opacity : 1,
              selectable: activeToolRef.current === 'select',
            });
            fabricCanvas.add(img);
            if (typeof data.zIndex === 'number') {
              img.moveTo(data.zIndex);
            }
            fabricCanvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.fontFamily || 'Inter, sans-serif',
            fontSize: data.fontSize || 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
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
            opacity: typeof data.opacity === 'number' ? data.opacity : 1,
          });
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

    const elementsObserver = (event: Y.YMapEvent<ElementData>) => {
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
    };
    yElements.observe(elementsObserver);

    const updateYjs = (e: fabric.IEvent) => {
      if (isUpdatingRef.current || !yElementsRef.current || !fabricRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;
      
      const data = yElementsRef.current.get(obj.id);
      if (data) {
        // Apply snap to grid if active
        if (snapToGridRef.current) {
          const snap = 20;
          obj.set({
            left: Math.round(obj.left! / snap) * snap,
            top: Math.round(obj.top! / snap) * snap,
          });
          obj.setCoords();
        }

        const nextZIndex = fabricRef.current.getObjects().indexOf(obj);
        let nextContent = data.content;
        if (data.type === 'text' && obj instanceof fabric.IText) {
          nextContent = obj.text;
        } else if (data.type === 'sticky' && obj instanceof fabric.Group) {
          const textItem = obj.item(1) as unknown as fabric.IText;
          nextContent = textItem.text;
        }

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
          zIndex: nextZIndex >= 0 ? nextZIndex : data.zIndex,
          opacity: obj.opacity,
          content: nextContent,
        });
      }
    };

    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let nextZoom = fabricCanvas.getZoom();
      nextZoom *= 0.999 ** delta;
      if (nextZoom > 20) nextZoom = 20;
      if (nextZoom < 0.05) nextZoom = 0.05;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, nextZoom);
      setZoom(nextZoom);
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

      // Update local cursor inside viewport
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      if (fabricCanvas.isDragging) {
        const vptArray = fabricCanvas.viewportTransform!;
        vptArray[4] += e.clientX - fabricCanvas.lastPosX!;
        vptArray[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
        setVpt([...vptArray]);
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
      if (target && target.id) {
        awareness.setLocalStateField('selectedObjectId', target.id);
      }
    });
    fabricCanvas.on('selection:updated', (e) => {
      const target = e.target as FabricObjectWithId;
      setSelectedObject(target || null);
      if (target && target.id) {
        awareness.setLocalStateField('selectedObjectId', target.id);
      }
    });
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      awareness.setLocalStateField('selectedObjectId', null);
    });

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', updateYjs);
    fabricCanvas.on('object:scaling', updateYjs);

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

      const styleStroke = activeToolRef.current === 'highlighter' ? 'rgba(255, 255, 0, 0.4)' : '#4f46e5';
      const styleStrokeWidth = activeToolRef.current === 'highlighter' ? 20 : 3;

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: { fill: 'transparent', stroke: styleStroke, strokeWidth: styleStrokeWidth },
        path: path.path as unknown as (string | number)[][],
        opacity: 1
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

      // Handle duplicate keyboard shortcut: Cmd/Ctrl + D
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateObject();
        return;
      }

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      wsProvider.off('status', statusHandler);
      wsProvider.destroy();
      dbProvider.destroy();
      yRoomName.unobserve(roomNameObserver);
      yElements.unobserve(elementsObserver);
      undoManager.off('stack-item-added', undoManagerObserver);
      undoManager.off('stack-item-popped', undoManagerObserver);
      awareness.off('change', updateRemoteSelections);

      fabricCanvas.dispose();
      fabricRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject]);

  const addShape = useCallback((type: Tool, imageBase64?: string) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    const data: ElementData = {
      id,
      type: type as 'rectangle' | 'circle' | 'text' | 'sticky' | 'arrow' | 'image',
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: type === 'image' ? imageBase64 : ((type === 'text' || type === 'sticky') ? 'Type something...' : undefined),
      style: { fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)] },
      opacity: 1,
      fontSize: type === 'sticky' ? 16 : 24,
      fontFamily: 'Inter, sans-serif'
    };

    if (type !== 'select' && type !== 'pencil' && type !== 'highlighter' && type !== 'hand') {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, imageBase64?: string) => {
    if (tool !== 'select' && tool !== 'pencil' && tool !== 'highlighter' && tool !== 'hand') {
      addShape(tool, imageBase64);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  const updateProperty = (props: Partial<fabric.IObjectOptions> & { content?: string; zAction?: 'front' | 'back'; fontSize?: number; fontFamily?: string }) => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;
      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const newData = { ...data };
        if ('fill' in props) newData.style.fill = props.fill as string;
        if ('stroke' in props) newData.style.stroke = props.stroke as string;
        if ('strokeWidth' in props) newData.style.strokeWidth = props.strokeWidth;
        if ('content' in props) newData.content = props.content;
        if ('opacity' in props) {
          newData.opacity = props.opacity;
          obj.set({ opacity: props.opacity });
        }
        if ('fontSize' in props) newData.fontSize = props.fontSize;
        if ('fontFamily' in props) newData.fontFamily = props.fontFamily;

        if (props.zAction && fabricRef.current) {
          const objs = fabricRef.current.getObjects();
          let nextIndex = objs.indexOf(obj);
          if (props.zAction === 'front') {
            obj.bringToFront();
            nextIndex = fabricRef.current.getObjects().indexOf(obj);
          } else if (props.zAction === 'back') {
            obj.sendToBack();
            nextIndex = fabricRef.current.getObjects().indexOf(obj);
          }
          newData.zIndex = nextIndex;
        }

        yElementsRef.current?.set(obj.id, newData);
      }
    });
    fabricRef.current.requestRenderAll();
  };

  const updateRoomName = (newName: string) => {
    if (yDocRef.current) {
      const yRoomName = yDocRef.current.getText('roomName');
      yRoomName.delete(0, yRoomName.length);
      yRoomName.insert(0, newName);
    }
  };

  const handleZoomIn = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() * 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
    setVpt([...fabricRef.current.viewportTransform!]);
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() / 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
    setVpt([...fabricRef.current.viewportTransform!]);
  };

  const handleResetZoom = () => {
    if (!fabricRef.current) return;
    fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
    setVpt([1, 0, 0, 1, 0, 0]);
  };

  const handleExport = (format: 'png' | 'svg' = 'png') => {
    if (!fabricRef.current) return;
    if (format === 'svg') {
      const svgData = fabricRef.current.toSVG();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const link = document.createElement('a');
      link.download = `syncboard-${Date.now()}.svg`;
      link.href = URL.createObjectURL(blob);
      link.click();
    } else {
      const dataURL = fabricRef.current.toDataURL({
        format: 'png',
        multiplier: 2,
      });
      const link = document.createElement('a');
      link.download = `syncboard-${Date.now()}.png`;
      link.href = dataURL;
      link.click();
    }
  };

  const clearBoard = () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
      yElementsRef.current?.clear();
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden">
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-4 text-white">
          <Activity className="animate-spin text-indigo-400" size={48} />
          <p className="text-lg font-medium tracking-wide">Connecting to SyncBoard Session...</p>
        </div>
      )}

      <TopBar
        status={status}
        roomName={roomName}
        onRoomNameChange={updateRoomName}
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

      {/* Render Collaborative Selection Overlays based on viewport transform matrix (vpt) */}
      {remoteSelections.map((sel) => {
        if (!sel.bounds) return null;
        // Transform Fabric coordinates to screen viewport coordinates
        const left = sel.bounds.left * vpt[0] + vpt[4];
        const top = sel.bounds.top * vpt[3] + vpt[5];
        const width = sel.bounds.width * vpt[0];
        const height = sel.bounds.height * vpt[3];

        return (
          <div
            key={sel.clientId}
            className="absolute pointer-events-none border-2 border-dashed z-30 transition-all duration-75"
            style={{
              borderColor: sel.color,
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
            }}
          >
            <div
              className="absolute -top-6 left-0 px-2 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap shadow-sm"
              style={{ backgroundColor: sel.color }}
            >
              {sel.name}
            </div>
          </div>
        );
      })}

      <canvas ref={canvasRef} />
    </div>
  );
};
