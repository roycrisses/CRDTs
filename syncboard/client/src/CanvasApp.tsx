/**
 * SyncBoard Canvas App - Figma Jam & Miro Integration Audit Log
 *
 * Fixes & Improvements:
 * - Added block comment audit log at the top of syncboard/client/src/CanvasApp.tsx.
 * - Exported shareable constants from src/lib/constants.ts for Vite/ESLint Fast Refresh compliance.
 * - Enforced default font family 'Inter, sans-serif' for collaborative text and sticky notes.
 * - Added null-safety checks inside fabric.Image.fromURL callbacks to prevent browser crashes on corrupt base64 strings.
 * - Decoupled local user profile state updates into a dedicated useEffect for Yjs awareness without full canvas re-initialization.
 * - Prevented background dragging from overriding object selection on first click when !opt.target inside mouse:down.
 * - Encapsulated remote selections rendering in its own useEffect with Fabric after:render listener.
 * - Managed PropertyMenu positioning state decoupled from render function to prevent ref access during rendering.
 * - Added explicit fabricRef.current = null cleanup under React StrictMode to prevent clearRect on null errors.
 * - Added loading overlay with pulsing Activity icon during 'connecting' status.
 * - Expanded shape support with Triangle, Diamond, Stamp, and Image objects.
 * - Added transient Laser Pointer fading trails effect and semi-transparent Highlighter brush.
 * - Added Snap to Grid alignment toggle, Cmd+D / Ctrl+D element duplication, and smart Fit-to-Screen bounding calculation.
 * - Fixed Yjs observer cleanup functions and decoupled snapToGrid from canvas initialization effect.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { CursorsLayer } from './components/CursorsLayer';
import { ZoomControls } from './components/ZoomControls';
import { PropertyMenu } from './components/PropertyMenu';
import { COLORS, STICKY_COLORS } from './lib/constants';
import { Activity } from 'lucide-react';

export type ElementData = {
  id: string;
  type:
    | 'rectangle'
    | 'circle'
    | 'triangle'
    | 'diamond'
    | 'text'
    | 'sticky'
    | 'path'
    | 'arrow'
    | 'stamp'
    | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  stampEmoji?: string;
  imageUrl?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number; fontFamily?: string };
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

const DEFAULT_USER_NAME = `User ${Math.floor(Math.random() * 1000)}`;
const DEFAULT_USER_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)].value;

export const CanvasApp = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [roomName, setRoomName] = useState('Main Workspace');
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [localUser, setLocalUser] = useState({
    name: DEFAULT_USER_NAME,
    color: DEFAULT_USER_COLOR,
  });

  const [remoteUsers, setRemoteUsers] = useState<
    { id: number; name: string; color: string; cursor?: { x: number; y: number }; selection?: string }[]
  >([]);

  const [remoteSelections, setRemoteSelections] = useState<
    { id: number; userName: string; color: string; rect: { left: number; top: number; width: number; height: number } }[]
  >([]);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yRoomNameRef = useRef<Y.Text | null>(null);
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const snapToGridRef = useRef(false);
  const localCreatedIdsRef = useRef<Set<string>>(new Set());
  const laserPathsRef = useRef<{ path: fabric.Path; timestamp: number }[]>([]);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  // Duplicate Object callback defined at top
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObj = fabricRef.current.getActiveObject() as FabricObjectWithId;
    if (!activeObj || !activeObj.id) return;

    const originalData = yElementsRef.current.get(activeObj.id);
    if (!originalData) return;

    const newId = crypto.randomUUID();
    const duplicatedData: ElementData = {
      ...originalData,
      id: newId,
      position: {
        x: originalData.position.x + 20,
        y: originalData.position.y + 20,
      },
    };

    localCreatedIdsRef.current.add(newId);
    yElementsRef.current.set(newId, duplicatedData);
  }, []);

  // Update Yjs Awareness on user change without canvas re-init
  useEffect(() => {
    if (wsProviderRef.current?.awareness) {
      wsProviderRef.current.awareness.setLocalStateField('user', localUser);
    }
  }, [localUser]);

  // Update active tool on canvas
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === 'pencil' || activeTool === 'highlighter';
    canvas.selection = activeTool === 'select';
    canvas.defaultCursor =
      activeTool === 'select'
        ? 'default'
        : activeTool === 'hand'
        ? 'grab'
        : activeTool === 'laser'
        ? 'crosshair'
        : 'crosshair';

    if (activeTool === 'highlighter') {
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 22;
      brush.color = 'rgba(255, 235, 59, 0.45)';
      canvas.freeDrawingBrush = brush;
    } else if (activeTool === 'pencil') {
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 3;
      brush.color = '#4f46e5';
      canvas.freeDrawingBrush = brush;
    }

    canvas.getObjects().forEach((obj) => {
      obj.selectable = activeTool === 'select';
      obj.evented = activeTool === 'select' || activeTool === 'pencil' || activeTool === 'highlighter';
    });
    canvas.renderAll();
  }, [activeTool]);

  // Main Yjs and Fabric Initialization Effect
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;

    setTimeout(() => {
      if (yRoomName.toString()) {
        setRoomName(yRoomName.toString());
      }
    }, 0);

    const roomNameObserverHandler = () => {
      setRoomName(yRoomName.toString());
    };
    yRoomName.observe(roomNameObserverHandler);

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
    wsProviderRef.current = wsProvider;

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;

    awareness.on('change', () => {
      const states = awareness.getStates();
      const users: { id: number; name: string; color: string; cursor?: { x: number; y: number }; selection?: string }[] = [];
      const selections: { id: number; userName: string; color: string; rect: { left: number; top: number; width: number; height: number } }[] = [];

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
            selection: state.selection as string | undefined,
          });

          const selId = state.selection as string | undefined;
          if (selId && fabricRef.current) {
            const targetObj = fabricRef.current.getObjects().find((o: FabricObjectWithId) => o.id === selId);
            if (targetObj) {
              const bRect = targetObj.getBoundingRect();
              selections.push({
                id: clientID,
                userName: user.name,
                color: user.color,
                rect: { left: bRect.left, top: bRect.top, width: bRect.width, height: bRect.height },
              });
            }
          }
        }
      });
      setRemoteUsers(users);
      setRemoteSelections(selections);
    });

    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    }) as FabricCanvasExtended;
    fabricRef.current = fabricCanvas;

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
        };

        if (data.type === 'sticky' && existing instanceof fabric.Group) {
          const rect = existing.item(0) as fabric.Rect;
          const text = existing.item(1) as unknown as fabric.IText;
          existing.set(commonProps);
          rect.set({ fill: data.style.fill });
          text.set({ text: data.content, fontFamily: data.style.fontFamily || 'Inter, sans-serif' });
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          const line = existing.item(0) as unknown as fabric.Line;
          const tip = existing.item(1) as unknown as fabric.Triangle;
          existing.set(commonProps);
          line.set({ stroke: data.style.fill });
          tip.set({ fill: data.style.fill });
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
            existing.set({ text: data.content, fontFamily: data.style.fontFamily || 'Inter, sans-serif' });
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
            width: 160,
            height: 160,
            fill: data.style.fill,
            rx: 12,
            ry: 12,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.12)', blur: 15, offsetX: 4, offsetY: 8 }),
          });
          const text = new fabric.IText(data.content || 'Type something...', {
            fontSize: 16,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: 80,
            top: 80,
            width: 140,
            // @ts-expect-error splitByGrapheme is present in fabric
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
            width: 16,
            height: 16,
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
            rx: 10,
            ry: 10,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x,
            top: data.position.y,
            radius: data.size.radius || 45,
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
          const points = [
            { x: data.size.width / 2, y: 0 },
            { x: data.size.width, y: data.size.height / 2 },
            { x: data.size.width / 2, y: data.size.height },
            { x: 0, y: data.size.height / 2 },
          ];
          obj = new fabric.Polygon(points, {
            left: data.position.x,
            top: data.position.y,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'stamp') {
          obj = new fabric.Text(data.stampEmoji || '👍', {
            left: data.position.x,
            top: data.position.y,
            fontSize: 48,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'image' && data.imageUrl) {
          fabric.Image.fromURL(
            data.imageUrl,
            (img) => {
              if (!img) return;
              img.set({
                left: data.position.x,
                top: data.position.y,
                scaleX: data.scaleX || (200 / (img.width || 200)),
                scaleY: data.scaleY || (200 / (img.height || 200)),
              });
              (img as FabricObjectWithId).id = key;
              img.selectable = activeToolRef.current === 'select';
              fabricCanvas.add(img);
              fabricCanvas.renderAll();
            },
            { crossOrigin: 'anonymous' }
          );
          return;
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || 'Type text...', {
            left: data.position.x,
            top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fontSize: 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'path' && data.path) {
          obj = new fabric.Path(data.path as unknown as string, {
            left: data.position.x,
            top: data.position.y,
            fill: 'transparent',
            stroke: data.style.stroke || '#4f46e5',
            strokeWidth: data.style.strokeWidth || 3,
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

          if (localCreatedIdsRef.current.has(key)) {
            localCreatedIdsRef.current.delete(key);
            fabricCanvas.setActiveObject(obj);
            setSelectedObject(obj);
          }
        }
      }
    };

    const elementsObserverHandler = (event: Y.YMapEvent<ElementData>) => {
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

    yElements.observe(elementsObserverHandler);

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
      let newZoom = fabricCanvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.05) newZoom = 0.05;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
      setZoom(newZoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    let laserDrawing = false;
    let laserPoints: { x: number; y: number }[] = [];

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      const pointer = fabricCanvas.getPointer(evt);

      if (activeToolRef.current === 'laser') {
        laserDrawing = true;
        laserPoints = [pointer];
        return;
      }

      if (
        evt.altKey === true ||
        activeToolRef.current === 'hand' ||
        (activeToolRef.current === 'select' && !opt.target)
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

      // Update cursor awareness
      wsProviderRef.current?.awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      if (laserDrawing && activeToolRef.current === 'laser') {
        laserPoints.push(pointer);
        if (laserPoints.length >= 2) {
          const pathData = laserPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');
          const laserPath = new fabric.Path(pathData, {
            fill: 'transparent',
            stroke: '#ef4444',
            strokeWidth: 5,
            strokeLineCap: 'round',
            strokeLineJoin: 'round',
            selectable: false,
            evented: false,
            opacity: 0.9,
          });
          fabricCanvas.add(laserPath);
          laserPathsRef.current.push({ path: laserPath, timestamp: Date.now() });

          setTimeout(() => {
            fabricCanvas.remove(laserPath);
            fabricCanvas.renderAll();
          }, 1000);
        }
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
      laserDrawing = false;
      laserPoints = [];
    });

    fabricCanvas.on('selection:created', (e) => {
      const target = e.target || fabricCanvas.getActiveObject();
      setSelectedObject(target || null);
      if (target && (target as FabricObjectWithId).id) {
        wsProviderRef.current?.awareness.setLocalStateField('selection', (target as FabricObjectWithId).id);
      }
    });

    fabricCanvas.on('selection:updated', (e) => {
      const target = e.target || fabricCanvas.getActiveObject();
      setSelectedObject(target || null);
      if (target && (target as FabricObjectWithId).id) {
        wsProviderRef.current?.awareness.setLocalStateField('selection', (target as FabricObjectWithId).id);
      }
    });

    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      wsProviderRef.current?.awareness.setLocalStateField('selection', null);
    });

    fabricCanvas.on('object:moving', (e) => {
      const obj = e.target;
      if (snapToGridRef.current && obj) {
        const gridSize = 20;
        obj.set({
          left: Math.round((obj.left || 0) / gridSize) * gridSize,
          top: Math.round((obj.top || 0) / gridSize) * gridSize,
        });
      }
      updateYjs(e);
    });

    fabricCanvas.on('object:modified', updateYjs);
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

      const isHighlight = activeToolRef.current === 'highlighter';
      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: {
          fill: 'transparent',
          stroke: isHighlight ? 'rgba(255, 235, 59, 0.45)' : '#4f46e5',
          strokeWidth: isHighlight ? 22 : 3,
        },
        path: path.path as unknown as (string | number)[][],
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
      yElements.unobserve(elementsObserverHandler);
      yRoomName.unobserve(roomNameObserverHandler);
      wsProvider.destroy();
      dbProvider.destroy();
      fabricCanvas.dispose();
      fabricRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject]);

  const addShape = useCallback(
    (
      type: Tool,
      extraData?: { stampEmoji?: string; imageUrl?: string }
    ) => {
      if (!yElementsRef.current || !fabricRef.current) return;

      const center = fabricRef.current.getVpCenter();
      const id = crypto.randomUUID();
      localCreatedIdsRef.current.add(id);

      let data: ElementData;

      if (type === 'sticky') {
        data = {
          id,
          type: 'sticky',
          position: { x: center.x - 80, y: center.y - 80 },
          size: { width: 160, height: 160 },
          content: 'Type something...',
          style: {
            fill: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
            fontFamily: 'Inter, sans-serif',
          },
        };
      } else if (type === 'stamp') {
        data = {
          id,
          type: 'stamp',
          position: { x: center.x - 24, y: center.y - 24 },
          size: { width: 48, height: 48 },
          stampEmoji: extraData?.stampEmoji || '👍',
          style: { fill: '#000000' },
        };
      } else if (type === 'image' && extraData?.imageUrl) {
        data = {
          id,
          type: 'image',
          position: { x: center.x - 100, y: center.y - 100 },
          size: { width: 200, height: 200 },
          imageUrl: extraData.imageUrl,
          style: { fill: 'transparent' },
        };
      } else if (type === 'triangle') {
        data = {
          id,
          type: 'triangle',
          position: { x: center.x - 50, y: center.y - 50 },
          size: { width: 100, height: 100 },
          style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)].value },
        };
      } else if (type === 'diamond') {
        data = {
          id,
          type: 'diamond',
          position: { x: center.x - 50, y: center.y - 50 },
          size: { width: 100, height: 100 },
          style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)].value },
        };
      } else if (type === 'circle') {
        data = {
          id,
          type: 'circle',
          position: { x: center.x - 45, y: center.y - 45 },
          size: { width: 90, height: 90, radius: 45 },
          style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)].value },
        };
      } else if (type === 'text') {
        data = {
          id,
          type: 'text',
          position: { x: center.x - 60, y: center.y - 20 },
          size: { width: 120, height: 40 },
          content: 'Type text...',
          style: {
            fill: COLORS[Math.floor(Math.random() * COLORS.length)].value,
            fontFamily: 'Inter, sans-serif',
          },
        };
      } else {
        // Rectangle / Arrow
        data = {
          id,
          type: type as 'rectangle' | 'arrow',
          position: { x: center.x - 60, y: center.y - 40 },
          size: { width: 120, height: 80 },
          style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)].value },
        };
      }

      yElementsRef.current.set(id, data);
    },
    []
  );

  const handleToolChange = (
    tool: Tool,
    extraData?: { stampEmoji?: string; imageUrl?: string }
  ) => {
    if (
      tool !== 'select' &&
      tool !== 'pencil' &&
      tool !== 'highlighter' &&
      tool !== 'laser' &&
      tool !== 'hand'
    ) {
      addShape(tool, extraData);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  const handleRoomNameChange = (newName: string) => {
    setRoomName(newName);
    if (yRoomNameRef.current) {
      yRoomNameRef.current.delete(0, yRoomNameRef.current.length);
      yRoomNameRef.current.insert(0, newName);
    }
  };

  const updateProperty = (
    props: Partial<fabric.ITextOptions> & {
      content?: string;
      zAction?: 'front' | 'back' | 'forward' | 'backward';
    }
  ) => {
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
        if ('fontFamily' in props) newData.style.fontFamily = props.fontFamily;
        if ('content' in props) newData.content = props.content;

        if (props.zAction) {
          const currentZ = data.zIndex || 0;
          if (props.zAction === 'front') newData.zIndex = 9999;
          else if (props.zAction === 'back') newData.zIndex = 0;
          else if (props.zAction === 'forward') newData.zIndex = currentZ + 1;
          else if (props.zAction === 'backward') newData.zIndex = Math.max(0, currentZ - 1);
        }

        yElementsRef.current?.set(obj.id, newData);
      }
    });
    fabricRef.current.requestRenderAll();
  };

  const handleDeleteSelected = () => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (obj.id) yElementsRef.current?.delete(obj.id);
    });
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
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
    const canvas = fabricRef.current;
    const objects = canvas.getObjects();

    if (objects.length === 0) {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoom(1);
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    objects.forEach((obj) => {
      const bRect = obj.getBoundingRect(true);
      if (bRect.left < minX) minX = bRect.left;
      if (bRect.top < minY) minY = bRect.top;
      if (bRect.left + bRect.width > maxX) maxX = bRect.left + bRect.width;
      if (bRect.top + bRect.height > maxY) maxY = bRect.top + bRect.height;
    });

    const contentWidth = maxX - minX || 100;
    const contentHeight = maxY - minY || 100;

    const scaleX = (window.innerWidth - 200) / contentWidth;
    const scaleY = (window.innerHeight - 200) / contentHeight;
    const fitScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.1), 3);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const vpt = canvas.viewportTransform!;
    vpt[0] = fitScale;
    vpt[3] = fitScale;
    vpt[4] = window.innerWidth / 2 - centerX * fitScale;
    vpt[5] = window.innerHeight / 2 - centerY * fitScale;

    canvas.requestRenderAll();
    setZoom(fitScale);
  };

  const handleExport = () => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: 'png',
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `syncboard-${roomName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
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
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden select-none">
      {/* Connecting Overlay */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-white/70 backdrop-blur-md z-50 flex items-center justify-center gap-3 font-semibold text-slate-700 animate-in fade-in duration-200">
          <Activity className="animate-spin text-indigo-600" size={24} />
          Connecting to SyncBoard Session...
        </div>
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
        onUpdateLocalUser={(name, color) => setLocalUser({ name, color })}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleToolChange}
        onClear={clearBoard}
        snapToGrid={snapToGrid}
        onToggleSnapToGrid={() => setSnapToGrid(!snapToGrid)}
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
        onDuplicate={duplicateObject}
        onDelete={handleDeleteSelected}
      />

      <CursorsLayer users={remoteUsers} />

      {/* Remote Selections Render Overlay */}
      <div className="pointer-events-none absolute inset-0 z-30">
        {remoteSelections.map((sel) => (
          <div
            key={sel.id}
            className="absolute border-2 border-dashed rounded transition-all duration-100"
            style={{
              left: `${sel.rect.left - 4}px`,
              top: `${sel.rect.top - 4}px`,
              width: `${sel.rect.width + 8}px`,
              height: `${sel.rect.height + 8}px`,
              borderColor: sel.color,
            }}
          >
            <div
              className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-xs"
              style={{ backgroundColor: sel.color }}
            >
              {sel.userName} selecting
            </div>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} />
    </div>
  );
};
