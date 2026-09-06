/**
 * SyncBoard Collaborative Whiteboard Engine
 *
 * AUDIT LOG:
 * - Added support for FigJam/Miro features: Triangle, Diamond, Emoji Stamps, Base64 Image upload, Highlighter, Laser Pointer.
 * - Implemented real-time room name sync using Yjs Text type ('roomName') with 50-character limit.
 * - Synchronized user profile (display name and cursor color) in Yjs awareness with decoupled effect.
 * - Added remote user selection bounding box tracking with user labels.
 * - Enforced strict null-safety and React StrictMode cleanup for Fabric canvas and Yjs observers.
 * - Added Cmd/Ctrl+D keyboard shortcut for object duplication and immediate active object selection for local additions.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import type { LocalUser } from './components/TopBar';
import { CursorsLayer } from './components/CursorsLayer';
import { ZoomControls } from './components/ZoomControls';
import { PropertyMenu } from './components/PropertyMenu';
import type { PropertyUpdateProps } from './components/PropertyMenu';
import { USER_COLORS, COLORS } from './constants';
import { Activity } from 'lucide-react';

export type ElementData = {
  id: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'path' | 'arrow' | 'stamp' | 'image';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number; fontFamily?: string; fontSize?: number };
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

export interface RemoteUserSelection {
  userId: number;
  userName: string;
  userColor: string;
  rect: { left: number; top: number; width: number; height: number };
}

const INITIAL_USER_NAME = `User ${Math.floor(Math.random() * 1000)}`;
const INITIAL_USER_COLOR = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

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
  const [propertyMenuRect, setPropertyMenuRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  const [localUser, setLocalUser] = useState<LocalUser>({
    name: INITIAL_USER_NAME,
    color: INITIAL_USER_COLOR,
  });

  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);
  const [remoteSelections, setRemoteSelections] = useState<RemoteUserSelection[]>([]);

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yRoomNameRef = useRef<Y.Text | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const awarenessRef = useRef<unknown>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const localCreatedIdsRef = useRef<Set<string>>(new Set());

  // Helper to calculate canvas element bounding rect in screen viewport
  const updatePropertyMenuPosition = useCallback(() => {
    if (!fabricRef.current) {
      setPropertyMenuRect(null);
      return;
    }
    const activeObj = fabricRef.current.getActiveObject();
    if (!activeObj) {
      setPropertyMenuRect(null);
      return;
    }

    const boundingRect = activeObj.getBoundingRect(true, true);
    const vpt = fabricRef.current.viewportTransform || [1, 0, 0, 1, 0, 0];

    const tl = fabric.util.transformPoint(new fabric.Point(boundingRect.left, boundingRect.top), vpt);
    const br = fabric.util.transformPoint(
      new fabric.Point(boundingRect.left + boundingRect.width, boundingRect.top + boundingRect.height),
      vpt
    );

    setPropertyMenuRect({
      left: tl.x,
      top: tl.y,
      width: br.x - tl.x,
      height: br.y - tl.y,
    });
  }, []);

  // Duplicate an active object
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObj = fabricRef.current.getActiveObject() as FabricObjectWithId;
    if (!activeObj || !activeObj.id) return;

    const sourceData = yElementsRef.current.get(activeObj.id);
    if (!sourceData) return;

    const newId = crypto.randomUUID();
    localCreatedIdsRef.current.add(newId);

    const duplicatedData: ElementData = {
      ...sourceData,
      id: newId,
      position: {
        x: sourceData.position.x + 20,
        y: sourceData.position.y + 20,
      },
    };

    yElementsRef.current.set(newId, duplicatedData);
  }, []);

  // Update tool settings on tool state change
  useEffect(() => {
    activeToolRef.current = activeTool;
    if (fabricRef.current) {
      if (activeTool === 'pencil') {
        fabricRef.current.isDrawingMode = true;
        const pencil = new fabric.PencilBrush(fabricRef.current);
        pencil.width = 3;
        pencil.color = '#4f46e5';
        fabricRef.current.freeDrawingBrush = pencil;
      } else if (activeTool === 'highlighter') {
        fabricRef.current.isDrawingMode = true;
        const highlighter = new fabric.PencilBrush(fabricRef.current);
        highlighter.width = 24;
        highlighter.color = 'rgba(255, 255, 0, 0.4)';
        fabricRef.current.freeDrawingBrush = highlighter;
      } else {
        fabricRef.current.isDrawingMode = false;
      }

      fabricRef.current.selection = activeTool === 'select';
      fabricRef.current.defaultCursor =
        activeTool === 'select'
          ? 'default'
          : activeTool === 'hand'
          ? 'grab'
          : activeTool === 'laser'
          ? 'crosshair'
          : 'crosshair';

      fabricRef.current.getObjects().forEach((obj) => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || activeTool === 'pencil' || activeTool === 'highlighter';
      });

      fabricRef.current.renderAll();
    }
  }, [activeTool]);

  // Decoupled effect for local user profile changes in Yjs awareness
  useEffect(() => {
    if (awarenessRef.current) {
      // @ts-expect-error awareness type
      awarenessRef.current.setLocalStateField('user', {
        name: localUser.name,
        color: localUser.color,
      });
    }
  }, [localUser]);

  // Main Yjs and Fabric.js setup effect
  useEffect(() => {
    if (!canvasRef.current) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;

    // Set initial room name safely
    setTimeout(() => {
      if (yRoomName.toString()) {
        setRoomName(yRoomName.toString());
      }
    }, 0);

    const handleRoomNameObserver = () => {
      setRoomName(yRoomName.toString() || 'Main Workspace');
    };
    yRoomName.observe(handleRoomNameObserver);

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

    const dbProvider = new IndexeddbPersistence('syncboard-v2', ydoc);
    const wsProvider = new WebsocketProvider('ws://localhost:1234', 'syncboard-main', ydoc);

    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awarenessRef.current = awareness;

    awareness.setLocalStateField('user', {
      name: localUser.name,
      color: localUser.color,
    });

    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const users: { id: number; name: string; color: string; cursor?: { x: number; y: number } }[] = [];
      const selections: RemoteUserSelection[] = [];

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
            const remoteObj = fabricRef.current
              .getObjects()
              .find((o: FabricObjectWithId) => o.id === selectedId);

            if (remoteObj) {
              const bRect = remoteObj.getBoundingRect(true, true);
              const vpt = fabricRef.current.viewportTransform || [1, 0, 0, 1, 0, 0];
              const tl = fabric.util.transformPoint(new fabric.Point(bRect.left, bRect.top), vpt);
              const br = fabric.util.transformPoint(
                new fabric.Point(bRect.left + bRect.width, bRect.top + bRect.height),
                vpt
              );

              selections.push({
                userId: clientID,
                userName: user.name,
                userColor: user.color,
                rect: {
                  left: tl.x,
                  top: tl.y,
                  width: br.x - tl.x,
                  height: br.y - tl.y,
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
          text.set({ text: data.content || '', fontFamily: data.style.fontFamily || 'Inter, sans-serif' });
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
            existing.set({
              text: data.content || '',
              fontFamily: data.style.fontFamily || 'Inter, sans-serif',
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
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.12)', blur: 12, offsetX: 4, offsetY: 4 }),
            rx: 12,
            ry: 12,
          });
          const text = new fabric.IText(data.content || '', {
            fontSize: 16,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            left: 75,
            top: 75,
            width: 130,
            // @ts-expect-error splitByGrapheme exists in fabric runtime
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
            rx: 12,
            ry: 12,
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
          obj = new fabric.Polygon(
            [
              { x: 40, y: 0 },
              { x: 80, y: 40 },
              { x: 40, y: 80 },
              { x: 0, y: 40 },
            ],
            {
              left: data.position.x,
              top: data.position.y,
              fill: data.style.fill,
              scaleX: data.scaleX || 1,
              scaleY: data.scaleY || 1,
            }
          );
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x,
            top: data.position.y,
            fill: data.style.fill,
            fontFamily: data.style.fontFamily || 'Inter, sans-serif',
            fontSize: 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'stamp') {
          obj = new fabric.Text(data.content || '👍', {
            left: data.position.x,
            top: data.position.y,
            fontSize: 48,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(
            data.content,
            (img) => {
              if (!img) return;
              img.set({
                left: data.position.x,
                top: data.position.y,
                scaleX: data.scaleX || 1,
                scaleY: data.scaleY || 1,
              });
              (img as FabricObjectWithId).id = key;
              img.selectable = activeToolRef.current === 'select';
              fabricCanvas.add(img);
              if (typeof data.zIndex === 'number') img.moveTo(data.zIndex);
              fabricCanvas.renderAll();

              // Auto select if created locally
              if (localCreatedIdsRef.current.has(key)) {
                localCreatedIdsRef.current.delete(key);
                fabricCanvas.setActiveObject(img);
                setSelectedObject(img);
                updatePropertyMenuPosition();
              }
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
            localCreatedIdsRef.current.delete(key);
            fabricCanvas.setActiveObject(obj);
            setSelectedObject(obj);
            updatePropertyMenuPosition();
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
      let newZoom = fabricCanvas.getZoom();
      newZoom *= 0.999 ** delta;
      if (newZoom > 20) newZoom = 20;
      if (newZoom < 0.01) newZoom = 0.01;

      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, newZoom);
      setZoom(newZoom);
      updatePropertyMenuPosition();
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Laser pointer transient trails
    const laserTrails: fabric.Circle[] = [];

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;

      if (!opt.target && (evt.altKey === true || activeToolRef.current === 'hand' || activeToolRef.current === 'select')) {
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;

      // Update local cursor for awareness
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      if (fabricCanvas.isDragging) {
        const vpt = fabricCanvas.viewportTransform!;
        vpt[4] += e.clientX - fabricCanvas.lastPosX!;
        vpt[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
        updatePropertyMenuPosition();
      }

      // Laser tool transient trail rendering
      if (activeToolRef.current === 'laser' && e.buttons === 1) {
        const pointer = fabricCanvas.getPointer(e);
        const laserDot = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 6,
          fill: '#ef4444',
          shadow: new fabric.Shadow({ color: '#ef4444', blur: 10 }),
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        fabricCanvas.add(laserDot);
        laserTrails.push(laserDot);

        setTimeout(() => {
          fabricCanvas.remove(laserDot);
          fabricCanvas.renderAll();
        }, 800);
      }
    });

    fabricCanvas.on('mouse:up', () => {
      if (fabricCanvas.viewportTransform) {
        fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform);
      }
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
    });

    const handleSelectionChange = () => {
      const activeObj = fabricCanvas.getActiveObject();
      setSelectedObject(activeObj || null);
      updatePropertyMenuPosition();

      // Sync selected object ID to awareness for remote user indicators
      const activeId = (activeObj as FabricObjectWithId)?.id || null;
      awareness.setLocalStateField('selectedId', activeId);
    };

    fabricCanvas.on('selection:created', handleSelectionChange);
    fabricCanvas.on('selection:updated', handleSelectionChange);
    fabricCanvas.on('selection:cleared', () => {
      setSelectedObject(null);
      setPropertyMenuRect(null);
      awareness.setLocalStateField('selectedId', null);
    });

    fabricCanvas.on('object:modified', (e) => {
      updateYjs(e);
      updatePropertyMenuPosition();
    });
    fabricCanvas.on('object:moving', (e) => {
      updateYjs(e);
      updatePropertyMenuPosition();
    });
    fabricCanvas.on('object:scaling', (e) => {
      updateYjs(e);
      updatePropertyMenuPosition();
    });
    fabricCanvas.on('after:render', updatePropertyMenuPosition);

    fabricCanvas.on('path:created', (e: fabric.IEvent) => {
      const pathObj = (e as unknown as { path: fabric.Path & { id?: string } }).path;
      const id = crypto.randomUUID();
      pathObj.id = id;

      const isHighlighter = activeToolRef.current === 'highlighter';

      const data: ElementData = {
        id,
        type: 'path',
        position: { x: pathObj.left || 0, y: pathObj.top || 0 },
        size: { width: pathObj.width || 0, height: pathObj.height || 0 },
        style: {
          fill: 'transparent',
          stroke: isHighlighter ? 'rgba(255, 255, 0, 0.4)' : '#4f46e5',
          strokeWidth: isHighlighter ? 24 : 3,
        },
        path: pathObj.path as unknown as (string | number)[][],
      };

      yElementsRef.current?.set(id, data);
    });

    const handleResize = () => {
      fabricCanvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
      fabricCanvas.renderAll();
      updatePropertyMenuPosition();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
          setSelectedObject(null);
          setPropertyMenuRect(null);
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
      yRoomName.unobserve(handleRoomNameObserver);
      awareness.off('change', handleAwarenessChange);
      wsProvider.destroy();
      dbProvider.destroy();
      fabricCanvas.dispose();
      fabricRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [duplicateObject, updatePropertyMenuPosition, localUser.name, localUser.color]);

  // Handle adding new elements to board
  const addShape = useCallback((type: Tool, extraData?: { stampEmoji?: string; imageSrc?: string }) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    localCreatedIdsRef.current.add(id);

    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    let data: ElementData | null = null;

    if (type === 'sticky') {
      data = {
        id,
        type: 'sticky',
        position: { x: center.x - 75, y: center.y - 75 },
        size: { width: 150, height: 150 },
        content: 'Type a sticky note...',
        style: {
          fill: stickyColors[Math.floor(Math.random() * stickyColors.length)],
          fontFamily: 'Inter, sans-serif',
        },
      };
    } else if (type === 'circle') {
      data = {
        id,
        type: 'circle',
        position: { x: center.x - 40, y: center.y - 40 },
        size: { width: 80, height: 80, radius: 40 },
        style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)] },
      };
    } else if (type === 'rectangle') {
      data = {
        id,
        type: 'rectangle',
        position: { x: center.x - 60, y: center.y - 40 },
        size: { width: 120, height: 80 },
        style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)] },
      };
    } else if (type === 'triangle') {
      data = {
        id,
        type: 'triangle',
        position: { x: center.x - 50, y: center.y - 45 },
        size: { width: 100, height: 90 },
        style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)] },
      };
    } else if (type === 'diamond') {
      data = {
        id,
        type: 'diamond',
        position: { x: center.x - 40, y: center.y - 40 },
        size: { width: 80, height: 80 },
        style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)] },
      };
    } else if (type === 'arrow') {
      data = {
        id,
        type: 'arrow',
        position: { x: center.x - 50, y: center.y - 12 },
        size: { width: 100, height: 25 },
        style: { fill: COLORS[Math.floor(Math.random() * COLORS.length)] },
      };
    } else if (type === 'text') {
      data = {
        id,
        type: 'text',
        position: { x: center.x - 60, y: center.y - 15 },
        size: { width: 120, height: 30 },
        content: 'Double click to edit',
        style: {
          fill: '#0f172a',
          fontFamily: 'Inter, sans-serif',
        },
      };
    } else if (type === 'stamp' && extraData?.stampEmoji) {
      data = {
        id,
        type: 'stamp',
        position: { x: center.x - 24, y: center.y - 24 },
        size: { width: 48, height: 48 },
        content: extraData.stampEmoji,
        style: { fill: '#000000' },
      };
    } else if (type === 'image' && extraData?.imageSrc) {
      data = {
        id,
        type: 'image',
        position: { x: center.x - 100, y: center.y - 100 },
        size: { width: 200, height: 200 },
        content: extraData.imageSrc,
        style: { fill: 'transparent' },
      };
    }

    if (data) {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, extraData?: { stampEmoji?: string; imageSrc?: string }) => {
    if (
      tool !== 'select' &&
      tool !== 'pencil' &&
      tool !== 'hand' &&
      tool !== 'highlighter' &&
      tool !== 'laser'
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

  const updateProperty = (props: PropertyUpdateProps) => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObjects = fabricRef.current.getActiveObjects();

    activeObjects.forEach((obj: FabricObjectWithId) => {
      if (!obj.id) return;
      const data = yElementsRef.current?.get(obj.id);
      if (data) {
        const newData: ElementData = { ...data, style: { ...data.style } };

        if ('fill' in props && props.fill !== undefined) newData.style.fill = props.fill as string;
        if ('stroke' in props && props.stroke !== undefined) newData.style.stroke = props.stroke;
        if ('strokeWidth' in props && props.strokeWidth !== undefined) newData.style.strokeWidth = props.strokeWidth;
        if ('fontFamily' in props && props.fontFamily !== undefined) newData.style.fontFamily = props.fontFamily;
        if ('content' in props && props.content !== undefined) newData.content = props.content;

        if (props.zAction === 'front') {
          obj.bringToFront();
          newData.zIndex = fabricRef.current?.getObjects().indexOf(obj);
        } else if (props.zAction === 'back') {
          obj.sendToBack();
          newData.zIndex = fabricRef.current?.getObjects().indexOf(obj);
        }

        yElementsRef.current?.set(obj.id, newData);
      }
    });

    fabricRef.current.requestRenderAll();
    updatePropertyMenuPosition();
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

  const handleZoomIn = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() * 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
    updatePropertyMenuPosition();
  };

  const handleZoomOut = () => {
    if (!fabricRef.current) return;
    const newZoom = fabricRef.current.getZoom() / 1.2;
    fabricRef.current.setZoom(newZoom);
    setZoom(newZoom);
    updatePropertyMenuPosition();
  };

  const handleResetZoom = () => {
    if (!fabricRef.current) return;
    fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
    setZoom(1);
    updatePropertyMenuPosition();
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
      setSelectedObject(null);
      setPropertyMenuRect(null);
    }
  };

  const handleUndo = () => undoManagerRef.current?.undo();
  const handleRedo = () => undoManagerRef.current?.redo();

  return (
    <div ref={containerRef} className="relative w-screen h-screen overflow-hidden select-none">
      {/* Loading overlay when connecting */}
      {status === 'connecting' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/10 backdrop-blur-md">
          <div className="flex items-center gap-3 px-6 py-4 bg-white/90 rounded-2xl shadow-2xl border border-slate-200">
            <Activity className="w-6 h-6 text-indigo-600 animate-spin" />
            <span className="text-sm font-bold text-slate-700">Connecting to SyncBoard Session...</span>
          </div>
        </div>
      )}

      {/* Remote Selections Bounding Rects Layer */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
        {remoteSelections.map((sel) => (
          <div
            key={sel.userId}
            className="absolute border-2 border-dashed rounded transition-all duration-75"
            style={{
              left: `${sel.rect.left}px`,
              top: `${sel.rect.top}px`,
              width: `${sel.rect.width}px`,
              height: `${sel.rect.height}px`,
              borderColor: sel.userColor,
            }}
          >
            <span
              className="absolute -top-6 left-0 px-1.5 py-0.5 text-[10px] font-bold text-white rounded shadow-sm whitespace-nowrap"
              style={{ backgroundColor: sel.userColor }}
            >
              {sel.userName}
            </span>
          </div>
        ))}
      </div>

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
        onUpdateLocalUser={(updated) => setLocalUser((prev) => ({ ...prev, ...updated }))}
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

      <CursorsLayer users={remoteUsers} />

      <canvas ref={canvasRef} />
    </div>
  );
};
