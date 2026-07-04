import React from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Highlighter, Image as ImageIcon, Grid3X3 } from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, content?: string) => void;
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
    { id: 'image', icon: ImageIcon, label: 'Image' },
  ] as const;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setActiveTool('image', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50">
      {tools.map((tool) => (
        tool.id === 'image' ? (
          <div key={tool.id} className="relative group">
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
              onChange={handleImageUpload}
            />
            <button
              className={cn(
                "p-3 rounded-xl transition-all duration-200 text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100 w-full",
              )}
              title={tool.label}
            >
              <tool.icon size={22} strokeWidth={2} />
            </button>
            <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              {tool.label}
            </span>
          </div>
        ) : (
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
        )
      ))}
      <div className="h-px bg-slate-200/50 my-1 mx-2" />
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative",
          snapToGrid ? "bg-indigo-100 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
        )}
        title="Snap to Grid"
      >
        <Grid3X3 size={22} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Snap to Grid
        </span>
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
