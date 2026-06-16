import React from 'react';
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
  Grid3X3
} from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClear: () => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  onImageUpload: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  snapToGrid,
  setSnapToGrid,
  onImageUpload
}) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky (S)' },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-1.5 px-1.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as Tool)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200 group relative",
              activeTool === tool.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
            title={tool.label}
          >
            <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              {tool.label}
            </span>
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-slate-200/60 mx-1" />

      <div className="flex items-center gap-1.5 px-1.5">
        <button
          onClick={onImageUpload}
          className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 group relative"
          title="Upload Image (U)"
        >
          <ImageIcon size={20} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Image (U)
          </span>
        </button>

        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative",
            snapToGrid
              ? "bg-amber-100 text-amber-700 shadow-sm border border-amber-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
          title="Snap to Grid"
        >
          <Grid3X3 size={20} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Snap to Grid
          </span>
        </button>

        <button
          onClick={onClear}
          className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
          title="Clear Board"
        >
          <Trash2 size={20} />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Clear Board
          </span>
        </button>
      </div>
    </div>
  );
};
