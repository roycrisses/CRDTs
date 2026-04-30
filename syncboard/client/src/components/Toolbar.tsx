import React from 'react';
import { MousePointer2, Pencil, Square, Circle, Type, StickyNote, Trash2, Undo2, Redo2 } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'text' | 'sticky';

interface ToolbarProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolChange,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: Circle, label: 'Circle (O)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50">
      <div className="flex items-center gap-1 pr-2 border-r border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-5 h-5" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={cn(
              "p-2 rounded-lg transition-all",
              activeTool === tool.id
                ? "bg-blue-600 text-white shadow-md"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            )}
            title={tool.label}
          >
            <tool.icon className="w-5 h-5" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 pl-2 border-l border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onClear}
          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
          title="Clear Board"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
