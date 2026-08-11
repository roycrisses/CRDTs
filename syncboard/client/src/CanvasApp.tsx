/**
 * SyncBoard - Collaborative Canvas Application
 *
 * CHANGE LOG & AUDIT LOG:
 * - 2023-11-20: Initial prototype setup with real-time sync, pencil, rectangle, sticky note and text support.
 * - 2025-03-01: Enhanced UI and features like Figma Jam board.
 *   - Implemented Shape Expansion: Added Triangle and Diamond shapes.
 *   - Implemented Highlighter: Transparent yellow brush tool.
 *   - Implemented Emoji Stamps: Stamp selected emoji on canvas.
 *   - Implemented File Uploads: Secure image uploading (<3MB size constraint) with proper CORS config.
 *   - Decoupled property menu positioning & remote selections from refs.
 *   - Added robust Yjs connection/awareness cleanups, snap-to-grid, z-index layering, and item duplication (Cmd+D / Ctrl+D).
 *   - Added transient laser pointer trails with fading effects.
 *   - Added StrictMode stability fixes, preventing 'clearRect' of null canvas instances.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { Tool } from './components/Toolbar';
import { Toolbar } from './components/Toolbar';
import { STAMPS } from './components/constants';
import { TopBar } from './components/TopBar';
import { CursorsLayer } from './components/CursorsLayer';
import { ZoomControls } from './components/ZoomControls';
import { PropertyMenu } from './components/PropertyMenu';
import { Activity, Grid } from 'lucide-react';
import { cn } from './lib/utils';

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

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];
const DEFAULT_USER_NAME = `User ${Math.floor(Math.random() * 1000)}`;
const DEFAULT_USER_COLOR = COLORS[Math.floor(Math.random() * COLORS.length)];

// Snap to Grid Configuration
const GRID_SIZE = 20;

export const CanvasApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collaborative Room State
  const [roomName, setRoomName] = useState('Main Workspace');
  const [status, setStatus] = useState('connecting');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [selectedStamp, setSelectedStamp] = useState<string>(STAMPS[0]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [vpt, setVpt] = useState<number[]>([1, 0, 0, 1, 0, 0]); // Viewport transform state

  // Snap to grid
  const [snapToGrid, setSnapToGrid] = useState(false);
  const snapToGridRef = useRef(false);

  // Property Menu coordinate bounding box
  const [propertyMenuRect, setPropertyMenuRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  // Remote Selections State (Borders and Names of other users)
  const [remoteSelections, setRemoteSelections] = useState<{ [clientId: number]: { left: number; top: number; width: number; height: number; color: string; name: string } }>({});

  // Local User Preferences
  const [localUser, setLocalUser] = useState({ name: DEFAULT_USER_NAME, color: DEFAULT_USER_COLOR });

  const fabricRef = useRef<FabricCanvasExtended | null>(null);
  const yElementsRef = useRef<Y.Map<ElementData> | null>(null);
  const yRoomNameRef = useRef<Y.Text | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const isUpdatingRef = useRef(false);
  const activeToolRef = useRef<Tool>('select');
  const selectedStampRef = useRef<string>(STAMPS[0]);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const localCreatedIdsRef = useRef<Set<string>>(new Set());

  // Laser Pointer Logic (Transient Trail)
  const [laserTrails, setLaserTrails] = useState<{ id: string; x: number; y: number; opacity: number; color: string }[]>([]);
  const laserTrailsRef = useRef<{ id: string; x: number; y: number; opacity: number; color: string; timestamp: number }[]>([]);

  // Selection Object
  const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<{ id: number; name: string; color: string; cursor?: { x: number; y: number } }[]>([]);

  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);

  useEffect(() => {
    selectedStampRef.current = selectedStamp;
  }, [selectedStamp]);

  // Handle local user awareness updates
  useEffect(() => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('user', {
        name: localUser.name,
        color: localUser.color,
      });
    }
  }, [localUser]);

  // Sync Room Name Change back to Yjs
  const handleRoomNameChange = (newName: string) => {
    if (yRoomNameRef.current) {
      const yRoomName = yRoomNameRef.current;
      yRoomName.delete(0, yRoomName.length);
      yRoomName.insert(0, newName);
    }
  };

  // Helper for duplicating active object (Ctrl+D / Cmd+D)
  const duplicateObject = useCallback(() => {
    if (!fabricRef.current || !yElementsRef.current) return;
    const activeObj = fabricRef.current.getActiveObject() as FabricObjectWithId;
    if (!activeObj || !activeObj.id) return;

    const data = yElementsRef.current.get(activeObj.id);
    if (data) {
      const id = crypto.randomUUID();
      localCreatedIdsRef.current.add(id);
      const duplicatedData: ElementData = {
        ...data,
        id,
        position: { x: data.position.x + GRID_SIZE, y: data.position.y + GRID_SIZE },
        zIndex: fabricRef.current.getObjects().indexOf(activeObj) + 1,
      };
      yElementsRef.current.set(id, duplicatedData);
    }
  }, []);

  // Update Toolbar tools & pencil configs
  useEffect(() => {
    activeToolRef.current = activeTool;
    const fabricCanvas = fabricRef.current;
    if (fabricCanvas) {
      // Setup normal/highlighter pencil modes
      if (activeTool === 'pencil') {
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.width = 3;
        fabricCanvas.freeDrawingBrush.color = localUser.color;
      } else if (activeTool === 'highlighter') {
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
        fabricCanvas.freeDrawingBrush.width = 20;
        fabricCanvas.freeDrawingBrush.color = 'rgba(255, 255, 0, 0.4)'; // Yellow translucent highligther
      } else {
        fabricCanvas.isDrawingMode = false;
      }

      fabricCanvas.selection = activeTool === 'select';
      fabricCanvas.defaultCursor = activeTool === 'select' ? 'default' : (activeTool === 'hand' ? 'grab' : 'crosshair');

      // Disable object selection unless in select mode
      fabricCanvas.getObjects().forEach(obj => {
        obj.selectable = activeTool === 'select';
        obj.evented = activeTool === 'select' || activeTool === 'pencil' || activeTool === 'highlighter';
      });
      fabricCanvas.renderAll();
    }
  }, [activeTool, localUser.color]);

  // Main Canvas & Yjs Initialisation Effect
  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const yElements = ydoc.getMap<ElementData>('elements');
    yElementsRef.current = yElements;

    const yRoomName = ydoc.getText('roomName');
    yRoomNameRef.current = yRoomName;
    
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
    providerRef.current = wsProvider;
    
    wsProvider.on('status', (event: { status: string }) => setStatus(event.status));

    const awareness = wsProvider.awareness;
    awareness.setLocalStateField('user', {
      name: localUser.name,
      color: localUser.color,
    });

    // Sync room name observer
    const handleRoomNameObserver = () => {
      // Wrapped in setTimeout to prevent cascading render warning during first init
      setTimeout(() => {
        setRoomName(yRoomName.toString() || 'Main Workspace');
      }, 0);
    };
    yRoomName.observe(handleRoomNameObserver);

    // Synchronize selection tracking and pointer trails across users
    const handleAwarenessChange = () => {
      const states = awareness.getStates();
      const users: { id: number; name: string; color: string; cursor?: { x: number; y: number } }[] = [];
      const remoteSels: { [clientId: number]: { left: number; top: number; width: number; height: number; color: string; name: string } } = {};

      states.forEach((state: Record<string, unknown>, clientID) => {
        const user = state.user as { name: string; color: string } | undefined;
        if (clientID !== ydoc.clientID && user) {
          users.push({
            id: clientID,
            name: user.name,
            color: user.color,
            cursor: state.cursor as { x: number; y: number } | undefined,
          });

          if (state.selectionRect) {
            remoteSels[clientID] = {
              ...(state.selectionRect as { left: number; top: number; width: number; height: number }),
              color: user.color,
              name: user.name
            };
          }
        }
      });
      setRemoteUsers(users);
      setRemoteSelections(remoteSels);
    };
    awareness.on('change', handleAwarenessChange);

    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const fabricCanvas = new fabric.Canvas(canvasElement, {
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
        if ((data.type as string) === 'path' && (existing as unknown as fabric.Path).path) return;

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
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 5, offsetY: 5 })
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
            splitByGrapheme: true
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
            left: data.position.x, top: data.position.y,
            width: data.size.width, height: data.size.height,
            fill: data.style.fill,
            rx: 8, ry: 8,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'circle') {
          obj = new fabric.Circle({
            left: data.position.x, top: data.position.y,
            radius: data.size.radius || 40,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'triangle') {
          obj = new fabric.Triangle({
            left: data.position.x, top: data.position.y,
            width: data.size.width || 100,
            height: data.size.height || 80,
            fill: data.style.fill,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'diamond') {
          obj = new fabric.Rect({
            left: data.position.x, top: data.position.y,
            width: data.size.width || 100,
            height: data.size.height || 100,
            fill: data.style.fill,
            angle: 45,
            originX: 'center',
            originY: 'center',
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'text') {
          obj = new fabric.IText(data.content || '', {
            left: data.position.x, top: data.position.y,
            fill: data.style.fill,
            fontFamily: 'Inter, sans-serif',
            fontSize: 24,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
          });
        } else if (data.type === 'stamp') {
          obj = new fabric.IText(data.content || '👍', {
            left: data.position.x, top: data.position.y,
            fontFamily: 'system-ui, sans-serif',
            fontSize: 48,
            scaleX: data.scaleX || 1,
            scaleY: data.scaleY || 1,
            editable: false,
          });
        } else if (data.type === 'image' && data.content) {
          fabric.Image.fromURL(data.content, (img) => {
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
            if (typeof data.zIndex === 'number') {
              img.moveTo(data.zIndex);
            }
            fabricCanvas.renderAll();
          }, { crossOrigin: 'anonymous' });
        } else if ((data.type as string) === 'path' && data.path) {
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

          // Auto-select immediately if locally created
          if (localCreatedIdsRef.current.has(key)) {
            fabricCanvas.setActiveObject(obj);
            setSelectedObject(obj);
            localCreatedIdsRef.current.delete(key);
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
        // Snap coordinates locally if snapToGrid is checked
        let localLeft = obj.left!;
        let localTop = obj.top!;
        if (snapToGridRef.current) {
          localLeft = Math.round(localLeft / GRID_SIZE) * GRID_SIZE;
          localTop = Math.round(localTop / GRID_SIZE) * GRID_SIZE;
          obj.set({ left: localLeft, top: localTop });
          obj.setCoords();
        }

        yElementsRef.current.set(obj.id, {
          ...data,
          position: { x: localLeft, y: localTop },
          size: { 
            width: obj.width!,
            height: obj.height!,
            radius: (obj as fabric.Circle).radius
          },
          scaleX: obj.scaleX,
          scaleY: obj.scaleY,
          zIndex: fabricRef.current.getObjects().indexOf(obj),
          content: (obj as fabric.IText).text || data.content
        });
      }
    };

    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      setZoom(zoom);
      setVpt([...fabricCanvas.viewportTransform!]);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e;

      // Laser Stamp Tool functionality
      if (activeToolRef.current === 'stamp') {
        const pointer = fabricCanvas.getPointer(opt.e);
        const id = crypto.randomUUID();
        localCreatedIdsRef.current.add(id);

        const data: ElementData = {
          id,
          type: 'stamp',
          position: { x: pointer.x - 24, y: pointer.y - 24 },
          size: { width: 48, height: 48 },
          content: selectedStampRef.current,
          style: { fill: localUser.color }
        };
        yElementsRef.current?.set(id, data);
        setActiveTool('select');
        return;
      }

      // Traditional selection validation
      if (evt.altKey === true || activeToolRef.current === 'hand' || (activeToolRef.current === 'select' && !opt.target)) {
        fabricCanvas.isDragging = true;
        fabricCanvas.selection = false;
        fabricCanvas.lastPosX = evt.clientX;
        fabricCanvas.lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      const e = opt.e;
      const pointer = fabricCanvas.getPointer(opt.e);

      // Update local cursor for awareness
      awareness.setLocalStateField('cursor', {
        x: e.clientX,
        y: e.clientY,
      });

      // Laser Pointer Trail Feature
      if (activeToolRef.current === 'hand') {
        const id = Math.random().toString();
        const laserItem = {
          id,
          x: pointer.x,
          y: pointer.y,
          opacity: 1,
          color: localUser.color,
          timestamp: Date.now()
        };
        laserTrailsRef.current.push(laserItem);
        setLaserTrails([...laserTrailsRef.current]);
      }

      if (fabricCanvas.isDragging) {
        const vpt = fabricCanvas.viewportTransform!;
        vpt[4] += e.clientX - fabricCanvas.lastPosX!;
        vpt[5] += e.clientY - fabricCanvas.lastPosY!;
        fabricCanvas.requestRenderAll();
        fabricCanvas.lastPosX = e.clientX;
        fabricCanvas.lastPosY = e.clientY;
        setVpt([...vpt]);
      }
    });

    fabricCanvas.on('mouse:up', () => {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform!);
      fabricCanvas.isDragging = false;
      fabricCanvas.selection = activeToolRef.current === 'select';
      setVpt([...fabricCanvas.viewportTransform!]);
    });

    // Helper to extract global coordinates of selected objects for PropertyMenu positioning
    const updateSelectionState = (obj: fabric.Object | null) => {
      setSelectedObject(obj);
      if (obj) {
        const rect = obj.getBoundingRect();
        setPropertyMenuRect(rect);

        // Share active selection coordinates via Yjs awareness
        awareness.setLocalStateField('selectionRect', {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setPropertyMenuRect(null);
        awareness.setLocalStateField('selectionRect', null);
      }
    };

    fabricCanvas.on('selection:created', (e) => updateSelectionState(e.target || null));
    fabricCanvas.on('selection:updated', (e) => updateSelectionState(e.target || null));
    fabricCanvas.on('selection:cleared', () => updateSelectionState(null));

    fabricCanvas.on('object:modified', updateYjs);
    fabricCanvas.on('object:moving', (e) => {
      updateYjs(e);
      if (e.target) {
        setPropertyMenuRect(e.target.getBoundingRect());
      }
    });
    fabricCanvas.on('object:scaling', (e) => {
      updateYjs(e);
      if (e.target) {
        setPropertyMenuRect(e.target.getBoundingRect());
      }
    });

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
          stroke: isHighlighter ? 'rgba(255, 255, 0, 0.4)' : localUser.color,
          strokeWidth: isHighlighter ? 20 : 3
        },
        path: path.path as unknown as (string | number)[][]
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

    // Decay process for transient laser trail lines
    const laserInterval = setInterval(() => {
      const now = Date.now();
      laserTrailsRef.current = laserTrailsRef.current
        .map(laser => {
          const age = now - laser.timestamp;
          const remainingOpacity = Math.max(0, 1 - age / 1200); // Fades completely over 1.2s
          return { ...laser, opacity: remainingOpacity };
        })
        .filter(laser => laser.opacity > 0);
      setLaserTrails([...laserTrailsRef.current]);
    }, 45);

    return () => {
      clearInterval(laserInterval);
      wsProvider.destroy();
      dbProvider.destroy();
      fabricCanvas.dispose();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      yElements.unobserve(() => {});
      yRoomName.unobserve(handleRoomNameObserver);
      awareness.off('change', handleAwarenessChange);
      fabricRef.current = null;
    };
  }, [duplicateObject, localUser.color, localUser.name]);

  const addShape = useCallback((type: Tool, payload?: string) => {
    if (!yElementsRef.current || !fabricRef.current) return;

    // Convert screen coordinates to canvas viewport absolute coords
    const center = fabricRef.current.getVpCenter();
    const id = crypto.randomUUID();
    const stickyColors = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

    // Track locally created IDs to programmatically active-select them immediately upon render
    localCreatedIdsRef.current.add(id);

    let data: ElementData = {
      id,
      type: type as 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'arrow' | 'image' | 'stamp',
      position: { x: center.x - 50, y: center.y - 40 },
      size: type === 'sticky' ? { width: 150, height: 150 } : (type === 'circle' ? { width: 80, height: 80, radius: 40 } : { width: 120, height: 80 }),
      content: (type === 'text' || type === 'sticky') ? 'Type something...' : undefined,
      style: { fill: type === 'sticky' ? stickyColors[Math.floor(Math.random() * stickyColors.length)] : COLORS[Math.floor(Math.random() * COLORS.length)] }
    };

    if (type === 'image' && payload) {
      data = {
        ...data,
        content: payload,
        size: { width: 400, height: 300 },
        style: { fill: 'transparent' }
      };
    }

    if (type !== 'select' && type !== 'pencil' && type !== 'highlighter' && type !== 'hand') {
      yElementsRef.current.set(id, data);
    }
  }, []);

  const handleToolChange = (tool: Tool, payload?: string) => {
    if (tool !== 'select' && tool !== 'pencil' && tool !== 'highlighter' && tool !== 'hand' && tool !== 'stamp') {
      addShape(tool, payload);
      setActiveTool('select');
    } else {
      setActiveTool(tool);
    }
  };

  const updateProperty = (props: Partial<fabric.IObjectOptions> & { content?: string; zAction?: 'front' | 'back' }) => {
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

        // Sorting Z-Index Layer Alignment
        if (props.zAction && fabricRef.current) {
          const objs = fabricRef.current.getObjects();
          if (props.zAction === 'front') {
            obj.bringToFront();
            newData.zIndex = objs.length - 1;
          } else {
            obj.sendToBack();
            newData.zIndex = 0;
          }
        }

        yElementsRef.current?.set(obj.id, newData);
      }
    });
    fabricRef.current.requestRenderAll();
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

    const objs = fabricRef.current.getObjects();
    if (objs.length === 0) {
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      setZoom(1);
      setVpt([1, 0, 0, 1, 0, 0]);
      return;
    }

    // "Fit to Screen" calculation
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    objs.forEach(o => {
      const rect = o.getBoundingRect(true);
      if (rect.left < minX) minX = rect.left;
      if (rect.top < minY) minY = rect.top;
      if (rect.left + rect.width > maxX) maxX = rect.left + rect.width;
      if (rect.top + rect.height > maxY) maxY = rect.top + rect.height;
    });

    const boardW = maxX - minX;
    const boardH = maxY - minY;
    const pad = 80;

    const scaleX = (window.innerWidth - pad) / boardW;
    const scaleY = (window.innerHeight - pad) / boardH;
    let newZoom = Math.min(scaleX, scaleY, 2); // Cap at 200% max fit zoom
    if (newZoom < 0.1) newZoom = 0.1;

    const centerX = minX + boardW / 2;
    const centerY = minY + boardH / 2;

    const vpt = fabricRef.current.viewportTransform!;
    vpt[0] = newZoom;
    vpt[3] = newZoom;
    vpt[4] = window.innerWidth / 2 - centerX * newZoom;
    vpt[5] = window.innerHeight / 2 - centerY * newZoom;

    fabricRef.current.requestRenderAll();
    setZoom(newZoom);
    setVpt([...vpt]);
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
    <div ref={containerRef} className="relative w-screen h-screen bg-slate-50 overflow-hidden select-none">
      {/* Loading overlay for establishing server connection */}
      {status === 'connecting' && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center animate-bounce">
              <Activity size={32} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Connecting to SyncBoard</h2>
              <p className="text-sm text-slate-500 mt-1">Establishing secure collaborative web-socket session...</p>
            </div>
          </div>
        </div>
      )}

      {/* Snap to Grid Alignment Controls */}
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "fixed bottom-6 right-6 p-3 rounded-2xl shadow-xl border backdrop-blur-xl transition-all duration-200 z-50 flex items-center justify-center cursor-pointer",
          snapToGrid
            ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700"
            : "bg-white/90 text-slate-500 border-slate-200/50 hover:bg-slate-100"
        )}
        title="Snap to Grid Toggle"
      >
        <Grid size={20} className={cn(snapToGrid && "animate-pulse")} />
      </button>

      {/* Laser Pointer Trail overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-30">
        {laserTrails.map((trail) => {
          // Convert absolute canvas coord position to client screen coordinate using the vpt state (No ref-access during render!)
          const screenX = trail.x * vpt[0] + vpt[4];
          const screenY = trail.y * vpt[3] + vpt[5];
          return (
            <div
              key={trail.id}
              className="absolute w-2 h-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75 pointer-events-none"
              style={{
                left: screenX,
                top: screenY,
                backgroundColor: trail.color,
                opacity: trail.opacity,
                boxShadow: `0 0 8px ${trail.color}`,
              }}
            />
          );
        })}
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
        onLocalUserChange={setLocalUser}
      />

      <Toolbar
        activeTool={activeTool}
        setActiveTool={handleToolChange}
        onClear={clearBoard}
        selectedStamp={selectedStamp}
        setSelectedStamp={setSelectedStamp}
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
      />

      <CursorsLayer users={remoteUsers} vpt={vpt} />

      {/* Remote Selections Render Layer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
        {Object.entries(remoteSelections).map(([clientId, sel]) => {
          if (!sel) return null;
          // Apply current canvas zoom/viewport transform to other users selection boxes
          const v0 = vpt[0];
          const v3 = vpt[3];
          const v4 = vpt[4];
          const v5 = vpt[5];

          const left = sel.left * v0 + v4;
          const top = sel.top * v3 + v5;
          const width = sel.width * v0;
          const height = sel.height * v3;

          return (
            <div
              key={clientId}
              className="absolute border-2 pointer-events-none transition-all duration-75"
              style={{
                left,
                top,
                width,
                height,
                borderColor: sel.color,
              }}
            >
              <div
                className="absolute top-0 left-0 transform -translate-y-full px-1.5 py-0.5 text-[9px] font-bold text-white rounded-t-sm whitespace-nowrap"
                style={{ backgroundColor: sel.color }}
              >
                {sel.name}
              </div>
            </div>
          );
        })}
      </div>

      <canvas ref={canvasRef} />
    </div>
  );
};
