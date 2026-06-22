import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Highlighter, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useRef } from 'react';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClear: () => void;
  onImageUpload: (file: File) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear, onImageUpload, snapToGrid, setSnapToGrid }) => {
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
  ] as const;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageUpload(file);
          e.target.value = '';
        }}
      />
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95"
              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 active:bg-slate-200/80"
          )}
          title={tool.label}
        >
          <tool.icon size={22} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
            {tool.label}
          </span>
        </button>
      ))}

      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-3 rounded-xl text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all duration-200 group relative active:scale-95"
        title="Upload Image"
      >
        <ImageIcon size={22} />
        <span className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Upload Image
        </span>
      </button>
      <div className="w-px h-8 bg-slate-200/60 mx-1" />
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative active:scale-95",
          snapToGrid ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
        )}
        title="Snap to Grid"
      >
        <Grid3X3 size={22} />
        <span className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Snap to Grid: {snapToGrid ? 'ON' : 'OFF'}
        </span>
      </button>

      <div className="w-px h-8 bg-slate-200/60 mx-1" />
      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50/80 transition-all duration-200 group relative active:scale-95"
        title="Clear Board"
      >
        <Trash2 size={22} />
        <span className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2 py-1 bg-rose-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Clear Board
        </span>
      </button>
    </div>
  );
};
