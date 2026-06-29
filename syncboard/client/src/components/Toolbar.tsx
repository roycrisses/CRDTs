import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Grid, Image as ImageIcon, Highlighter } from 'lucide-react';
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
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 transition-all duration-300">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-[0_4px_12px_rgba(79,70,229,0.4)]"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm border border-transparent"
          )}
          title={tool.label}
        >
          <tool.icon size={22} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl uppercase tracking-wider">
            {tool.label}
          </span>
        </button>
      ))}
      <div className="h-px bg-slate-200/60 my-1 mx-2" />

      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative",
          snapToGrid
            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
            : "text-slate-500 hover:bg-slate-100 border-transparent"
        )}
        title="Snap to Grid"
      >
        <Grid size={22} strokeWidth={snapToGrid ? 2.5 : 2} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl uppercase tracking-wider">
          Snap to Grid: {snapToGrid ? 'ON' : 'OFF'}
        </span>
      </button>

      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
        title="Clear Board"
      >
        <Trash2 size={22} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl uppercase tracking-wider">
          Clear Board
        </span>
      </button>
    </div>
  );
};
