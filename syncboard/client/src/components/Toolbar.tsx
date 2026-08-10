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
  Triangle as TriangleIcon,
  Milestone,
  Image as ImageIcon,
  Smile,
  Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool =
  | 'select'
  | 'pencil'
  | 'highlighter'
  | 'laser'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'text'
  | 'sticky'
  | 'hand'
  | 'arrow'
  | 'image'
  | 'stamp';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, content?: string) => void;
  onClear: () => void;
}

const STAMPS = ['👍', '❤️', '🔥', '👏', '⭐', '💡', '❓', '❌'];

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showStampMenu, setShowStampMenu] = useState(false);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Zap, label: 'Highlighter (I)' },
    { id: 'laser', icon: Milestone, label: 'Laser Pointer (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: TriangleIcon, label: 'Triangle' },
    { id: 'diamond', icon: Square, label: 'Diamond', className: 'rotate-45 scale-75' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('File size exceeds the 3MB limit. Please choose a smaller image.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Invalid file format. Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setActiveTool('image', base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setShowStampMenu(false);
            setActiveTool(tool.id);
          }}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
          )}
          title={tool.label}
        >
          {/* Note: diamond has custom rotation class applied */}
          <div className={tool.id === 'diamond' ? tool.className : undefined}>
            <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          </div>
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Image Upload Tool */}
      <button
        onClick={() => {
          setShowStampMenu(false);
          fileInputRef.current?.click();
        }}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative cursor-pointer text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
        )}
        title="Upload Image (Max 3MB)"
      >
        <ImageIcon size={20} strokeWidth={2} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
          Upload Image
        </span>
      </button>

      {/* Stamp Selector Tool */}
      <div className="relative">
        <button
          onClick={() => setShowStampMenu(!showStampMenu)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative cursor-pointer w-full flex items-center justify-center",
            activeTool === 'stamp' || showStampMenu
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-white hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-100"
          )}
          title="Stamps"
        >
          <Smile size={20} strokeWidth={2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
            Stamp Tool
          </span>
        </button>

        {showStampMenu && (
          <div className="absolute left-14 top-0 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-200/50 p-2 flex gap-1 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
            {STAMPS.map((stamp) => (
              <button
                key={stamp}
                onClick={() => {
                  setActiveTool('stamp', stamp);
                  setShowStampMenu(false);
                }}
                className="p-2 hover:bg-indigo-50 rounded-lg text-lg transition-transform hover:scale-125 cursor-pointer"
              >
                {stamp}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative cursor-pointer"
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
