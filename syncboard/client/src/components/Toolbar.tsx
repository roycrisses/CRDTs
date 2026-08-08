import React, { useState } from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Smile, Highlighter, Zap, Triangle, Diamond } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'laser' | 'stamp' | 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'hand' | 'arrow';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, stampEmoji?: string) => void;
  onClear: () => void;
}

const STAMPS = ['👍', '❤️', '🔥', '👏', '💡', '😂', '🎉', '🚀'];

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear }) => {
  const [showStamps, setShowStamps] = useState(false);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'laser', icon: Zap, label: 'Laser Pointer (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'diamond', icon: Diamond, label: 'Diamond' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    { id: 'stamp', icon: Smile, label: 'Stamp' },
  ] as const;

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50">
      {tools.map((tool) => {
        const isStamp = tool.id === 'stamp';
        return (
          <div key={tool.id} className="relative group">
            <button
              onClick={() => {
                if (isStamp) {
                  setShowStamps(!showStamps);
                } else {
                  setShowStamps(false);
                  setActiveTool(tool.id);
                }
              }}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 w-full flex items-center justify-center relative cursor-pointer",
                activeTool === tool.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
              title={tool.label}
            >
              <tool.icon size={22} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
              <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                {tool.label}
              </span>
            </button>

            {isStamp && showStamps && (
              <div className="absolute left-16 top-0 flex gap-1.5 p-2 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-left-2 duration-150 z-50">
                {STAMPS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setActiveTool('stamp', emoji);
                      setShowStamps(false);
                    }}
                    className="w-10 h-10 flex items-center justify-center text-xl hover:bg-slate-100 rounded-lg active:scale-90 transition-all cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="h-px bg-slate-200/50 my-1 mx-2" />
      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative cursor-pointer"
        title="Clear Board"
      >
        <Trash2 size={22} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Clear Board
        </span>
      </button>
    </div>
  );
};
