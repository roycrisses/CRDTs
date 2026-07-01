import React, { useRef } from 'react';
import { MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight, Highlighter, Image as ImageIcon, Grid } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // We trigger the tool change with the base64 data in a way that CanvasApp can handle
        // For now, let's just set the tool to image, and we'll need a way to pass the data
        // Actually, let's pass it via a custom event or similar if we can't change the prop
        // But for simplicity, let's just make setActiveTool handle it.
        (setActiveTool as unknown as (tool: string, content: string) => void)('image', base64);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <div className="flex items-center gap-1.5 px-1.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => tool.id === 'image' ? handleImageClick() : setActiveTool(tool.id)}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 group relative",
              activeTool === tool.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            )}
            title={tool.label}
          >
            <tool.icon size={22} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
            <span className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-xl">
              {tool.label}
            </span>
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-slate-200/60 mx-1" />

      <div className="px-1.5">
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative",
            snapToGrid
              ? "bg-indigo-50 text-indigo-600 shadow-sm"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          )}
          title="Snap to Grid"
        >
          <Grid size={22} />
          <span className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-xl">
            Snap to Grid: {snapToGrid ? 'On' : 'Off'}
          </span>
        </button>
      </div>

      <div className="w-px h-8 bg-slate-200/60 mx-1" />

      <div className="px-1.5">
        <button
          onClick={onClear}
          className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
          title="Clear Board"
        >
          <Trash2 size={22} />
          <span className="absolute bottom-16 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-rose-600 text-white text-[11px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 shadow-xl">
            Clear Board
          </span>
        </button>
      </div>
    </div>
  );
};
