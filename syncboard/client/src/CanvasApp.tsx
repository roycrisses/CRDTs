/**
 * AUDIT LOG & REVISION HISTORY
 * ----------------------------
 * Date: Daily Check Ref
 * Author: Jules (AI Assistant)
 * Description: Completed structural security review (PROTECTION_REVIEW.md). Expanded whiteboard
 * capability to mimic full Figma Jam / Miro experiences.
 * Enhancements:
 *  - Styled TopBar, Toolbar, PropertyMenu, and ZoomControls with enhanced Glassmorphism (blur-2xl, semi-transparent borders).
 *  - Added support for Triangle, Diamond, and Base64 Images rendering and resizing.
 *  - Integrated null-safe image rendering logic in Fabric.js from base64 strings with CORS support.
 *  - Implemented persistent Highlighter (yellow brush) and transient Laser Pointer with local fading trails.
 *  - Created real-time collaborative Room Name editing and local User Profile customization synced via Yjs awareness.
 *  - Added Emoji Stamp tool supporting collaborative placement of visual stamp elements.
 *  - Integrated Snap to Grid alignment with a grid helper layout toggled programmatically.
 *  - Added element duplication functionality via keyboard shortcut (Cmd/Ctrl+D) and standard toolbar triggers.
 *  - Added layer order management (Bring to Front / Send to Back) directly synced to Yjs element collections.
 *  - Implemented client-side loading overlay featuring a pulsing Activity spinner when connections are initialized.
 *  - Supported multi-user remote selection indicators drawing boundary lines and labels around active user selections.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { Awareness } from 'y-protocols/awareness';
import { Activity } from 'lucide-react';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { CursorsLayer } from './components/CursorsLayer';
import { ZoomControls } from './components/ZoomControls';
import { PropertyMenu } from './components/PropertyMenu';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'path' | 'arrow' | 'image' | 'stamp';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number };
  path?: (string | number)[][];
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
};

export interface FabricObjectWithId extends fabric.Object {
  id?: string;
}

export interface FabricCanvasExtended extends fabric.Canvas {
  isDragging?: boolean;
  lastPosX?: number;
  lastPosY?: number;
}

interface RemoteSelection {
  left: number;
  top: number;
  width: number;
  height: number;
  name: string;
  color: string;
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
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [roomName, setRoomName] = useState('Main Workspace');
  const [localUser, setLocalUser] = useState({ name: USER_NAME, color: USER_COLOR });
  const [snapToGrid, setSnapToGrid] = useState(false);

  const [remoteUsers, setRemoteUsers] = useState<
    { id: number; name: string; color: string; cursor?: { x: number; y: number }; selectedId?: string; laser?: { x: number; y: number; isDrawing: boolean } }[]
  >([]);

  const [remoteSelections, setRemoteSelections] = useState<{ [id: number]: RemoteSelection }>({});

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const selectedStampRef = useRef<string>('👍');
  const snapToGridRef = useRef(false);

  // Sync refs for event handlers to prevent closure stale states
  useEffect(() => {
    activeToolRef.current = activeTool;
    if (fabricRef.current) {
      const isDrawing = activeTool === 'pencil' || activeTool === 'highlighter';
      fabricRef.current.isDrawingMode = isDrawing;
      fabricRef.current.selection = activeTool === 'select';
      fabricRef.current.defaultCursor =
        activeTool === 'select' ? 'default' : activeTool === 'hand' ? 'grab' : 'crosshair';

      // Set up drawing brush parameters
      if (isDrawing && fabricRef.current.freeDrawingBrush) {
        if (activeTool === 'pencil') {
          fabricRef.current.freeDrawingBrush.color = '#4f46e5';
          fabricRef.current.freeDrawingBrush.width = 3;
        } else if (activeTool === 'highlighter') {
          fabricRef.current.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.4)';
          fabricRef.current.freeDrawingBrush.width = 20;
        }
      }

      // Disable object selection unless in select mode
      fabricRef.current.getObjects().forEach((obj) => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || isDrawing;
      });
      fabricRef.current.renderAll();
    }
  }, [activeTool]);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Synchronize localUser changes to Yjs awareness
  useEffect(() => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', {
        name: localUser.name,
        color: localUser.color,
      });
    }
  }, [localUser]);

  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObject = fabricRef.current.getActiveObject();
    if (!activeObject) return;

    const objectsToDuplicate =
      activeObject instanceof fabric.ActiveSelection ? activeObject.getObjects() : [activeObject];

    objectsToDuplicate.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;
      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const id = crypto.randomUUID();
        const duplicatedData: ElementData = {
          ...data,
          id,
          position: { x: data.position.x + 30, y: data.position.y + 30 },
          zIndex: fabricRef.current!.getObjects().length,
        };
        yElementsRef.current?.set(id, duplicatedData);
      }
    });
  }, []);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    if (yRoomName.toString() === '') {
      yRoomName.insert(0, 'Main Workspace');
    } else {
      setTimeout(() => setRoomName(yRoomName.toString()), 0);
    }

    yRoomName.observe(() => {
      setRoomName(yRoomName.toString());
    });

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

    const dbProvider = new IndexeddbPersistence('syncboard-v3', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awarenessRef.current = awareness;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    }) as FabricCanvasExtended;
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string): FabricObjectWithId | undefined =>
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    // Calculate and update absolute coordinates of remote users' selected items securely outside render
    const updateRemoteSelections = () => {
      const states = awareness.getStates();
      const selectionsMap: { [id: number]: RemoteSelection } = {};

      states.forEach((state: Record<string, unknown>, clientID) => {
        if (clientID !== ydoc.clientID) {
          const user = state.user as { name: string; color: string } | undefined;
          const selectedId = state.selectedId as string | undefined;
          if (user && selectedId) {
            const obj = fabricCanvas.getObjects().find((o: FabricObjectWithId) => o.id === selectedId);
            if (obj) {
              const rect = obj.getBoundingRect(true);
              const vpt = fabricCanvas.viewportTransform!;
              selectionsMap[clientID] = {
                left: rect.left * vpt[0] + vpt[4],
                top: rect.top * vpt[3] + vpt[5],
                width: rect.width * vpt[0],
                height: rect.height * vpt[3],
                name: user.name,
                color: user.color,
              };
            }
          }
        }
      });
      setRemoteSelections(selectionsMap);
    };

    awareness.on('change', () => {
      const states = awareness.getStates();
      const users: { id: number; name: string; color: string; cursor?: { x: number; y: number }; selectedId?: string; laser?: { x: number; y: number; isDrawing: boolean } }[] = [];
      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
            selectedId: state.selectedId as string | undefined,
            laser: state.laser as { x: number; y: number; isDrawing: boolean } | undefined,
          });
        }
      });
      setRemoteUsers(users);
      updateRemoteSelections();
    });

    const upsertFabricObject = (key: string, data: ElementData) => {
      const existing = findObjectById(key);
      if (existing) {
        if (data.type === 'path' && (existing as unknown as fabric.Path).path) return;

        const commonProps = {
          left: data.position.x,
          top: data.position.y,
          scaleX: data.scaleX || 1,
          scaleY: data.scaleY || 1,
        };

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rect = existing.item(0) as fabric.Rect;
          const text = existing.item(1) as unknown as fabric.IText;
          existing.set(commonProps);
          rect.set({ fill: data.style.fill });
          text.set({ text: data.content });
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          const line = existing.item(0) as unknown as fabric.Line;
          const tip = existing.item(1) as unknown as fabric.Triangle;
          existing.set(commonProps);
          line.set({ stroke: data.style.fill });
          tip.set({ fill: data.style.fill });
        } else if (data.type === 'image') {
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
            existing.set({ text: data.content });
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
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 }),
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
            splitByGrapheme: true,
          });
          obj = new fabric.Group([rect, text], {
            left: data.position.x,
            top: data.position.y,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
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
          });
        } else if (data.type === 'rectangle') {
          obj = new fabric.Rect({
            left: data.position.x,
            top: data.position.y,
            width: data.size.width,
            height: data.size.height,
            fill: data.style.fill,
            rx: 8,
            ry: 8,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x,
            top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'triangle') {
          obj = new fabric.Triangle({
            left: data.position.x,
            top: data.position.y,
            width: data.size.width,
            height: data.size.height,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'diamond') {
          const halfW = data.size.width / 2;
          const halfH = data.size.height / 2;
          const points = [
            { x: halfW, y: 0 },
            { x: data.size.width, y: halfH },
            { x: halfW, y: data.size.height },
            { x: 0, y: halfH },
          ];
          obj = new fabric.Polygon(points, {
            left: data.position.x,
            top: data.position.y,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x,
            top: data.position.y,
            fill: data.style.fill,
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'stamp') {
          obj = new fabric.IText(data.content || '👍', {
            left: data.position.x,
            top: data.position.y,
            fontSize: 40,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(
            data.content,
            (img) => {
              if (!img) return; // Null-safety check!
              img.set({
                left: data.position.x,
                top: data.position.y,
                scaleX: data.scaleX || (data.size.width ? data.size.width / img.width! : 1),
                scaleY: data.scaleY || (data.size.height ? data.size.height / img.height! : 1),
              });
              (img as FabricObjectWithId).id = key;
              img.selectable = activeToolRef.current === 'select';
              fabricCanvas.add(img);
              if (typeof data.zIndex === 'number') {
                img.moveTo(data.zIndex);
              }
              fabricCanvas.renderAll();
            },
            { crossOrigin: 'anonymous' }
          );
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
      if (isUpdatingRef.current || !yElementsRef.current || !fabricRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;

      const data = yElementsRef.current.get(obj.id);
      if (data) {
        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: obj.left!, y: obj.top! },
          size: {
            width: obj.width!,
            height: obj.height!,
            radius: (obj as fabric.Circle).radius,
          },
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          zIndex: fabricRef.current.getObjects().indexOf(obj),
          content: (obj as fabric.IText).text || data.content,
        });
      }
    };

    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoomVal = fabricCanvas.getZoom();
      zoomVal *= 0.999 ** delta;
      if (zoomVal > 20) zoomVal = 20;
      if (zoomVal < 0.05) zoomVal = 0.05;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoomVal);
      setZoom(zoomVal);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      const tool = activeToolRef.current;

      // Handle Emoji Stamp placements
      if (tool === 'stamp') {
        const pointer = fabricCanvas.getPointer(opt.e);
        const id = crypto.randomUUID();
        const data: ElementData = {
          id,
          type: 'stamp',
          position: { x: pointer.x - 20, y: pointer.y - 20 },
          size: { width: 40, height: 40 },
          content: selectedStampRef.current,
          style: { fill: '#000000' },
        };
        yElementsRef.current?.set(id, data);
        return;
      }

      if (
        evt.altKey === true ||
        tool === 'hand' ||
        (tool === 'select' && !fabricCanvas.getActiveObject())
      ) {
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;
      const pointer = fabricCanvas.getPointer(e);

      // Sync local cursor and transient actions via awareness
      const awarenessData: Record<string, unknown> = {
        cursor: { x: e.clientX, y: e.clientY },
      };

      if (activeToolRef.current === 'laser') {
        awarenessData.laser = { x: pointer.x, y: pointer.y, isDrawing: true };

        // Render beautiful local fading laser dots
        const laserPoint = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 5,
          fill: '#ef4444',
          shadow: new fabric.Shadow({ color: 'rgba(239, 68, 68, 0.6)', blur: 8 }),
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        fabricCanvas.add(laserPoint);
        laserPoint.animate('opacity', 0, {
          duration: 600,
          onChange: fabricCanvas.renderAll.bind(fabricCanvas),
          onComplete: () => {
            fabricCanvas.remove(laserPoint);
          },
        });
      }

      awareness.setLocalStateField('cursor', awarenessData.cursor);
      if (awarenessData.laser) {
        awareness.setLocalStateField('laser', awarenessData.laser);
      }

      if (fabricCanvas.isDragging) {
        const vpt = fabricCanvas.viewportTransform!;
        vpt[4] += e.clientX - fabricCanvas.lastPosX!;
        vpt[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
      }
    });

    fabricCanvas.on('mouse:up', () => {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform!);
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
    });

    fabricCanvas.on('selection:created', (e) => {
      const activeObj = e.target || null;
      setSelectedObject(activeObj);
      awareness.setLocalStateField('selectedId', activeObj ? (activeObj as FabricObjectWithId).id : null);
    });

    fabricCanvas.on('selection:updated', (e) => {
      const activeObj = e.target || null;
      setSelectedObject(activeObj);
      awareness.setLocalStateField('selectedId', activeObj ? (activeObj as FabricObjectWithId).id : null);
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      awareness.setLocalStateField('selectedId', null);
    });

    // Snap to grid support
    fabricCanvas.on('object:moving', (e) => {
      if (snapToGridRef.current && e.target) {
        const grid = 20;
        e.target.set({
          left: Math.round(e.target.left! / grid) * grid,
          top: Math.round(e.target.top! / grid) * grid,
        });
      }
      updateYjs(e);
    });

    fabricCanvas.on('object:scaling', updateYjs);
    fabricCanvas.on('object:modified', updateYjs);

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

      const brushColor = fabricCanvas.freeDrawingBrush?.color || '#4f46e5';
      const brushWidth = fabricCanvas.freeDrawingBrush?.width || 3;

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: { fill: 'transparent', stroke: brushColor, strokeWidth: brushWidth },
        path: path.path as unknown as (string | number)[][],
      };

      yElementsRef.current?.set(id, data);
    });

    fabricCanvas.on('after:render', updateRemoteSelections);

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
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        duplicateObject();
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
      } else if (e.key.toLowerCase() === 'l') {
        setActiveTool('laser');
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
  }, [duplicateObject]);

  const addShape = useCallback((type: Tool) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    const data: ElementData = {
      id,
      type: type as ElementData['type'],
      position: { x: center.x - 50, y: center.y - 40 },
      size:
        type === 'sticky'
          ? { width: 150, height: 150 }
          : type === 'circle'
          ? { width: 80, height: 80, radius: 40 }
          : { width: 120, height: 80 },
      content: type === 'text' || type === 'sticky' ? 'Type something...' : undefined,
      style: {
        fill:
          type === 'sticky'
            ? stickyColors[Math.floor(Math.random() * stickyColors.length)]
            : COLORS[Math.floor(Math.random() * COLORS.length)],
      },
    };

    yElementsRef.current.set(id, data);
  }, []);

  const handleToolChange = (tool: Tool, content?: string) => {
    if (tool === 'image' && content) {
      if (!yElementsRef.current || !fabricRef.current) return;
      const center = fabricRef.current.getVpCenter();
      const id = crypto.randomUUID();
      const data: ElementData = {
        id,
        type: 'image',
        position: { x: center.x - 100, y: center.y - 100 },
        size: { width: 200, height: 200 },
        content,
        style: { fill: 'transparent' },
      };
      yElementsRef.current.set(id, data);
      setActiveTool('select');
    } else if (tool === 'stamp' && content) {
      selectedStampRef.current = content;
      setActiveTool('stamp');
    } else if (
      tool !== 'select' &&
      tool !== 'pencil' &&
      tool !== 'hand' &&
      tool !== 'highlighter' &&
      tool !== 'laser' &&
      tool !== 'stamp'
    ) {
      addShape(tool);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  const updateProperty = (
    props: Partial<fabric.IObjectOptions> & { content?: string; zAction?: 'front' | 'back' }
  ) => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;

      if ('zAction' in props) {
        if (props.zAction === 'front') {
          obj.bringToFront();
        } else {
          obj.sendToBack();
        }
        // Sync full ordering of layers to Yjs
        const canvasObjects = fabricRef.current!.getObjects();
        canvasObjects.forEach((co: FabricObjectWithId, idx) => {
          if (co.id) {
            const coData = yElementsRef.current?.get(co.id);
            if (coData && coData.zIndex !== idx) {
              yElementsRef.current?.set(co.id, { ...coData, zIndex: idx });
            }
          }
        });
        return;
      }

      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const newData = { ...data };
        if ('fill' in props) newData.style.fill = props.fill as string;
        if ('stroke' in props) newData.style.stroke = props.stroke as string;
        if ('strokeWidth' in props) newData.style.strokeWidth = props.strokeWidth;
        if ('content' in props) newData.content = props.content;
        yElementsRef.current?.set(obj.id, newData);
      }
    });
    fabricRef.current.requestRenderAll();
  };

  const handleRoomNameChange = (newName: string) => {
    if (ydocRef.current) {
      const yRoomName = ydocRef.current.getText('roomName');
      ydocRef.current.transact(() => {
        yRoomName.delete(0, yRoomName.length);
        yRoomName.insert(0, newName);
      });
    }
  };

  const handleUpdateLocalUser = (name: string, color: string) => {
    const updated = { name, color };
    setLocalUser(updated);
  };

  const handleZoomIn = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() * 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() / 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
  };

  const handleResetZoom = () => {
    if (!fabricRef.current) return;
    fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
  };

  const handleExport = () => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: 'png',
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `syncboard-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const clearBoard = () => {
    if (confirm('Are you sure you want to clear the entire board?')) {
      yElementsRef.current?.clear();
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden body">
      {/* Pulsing Loading Overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-indigo-200 shadow-2xl animate-bounce">
            <Activity className="text-white animate-spin" size={32} />
          </div>
          <p className="text-sm font-extrabold text-indigo-950 animate-pulse uppercase tracking-widest">
            Connecting Workspace...
          </p>
        </div>
      )}

      {/* Grid Alignment Helper */}
      {snapToGrid && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:20px_20px] z-10" />
      )}

      <TopBar
        status={status}
        roomName={roomName}
        onRoomNameChange={handleRoomNameChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExport={handleExport}
        users={remoteUsers}
        localUser={localUser}
        onUpdateLocalUser={handleUpdateLocalUser}
      />

      <Toolbar activeTool={activeTool} setActiveTool={handleToolChange} onClear={clearBoard} />

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetZoom}
      />

      {/* Grid Alignment Toggle Panel */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2 p-1.5 bg-white/90 backdrop-blur-2xl rounded-xl shadow-2xl border border-slate-200/50 z-50">
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            snapToGrid
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Snap elements to a 20px layout grid"
        >
          Grid Snap: {snapToGrid ? 'ON' : 'OFF'}
        </button>
      </div>

      <PropertyMenu selectedObject={selectedObject} onUpdate={updateProperty} />

      {/* Multi-User remote selection highlights overlay */}
      <div className="absolute inset-0 pointer-events-none z-30">
        {Object.entries(remoteSelections).map(([clientIDStr, sel]) => {
          const clientID = Number(clientIDStr);
          return (
            <div
              key={clientID}
              className="absolute border-2 border-dashed transition-all duration-75 animate-in fade-in zoom-in duration-150"
              style={{
                left: sel.left - 4,
                top: sel.top - 4,
                width: sel.width + 8,
                height: sel.height + 8,
                borderColor: sel.color,
              }}
            >
              <span
                className="absolute -top-6 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap shadow-sm"
                style={{ backgroundColor: sel.color }}
              >
                {sel.name} selecting
              </span>
            </div>
          );
        })}
      </div>

      <CursorsLayer users={remoteUsers} />

      <canvas ref={canvasRef} />
    </div>
  );
};
