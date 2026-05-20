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
    { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { id: 'hand', icon: Hand, label: 'Hand', shortcut: 'H' },
    { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', shortcut: 'A' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: CircleIcon, label: 'Circle', shortcut: 'O' },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note', shortcut: 'S' },
  ] as const;

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          )}
          title={`${tool.label} (${tool.shortcut})`}
        >
          <tool.icon size={22} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
            {tool.label} <span className="text-slate-400 ml-1">{tool.shortcut}</span>
          </span>
        </button>
      ))}
      <div className="h-px bg-slate-100 my-1 mx-2" />
      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
        title="Clear Board"
      >
        <Trash2 size={22} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Clear Board
        </span>
      </button>
    </div>
  );
};
