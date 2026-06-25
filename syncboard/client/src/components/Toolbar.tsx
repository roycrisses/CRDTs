import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Highlighter, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onImageUpload: (file: File) => void;
  onClear: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onImageUpload, onClear, snapToGrid, onToggleSnap }) => {
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
          )}
          title={tool.label}
        >
          <tool.icon size={22} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}
      <div className="h-px bg-slate-200/50 my-1 mx-2" />
      <button
        onClick={onToggleSnap}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative",
          snapToGrid
            ? "bg-indigo-100 text-indigo-600 border-indigo-200"
            : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
        )}
        title={snapToGrid ? "Disable Snap to Grid" : "Enable Snap to Grid"}
      >
        <Grid3X3 size={22} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Snap to Grid: {snapToGrid ? 'ON' : 'OFF'}
        </span>
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-3 rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100 transition-all duration-200 group relative"
        title="Upload Image"
      >
        <ImageIcon size={22} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Upload Image
        </span>
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
      </button>
      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
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
