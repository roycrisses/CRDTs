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
  Pointer,
  Triangle as TriangleIcon,
  Diamond as DiamondIcon,
  Smile,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { STAMPS } from '../constants';

export type Tool =
  | 'select'
  | 'hand'
  | 'pencil'
  | 'highlighter'
  | 'laser'
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
  setActiveTool: (tool: Tool, extraData?: { stampEmoji?: string; imageSrc?: string }) => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear }) => {
  const [showStampsMenu, setShowStampsMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const primaryTools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Pan Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'laser', icon: Pointer, label: 'Laser Pointer (L)' },
  ] as const;

  const shapeTools = [
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: TriangleIcon, label: 'Triangle' },
    { id: 'diamond', icon: DiamondIcon, label: 'Diamond' },
  ] as const;

  const contentTools = [
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP, etc.).');
      return;
    }

    // 3MB limit
    if (file.size > 3 * 1024 * 1024) {
      alert('File size exceeds the 3MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setActiveTool('image', { imageSrc: result });
      }
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be re-uploaded if desired
    e.target.value = '';
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {/* Primary navigation & drawing tools */}
      {primaryTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setShowStampsMenu(false);
            setActiveTool(tool.id as Tool);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="h-px bg-slate-200/60 my-0.5 mx-2" />

      {/* Shapes */}
      {shapeTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setShowStampsMenu(false);
            setActiveTool(tool.id as Tool);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
            {tool.label}
          </span>
        </button>
      ))}

      <div className="h-px bg-slate-200/60 my-0.5 mx-2" />

      {/* Content & Interactive */}
      {contentTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setShowStampsMenu(false);
            setActiveTool(tool.id as Tool);
          }}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Stamp Tool with Submenu */}
      <div className="relative">
        <button
          onClick={() => setShowStampsMenu((prev) => !prev)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center w-full",
            activeTool === 'stamp'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
          )}
          title="Emoji Stamps"
        >
          <Smile size={20} strokeWidth={activeTool === 'stamp' ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
            Emoji Stamps
          </span>
        </button>

        {showStampsMenu && (
          <div className="absolute left-14 top-0 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200/60 grid grid-cols-4 gap-1.5 z-50 animate-fade-in-zoom">
            {STAMPS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setActiveTool('stamp', { stampEmoji: emoji });
                  setShowStampsMenu(false);
                }}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-indigo-50 rounded-xl transition-transform hover:scale-110 active:scale-95"
                title={`Stamp ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Image Upload Button */}
      <button
        onClick={() => {
          setShowStampsMenu(false);
          fileInputRef.current?.click();
        }}
        className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 transition-all duration-200 group relative flex items-center justify-center"
        title="Upload Image"
      >
        <ImageIcon size={20} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
          Upload Image (max 3MB)
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="h-px bg-slate-200/60 my-0.5 mx-2" />

      {/* Clear Canvas */}
      <button
        onClick={onClear}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative flex items-center justify-center"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
          Clear Board
        </span>
      </button>
    </div>
  );
};
