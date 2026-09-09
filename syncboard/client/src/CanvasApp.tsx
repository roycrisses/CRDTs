/*
 * Daily Audit & Fixes Log:
 * Date: 2026-09-09
 * Checks Performed:
 * - Verified client production build (`npm run build`) and TypeScript compilation.
 * - Verified ESLint code style and syntax checks (`npm run lint`).
 * - Verified server entry syntax (`node --check index.js`).
 * - Confirmed Yjs real-time state synchronization, Fabric.js canvas bindings, and UI overlays function properly with zero error regressions.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import type { RemoteUser, RemoteSelection, LaserPoint } from './components/CursorsLayer';
import { CursorsLayer } from './components/CursorsLayer';
import { ZoomControls } from './components/ZoomControls';
import type { PropertyUpdateProps } from './components/PropertyMenu';
import { PropertyMenu } from './components/PropertyMenu';
import { COLORS, STICKY_COLORS } from './constants';

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
  style: { fill: string; stroke?: string; strokeWidth?: number; fontFamily?: string };
  path?: (string | number)[][];
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
  imageUrl?: string;
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
const DEFAULT_USER_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)];

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState('connecting');
  const [roomName, setRoomName] = useState('Main Workspace');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [propertyMenuRect, setPropertyMenuRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const [localUser, setLocalUser] = useState({
    name: DEFAULT_USER_NAME,
    color: DEFAULT_USER_COLOR,
  });

  const localUserRef = useRef(localUser);
  useEffect(() => {
    localUserRef.current = localUser;
  }, [localUser]);

  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<RemoteSelection[]>([]);
  const [laserPoints, setLaserPoints] = useState<LaserPoint[]>([]);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yRoomNameRef = useRef<Y.Text | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const awarenessRef = useRef<WebsocketProvider['awareness'] | null>(null);

  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const localCreatedIdsRef = useRef<Set<string>>(new Set());

  // Duplicate Object Helper
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;
      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const newId = crypto.randomUUID();
        const duplicatedData: ElementData = {
          ...data,
          id: newId,
          position: {
            x: data.position.x + 20,
            y: data.position.y + 20,
          },
        };
        localCreatedIdsRef.current.add(newId);
        yElementsRef.current?.set(newId, duplicatedData);
      }
    });
  }, []);

  // Update activeToolRef & Canvas mode
  useEffect(() => {
    activeToolRef.current = activeTool;
    const canvas = fabricRef.current;
    if (canvas) {
      const isDrawing = activeTool === 'pencil' || activeTool === 'highlighter';
      canvas.isDrawingMode = isDrawing;
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
        brush.width = 20;
        brush.color = 'rgba(255, 255, 0, 0.4)';
        canvas.freeDrawingBrush = brush;
      } else if (activeTool === 'pencil') {
        const brush = new fabric.PencilBrush(canvas);
        brush.width = 3;
        brush.color = '#4f46e5';
        canvas.freeDrawingBrush = brush;
      }

      canvas.getObjects().forEach((obj) => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || isDrawing || activeTool === 'laser';
      });

      canvas.renderAll();
    }
  }, [activeTool]);

  // Sync Local Profile via Awareness Decoupled from Canvas Setup
  useEffect(() => {
    if (awarenessRef.current) {
      awarenessRef.current.setLocalStateField('user', localUser);
    }
  }, [localUser]);

  // Main Canvas & Yjs Initialization
  useEffect(() => {
    if (!canvasRef.current) return;

    const ydoc = new Y.Doc();
    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;

    // Initialize Room Name safely
    if (yRoomName.toString().length === 0) {
      yRoomName.insert(0, 'Main Workspace');
    }
    setTimeout(() => {
      setRoomName(yRoomName.toString());
    }, 0);

    const handleRoomNameObserver = () => {
      setRoomName(yRoomName.toString());
    };
    yRoomName.observe(handleRoomNameObserver);

    const undoManager = new Y.UndoManager(yElements);
    undoManagerRef.current = undoManager;

    const handleStackChange = () => {
      setCanUndo(undoManager.undoStack.length > 0);
      setCanRedo(undoManager.redoStack.length > 0);
    };
    undoManager.on('stack-item-added', handleStackChange);
    undoManager.on('stack-item-popped', handleStackChange);

    const dbProvider = new IndexeddbPersistence('syncboard-v3', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awarenessRef.current = awareness;
    awareness.setLocalStateField('user', localUserRef.current);

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const users: RemoteUser[] = [];
      const selections: RemoteSelection[] = [];

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
          });

          const selectedId = state.selectedId as string | undefined;
          if (selectedId && fabricRef.current) {
            const obj = fabricRef.current
              .getObjects()
              .find((o: FabricObjectWithId) => o.id === selectedId);

            if (obj) {
              const rect = obj.getBoundingRect();
              const vpt = fabricRef.current.viewportTransform || [1, 0, 0, 1, 0, 0];
              const p1 = fabric.util.transformPoint(new fabric.Point(rect.left, rect.top), vpt);
              const p2 = fabric.util.transformPoint(
                new fabric.Point(rect.left + rect.width, rect.top + rect.height),
                vpt
              );

              selections.push({
                userId: clientID,
                userName: user.name,
                userColor: user.color,
                rect: {
                  left: p1.x,
                  top: p1.y,
                  width: p2.x - p1.x,
                  height: p2.y - p1.y,
                },
              });
            }
          }
        }
      });

      setRemoteUsers(users);
      setRemoteSelections(selections);
    };

    awareness.on('change', handleAwarenessChange);

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
    }) as FabricCanvasExtended;
    fabricRef.current = fabricCanvas;

    const findObjectById = (id: string): FabricObjectWithId | undefined =>
      fabricCanvas.getObjects().find((obj: FabricObjectWithId) => obj.id === id);

    const updateMenuPosition = () => {
      const activeObj = fabricCanvas.getActiveObject();
      if (!activeObj) {
        setPropertyMenuRect(null);
        return;
      }
      const rect = activeObj.getBoundingRect();
      const vpt = fabricCanvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      const p1 = fabric.util.transformPoint(new fabric.Point(rect.left, rect.top), vpt);
      const p2 = fabric.util.transformPoint(
        new fabric.Point(rect.left + rect.width, rect.top + rect.height),
        vpt
      );

      setPropertyMenuRect({
        left: p1.x,
        top: p1.y,
        width: p2.x - p1.x,
        height: p2.y - p1.y,
      });
    };

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
          if (data.content !== undefined) text.set({ text: data.content });
          if (data.style.fontFamily) text.set({ fontFamily: data.style.fontFamily });
        } else if (data.type === 'arrow' && existing instanceof fabric.Group) {
          const line = existing.item(0) as unknown as fabric.Line;
          const tip = existing.item(1) as unknown as fabric.Triangle;
          existing.set(commonProps);
          line.set({ stroke: data.style.fill });
          tip.set({ fill: data.style.fill });
        } else if (data.type === 'stamp' && existing instanceof fabric.IText) {
          existing.set({ ...commonProps });
        } else if (data.type === 'image' && existing instanceof fabric.Image) {
          existing.set({ ...commonProps });
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
            if (data.content !== undefined) existing.set({ text: data.content });
            if (data.style.fontFamily) existing.set({ fontFamily: data.style.fontFamily });
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
            rx: 6,
            ry: 6,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.12)', blur: 12, offsetX: 4, offsetY: 6 }),
          });
          const text = new fabric.IText(data.content || 'Sticky Note', {
            fontSize: 16,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: 80,
            top: 80,
            width: 140,
            fill: '#1e293b',
            // @ts-expect-error: splitByGrapheme present in Fabric
            splitByGrapheme: true,
          });
          obj = new fabric.Group([rect, text], {
            left: data.position.x,
            top: data.position.y,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'arrow') {
          const line = new fabric.Line([0, 25, 120, 25], {
            stroke: data.style.fill || '#6366f1',
            strokeWidth: 4,
            originX: 'center',
            originY: 'center',
          });
          const tip = new fabric.Triangle({
            width: 16,
            height: 16,
            fill: data.style.fill || '#6366f1',
            left: 120,
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
            width: data.size.width || 100,
            height: data.size.height || 90,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'diamond') {
          obj = new fabric.Rect({
            left: data.position.x,
            top: data.position.y,
            width: data.size.width || 80,
            height: data.size.height || 80,
            fill: data.style.fill,
            angle: 45,
            rx: 6,
            ry: 6,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || 'Type something...', {
            left: data.position.x,
            top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fontSize: 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'stamp') {
          obj = new fabric.IText(data.content || '👍', {
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
                scaleX: data.scaleX || 0.5,
                scaleY: data.scaleY || 0.5,
              });
              (img as FabricObjectWithId).id = key;
              img.selectable = activeToolRef.current === 'select';
              fabricCanvas.add(img);

              if (localCreatedIdsRef.current.has(key)) {
                fabricCanvas.setActiveObject(img);
                setSelectedObject(img);
                localCreatedIdsRef.current.delete(key);
              }

              fabricCanvas.renderAll();
            },
            { crossOrigin: 'anonymous' }
          );
          return;
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
            fabricCanvas.setActiveObject(obj);
            setSelectedObject(obj);
            localCreatedIdsRef.current.delete(key);
          }
        }
      }
    };

    const handleYElementsObserve = (event: Y.YMapEvent<ElementData>) => {
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

    yElements.observe(handleYElementsObserve);

    const updateYjs = (e: fabric.IEvent) => {
      if (isUpdatingRef.current || !yElementsRef.current || !fabricRef.current) return;
      const obj = e.target as FabricObjectWithId;
      if (!obj || !obj.id) return;

      const data = yElementsRef.current.get(obj.id);
      if (data) {
        let content = data.content;
        let fontFamily = data.style.fontFamily;

        if (obj instanceof fabric.IText) {
          content = obj.text;
          fontFamily = obj.fontFamily;
        } else if (obj instanceof fabric.Group && obj.item(1) instanceof fabric.IText) {
          const textItem = obj.item(1) as unknown as fabric.IText;
          content = textItem.text;
          fontFamily = textItem.fontFamily;
        }

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
          content,
          style: {
            ...data.style,
            fontFamily,
          },
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
      updateMenuPosition();
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;
      if (
        evt.altKey ||
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

      // Update Cursor Awareness
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      // Laser Pointer Trail Effect
      if (activeToolRef.current === 'laser') {
        setLaserPoints((prev) => [
          ...prev.slice(-25),
          {
            id: crypto.randomUUID(),
            x: e.clientX,
            y: e.clientY,
            color: localUserRef.current.color,
            time: Date.now(),
          },
        ]);
      }

      if (fabricCanvas.isDragging) {
        const vpt = fabricCanvas.viewportTransform!;
        vpt[4] += e.clientX - fabricCanvas.lastPosX!;
        vpt[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
        updateMenuPosition();
      }
    });

    fabricCanvas.on('mouse:up', () => {
      if (fabricCanvas.viewportTransform) {
        fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform);
      }
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
    });

    const handleSelectionChange = (e: fabric.IEvent) => {
      const active = e.target || fabricCanvas.getActiveObject();
      setSelectedObject(active || null);
      updateMenuPosition();

      if (active && (active as FabricObjectWithId).id) {
        awareness.setLocalStateField('selectedId', (active as FabricObjectWithId).id);
      } else {
        awareness.setLocalStateField('selectedId', null);
      }
    };

    fabricCanvas.on('selection:created', handleSelectionChange);
    fabricCanvas.on('selection:updated', handleSelectionChange);
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setPropertyMenuRect(null);
      awareness.setLocalStateField('selectedId', null);
    });

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', (e) => {
      updateYjs(e);
      updateMenuPosition();
    });
    fabricCanvas.on('object:scaling', (e) => {
      updateYjs(e);
      updateMenuPosition();
    });
    fabricCanvas.on('after:render', updateMenuPosition);

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

      const isHighlighter = activeToolRef.current === 'highlighter';

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: path.left || 0, y: path.top || 0 },
        size: { width: path.width || 0, height: path.height || 0 },
        style: {
          fill: 'transparent',
          stroke: isHighlighter ? 'rgba(255, 255, 0, 0.4)' : '#4f46e5',
          strokeWidth: isHighlighter ? 20 : 3,
        },
        path: path.path as unknown as (string | number)[][],
      };

      yElementsRef.current?.set(id, data);
    });

    const handleResize = () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
      fabricCanvas.renderAll();
      updateMenuPosition();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeObj = fabricCanvas.getActiveObject() as unknown as fabric.IText | undefined;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        activeObj?.isEditing
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateObject();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          undoManager.redo();
        } else {
          undoManager.undo();
        }
        e.preventDefault();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
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

    // Laser trail cleanup interval
    const laserInterval = setInterval(() => {
      const now = Date.now();
      setLaserPoints((prev) => prev.filter((p) => now - p.time < 1000));
    }, 100);

    return () => {
      clearInterval(laserInterval);
      wsProvider.destroy();
      dbProvider.destroy();
      yRoomName.unobserve(handleRoomNameObserver);
      yElements.unobserve(handleYElementsObserve);
      awareness.off('change', handleAwarenessChange);
      fabricCanvas.dispose();
      fabricRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject]);

  // Handle Adding Tool Elements
  const handleToolChange = (
    tool: Tool,
    extra?: { stampEmoji?: string; imageUrl?: string }
  ) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    if (extra?.imageUrl) {
      const center = fabricRef.current.getVpCenter();
      const id = crypto.randomUUID();
      localCreatedIdsRef.current.add(id);

      const data: ElementData = {
        id,
        type: 'image',
        position: { x: center.x - 100, y: center.y - 100 },
        size: { width: 200, height: 200 },
        style: { fill: 'transparent' },
        imageUrl: extra.imageUrl,
        scaleX: 0.5,
        scaleY: 0.5,
      };
      yElementsRef.current.set(id, data);
      setActiveTool('select');
      return;
    }

    if (tool === 'stamp' && extra?.stampEmoji) {
      const center = fabricRef.current.getVpCenter();
      const id = crypto.randomUUID();
      localCreatedIdsRef.current.add(id);

      const data: ElementData = {
        id,
        type: 'stamp',
        position: { x: center.x - 25, y: center.y - 25 },
        size: { width: 50, height: 50 },
        content: extra.stampEmoji,
        style: { fill: '#000000' },
      };
      yElementsRef.current.set(id, data);
      setActiveTool('select');
      return;
    }

    if (
      tool !== 'select' &&
      tool !== 'pencil' &&
      tool !== 'highlighter' &&
      tool !== 'laser' &&
      tool !== 'hand'
    ) {
      const center = fabricRef.current.getVpCenter();
      const id = crypto.randomUUID();
      localCreatedIdsRef.current.add(id);

      const data: ElementData = {
        id,
        type: tool as 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'arrow',
        position: { x: center.x - 60, y: center.y - 40 },
        size:
          tool === 'sticky'
            ? { width: 160, height: 160 }
            : tool === 'circle'
            ? { width: 90, height: 90, radius: 45 }
            : { width: 120, height: 80 },
        content:
          tool === 'text'
            ? 'Type something...'
            : tool === 'sticky'
            ? 'Sticky Note'
            : undefined,
        style: {
          fill:
            tool === 'sticky'
              ? STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)]
              : COLORS[Math.floor(Math.random() * COLORS.length)],
        },
      };

      yElementsRef.current.set(id, data);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  // Property Update Handler
  const updateProperty = (props: PropertyUpdateProps) => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;
      const data = yElementsRef.current?.get(obj.id);
      if (!data) return;

      const newData = { ...data, style: { ...data.style } };

      if ('fill' in props && typeof props.fill === 'string') newData.style.fill = props.fill;
      if ('stroke' in props && typeof props.stroke === 'string') newData.style.stroke = props.stroke;
      if ('strokeWidth' in props && typeof props.strokeWidth === 'number') newData.style.strokeWidth = props.strokeWidth;
      if ('fontFamily' in props && typeof props.fontFamily === 'string') newData.style.fontFamily = props.fontFamily;
      if ('content' in props && props.content !== undefined) newData.content = props.content;

      // Handle Z-Index Actions
      if (props.zAction && fabricRef.current) {
        const objects = fabricRef.current.getObjects();
        const currentIndex = objects.indexOf(obj);
        let newIndex = currentIndex;

        if (props.zAction === 'front') newIndex = objects.length - 1;
        else if (props.zAction === 'back') newIndex = 0;
        else if (props.zAction === 'forward') newIndex = Math.min(objects.length - 1, currentIndex + 1);
        else if (props.zAction === 'backward') newIndex = Math.max(0, currentIndex - 1);

        newData.zIndex = newIndex;
        obj.moveTo(newIndex);
      }

      yElementsRef.current?.set(obj.id, newData);
    });

    fabricRef.current.requestRenderAll();
  };

  const handleRoomNameChange = (newName: string) => {
    if (yRoomNameRef.current) {
      yRoomNameRef.current.delete(0, yRoomNameRef.current.length);
      yRoomNameRef.current.insert(0, newName);
    }
  };

  const handleUpdateProfile = (profile: Partial<{ name: string; color: string }>) => {
    setLocalUser((prev) => ({ ...prev, ...profile }));
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

    const objects = fabricRef.current.getObjects();
    if (objects.length === 0) {
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoom(1);
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    objects.forEach((obj) => {
      const rect = obj.getBoundingRect();
      if (rect.left < minX) minX = rect.left;
      if (rect.top < minY) minY = rect.top;
      if (rect.left + rect.width > maxX) maxX = rect.left + rect.width;
      if (rect.top + rect.height > maxY) maxY = rect.top + rect.height;
    });

    const contentWidth = maxX - minX || 100;
    const contentHeight = maxY - minY || 100;

    const scaleX = (window.innerWidth - 200) / contentWidth;
    const scaleY = (window.innerHeight - 200) / contentHeight;
    let targetZoom = Math.min(scaleX, scaleY, 1);
    if (targetZoom < 0.1) targetZoom = 0.1;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const vpt = fabricRef.current.viewportTransform!;
    vpt[0] = targetZoom;
    vpt[3] = targetZoom;
    vpt[4] = window.innerWidth / 2 - centerX * targetZoom;
    vpt[5] = window.innerHeight / 2 - centerY * targetZoom;

    fabricRef.current.setViewportTransform(vpt);
    setZoom(targetZoom);
  };

  const handleExport = () => {
    if (!fabricRef.current) return;
    const dataURL = fabricRef.current.toDataURL({
      format: 'png',
      multiplier: 2,
    });
    const link = document.createElement('a');
    link.download = `${roomName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const clearBoard = () => {
    if (confirm('Are you sure you want to clear the entire workspace board?')) {
      yElementsRef.current?.clear();
    }
  };

  const handleDeleteSelected = () => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();
    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (obj.id) yElementsRef.current?.delete(obj.id);
    });
    fabricRef.current.discardActiveObject();
    fabricRef.current.renderAll();
    setSelectedObject(null);
    setPropertyMenuRect(null);
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  return (
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden select-none">
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
        onUpdateProfile={handleUpdateProfile}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleToolChange}
        onClear={clearBoard}
      />

      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleResetZoom}
      />

      <PropertyMenu
        selectedObject={selectedObject}
        propertyMenuRect={propertyMenuRect}
        onUpdate={updateProperty}
        onDuplicate={duplicateObject}
        onDelete={handleDeleteSelected}
      />

      <CursorsLayer
        users={remoteUsers}
        remoteSelections={remoteSelections}
        laserPoints={laserPoints}
      />

      <canvas ref={canvasRef} />
    </div>
  );
};
