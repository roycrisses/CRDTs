import React, { useRef } from 'react';
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Type,
  StickyNote,
  Pencil,
  Trash2,
  Hand,
  ArrowRight,
  Highlighter,
  Image as ImageIcon,
  Grid
} from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'hand' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, imageBase64?: string) => void;
  onClear: () => void;
  snapToGrid: boolean;
  setSnapToGrid: (val: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  snapToGrid,
  setSnapToGrid
}) => {
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
  ] as const;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setActiveTool('image', event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100"
          )}
          title={tool.label}
        >
          <tool.icon size={22} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Image Upload Tool */}
      <button
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100"
        )}
        title="Upload Image"
      >
        <ImageIcon size={22} strokeWidth={2} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Upload Image
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      {/* Snap to Grid Toggle */}
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative",
          snapToGrid
            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent hover:border-slate-100"
        )}
        title="Snap to Grid"
      >
        <Grid size={22} strokeWidth={snapToGrid ? 2.5 : 2} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Snap to Grid (20px)
        </span>
      </button>

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      {/* Clear Board */}
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
