import React, { useState, useRef } from 'react';
import {
  MousePointer2,
  Hand,
  Pencil,
  Highlighter,
  Pointer,
  ArrowRight,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Diamond,
  Type,
  StickyNote,
  Smile,
  Image as ImageIcon,
  Trash2,
  Grid
} from 'lucide-react';
import { cn } from '../lib/utils';
import { STAMPS } from '../lib/constants';

export type Tool =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'highlighter'
  | 'laser'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'text'
  | 'sticky'
  | 'stamp'
  | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, extraData?: { stampEmoji?: string; imageUrl?: string }) => void;
  onClear: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  snapToGrid,
  onToggleSnapToGrid,
}) => {
  const [showStampPicker, setShowStampPicker] = useState(false);
  const [selectedStamp, setSelectedStamp] = useState(STAMPS[0].emoji);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mainTools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'laser', icon: Pointer, label: 'Laser Pointer (L)' },
  ] as const;

  const shapeTools = [
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: TriangleIcon, label: 'Triangle' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
  ] as const;

  const contentTools = [
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Image size exceeds 3MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      if (imageUrl) {
        setActiveTool('image', { imageUrl });
      }
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 z-50">
      {/* Basic Canvas Tools */}
      {mainTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setShowStampPicker(false);
            setActiveTool(tool.id as Tool);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2.5 py-1 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="h-px bg-slate-200/80 my-0.5 mx-1" />

      {/* Shapes Tools */}
      {shapeTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setShowStampPicker(false);
            setActiveTool(tool.id as Tool);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2.5 py-1 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="h-px bg-slate-200/80 my-0.5 mx-1" />

      {/* Text & Sticky Notes */}
      {contentTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setShowStampPicker(false);
            setActiveTool(tool.id as Tool);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2.5 py-1 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Emoji Stamp Tool */}
      <div className="relative">
        <button
          onClick={() => setShowStampPicker(!showStampPicker)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center w-full",
            activeTool === 'stamp'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Emoji Stamp"
        >
          {activeTool === 'stamp' ? (
            <span className="text-lg leading-none">{selectedStamp}</span>
          ) : (
            <Smile size={20} />
          )}
          <span className="absolute left-14 px-2.5 py-1 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
            Emoji Stamp
          </span>
        </button>

        {showStampPicker && (
          <div className="absolute left-14 top-0 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200 grid grid-cols-4 gap-1.5 z-50 animate-in fade-in duration-150">
            {STAMPS.map((stamp) => (
              <button
                key={stamp.id}
                onClick={() => {
                  setSelectedStamp(stamp.emoji);
                  setShowStampPicker(false);
                  setActiveTool('stamp', { stampEmoji: stamp.emoji });
                }}
                className="p-2 text-xl hover:bg-slate-100 rounded-xl transition-transform hover:scale-125"
                title={stamp.label}
              >
                {stamp.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Upload Tool */}
      <button
        onClick={() => {
          setShowStampPicker(false);
          fileInputRef.current?.click();
        }}
        className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 group relative flex items-center justify-center"
        title="Upload Image"
      >
        <ImageIcon size={20} />
        <span className="absolute left-14 px-2.5 py-1 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
          Upload Image (Max 3MB)
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="h-px bg-slate-200/80 my-0.5 mx-1" />

      {/* Grid Alignment Toggle */}
      <button
        onClick={onToggleSnapToGrid}
        className={cn(
          "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
          snapToGrid
            ? "bg-indigo-100 text-indigo-700 font-bold border border-indigo-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        title={snapToGrid ? "Snap to Grid: ON" : "Snap to Grid: OFF"}
      >
        <Grid size={20} />
        <span className="absolute left-14 px-2.5 py-1 bg-slate-900/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
          {snapToGrid ? 'Snap to Grid (ON)' : 'Snap to Grid (OFF)'}
        </span>
      </button>

      {/* Clear Canvas Tool */}
      <button
        onClick={() => {
          setShowStampPicker(false);
          onClear();
        }}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative flex items-center justify-center"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-14 px-2.5 py-1 bg-rose-600/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
          Clear Board
        </span>
      </button>
    </div>
  );
};
