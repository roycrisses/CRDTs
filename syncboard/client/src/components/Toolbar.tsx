import React, { useRef, useState } from 'react';
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
  Triangle as TriangleIcon,
  Diamond as DiamondIcon,
  Smile,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';

const STAMPS = ['👍', '❤️', '🔥', '💡', '⭐', '🎉', '🚀', '👀'];

export type Tool =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'highlighter'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'text'
  | 'sticky'
  | 'stamp'
  | 'image';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, content?: string) => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear }) => {
  const [showStamps, setShowStamps] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: TriangleIcon, label: 'Triangle' },
    { id: 'diamond', icon: DiamondIcon, label: 'Diamond' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    { id: 'stamp', icon: Smile, label: 'Stamps / Emojis' },
    { id: 'image', icon: ImageIcon, label: 'Upload Image' },
  ] as const;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Image size should be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setActiveTool('image', dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {tools.map((tool) => (
        <div key={tool.id} className="relative group">
          <button
            onClick={() => {
              if (tool.id === 'stamp') {
                setShowStamps(!showStamps);
              } else if (tool.id === 'image') {
                fileInputRef.current?.click();
              } else {
                setShowStamps(false);
                setActiveTool(tool.id);
              }
            }}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200 relative w-full flex items-center justify-center",
              activeTool === tool.id
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
            )}
            title={tool.label}
          >
            <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
            <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              {tool.label}
            </span>
          </button>

          {tool.id === 'stamp' && showStamps && (
            <div className="absolute left-14 top-0 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl p-2 shadow-2xl flex gap-1 z-50 animate-in fade-in zoom-in duration-150">
              {STAMPS.map((stamp) => (
                <button
                  key={stamp}
                  onClick={() => {
                    setActiveTool('stamp', stamp);
                    setShowStamps(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-xl text-xl transition-transform hover:scale-125"
                >
                  {stamp}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      <button
        onClick={onClear}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative flex items-center justify-center"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
          Clear Board
        </span>
      </button>
    </div>
  );
};
