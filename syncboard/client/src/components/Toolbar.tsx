import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Highlighter, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClear: () => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear, snapToGrid, setSnapToGrid }) => {
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
    { id: 'image', icon: ImageIcon, label: 'Image (U)' },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-xl">
            {tool.label}
          </span>
        </button>
      ))}
      <div className="w-px h-8 bg-slate-200/60 mx-1" />
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-2.5 rounded-xl transition-all duration-200 group relative",
          snapToGrid ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
        )}
      >
        <Grid3X3 size={20} />
        <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-xl">
          Snap to Grid (G)
        </span>
      </button>
      <button
        onClick={onClear}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
      >
        <Trash2 size={20} />
        <span className="absolute -top-12 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-xl">
          Clear Board
        </span>
      </button>
    </div>
  );
};
