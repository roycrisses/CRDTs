import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

import { Highlighter, Image as ImageIcon, Grid3X3 } from 'lucide-react';

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
    { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
    { id: 'hand', icon: Hand, label: 'Hand', shortcut: 'H' },
    { id: 'pencil', icon: Pencil, label: 'Pencil', shortcut: 'P' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter', shortcut: 'I' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
    { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle', icon: CircleIcon, label: 'Circle', shortcut: 'O' },
    { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note', shortcut: 'S' },
    { id: 'image', icon: ImageIcon, label: 'Image', shortcut: 'U' },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200/50"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          )}
          title={`${tool.label} (${tool.shortcut})`}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute bottom-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
            {tool.label} <span className="text-slate-400 ml-1">{tool.shortcut}</span>
          </span>
        </button>
      ))}

      <div className="w-px h-8 bg-slate-200/80 mx-1" />

      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-2.5 rounded-xl transition-all duration-200 group relative",
          snapToGrid ? "bg-emerald-50 text-emerald-600" : "text-slate-500 hover:bg-slate-100"
        )}
        title="Snap to Grid"
      >
        <Grid3X3 size={20} />
        <span className="absolute bottom-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Snap to Grid
        </span>
      </button>

      <button
        onClick={onClear}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute bottom-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-rose-600 text-white text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
          Clear Board
        </span>
      </button>
    </div>
  );
};
