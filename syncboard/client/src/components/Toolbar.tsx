import React, { useRef } from 'react';
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Type,
  StickyNote,
  Pencil,
  Trash2,
  Hand,
  ArrowRight,
  Highlighter,
  Image as ImageIcon,
  Grid
} from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, payload?: string) => void;
  onClear: () => void;
  snapToGrid: boolean;
  setSnapToGrid: (val: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  snapToGrid,
  setSnapToGrid
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    { id: 'image', icon: ImageIcon, label: 'Upload Image' },
  ] as const;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Only image files are supported.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Image size must be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setActiveTool('image', reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            if (tool.id === 'image') {
              fileInputRef.current?.click();
            } else {
              setActiveTool(tool.id);
            }
          }}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      {/* Snap to Grid Toggle */}
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
          snapToGrid
            ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
        )}
        title="Snap to Grid"
      >
        <Grid size={20} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Snap to Grid: {snapToGrid ? 'ON' : 'OFF'}
        </span>
      </button>

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      {/* Clear Board */}
      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 group relative cursor-pointer"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Clear Board
        </span>
      </button>
    </div>
  );
};
