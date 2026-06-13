import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Grid, Image as ImageIcon, Highlighter } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClear: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  snapToGrid,
  onToggleSnap,
  onImageUpload
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 transition-all duration-300 hover:shadow-[0_8px_35px_rgb(0,0,0,0.16)]">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id as Tool)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute bottom-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="w-px h-6 bg-slate-200/60 mx-1" />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 group relative"
        title="Upload Image (U)"
      >
        <ImageIcon size={20} />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={onImageUpload}
        />
        <span className="absolute bottom-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Upload Image (U)
        </span>
      </button>

      <button
        onClick={onToggleSnap}
        className={cn(
          "p-2.5 rounded-xl transition-all duration-200 group relative",
          snapToGrid ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        )}
        title="Snap to Grid"
      >
        <Grid size={20} />
        <span className="absolute bottom-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Snap to Grid: {snapToGrid ? 'ON' : 'OFF'}
        </span>
      </button>

      <div className="w-px h-6 bg-slate-200/60 mx-1" />

      <button
        onClick={onClear}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute bottom-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Clear Board
        </span>
      </button>
    </div>
  );
};
