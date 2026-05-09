import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowUpRight } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'hand' | 'pencil' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'sticky';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear }) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-50 text-indigo-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}
      <div className="w-px h-8 bg-slate-100 mx-1" />
      <button
        onClick={onClear}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
      >
        <Trash2 size={20} />
        <span className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Clear Board
        </span>
      </button>
    </div>
  );
};
