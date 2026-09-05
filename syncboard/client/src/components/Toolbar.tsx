import React, { useState, useRef } from 'react';
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
import { STAMPS, MAX_IMAGE_SIZE_BYTES } from '../constants';

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
  setActiveTool: (tool: Tool, extraData?: { stampEmoji?: string; imageUrl?: string }) => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear }) => {
  const [showStampPicker, setShowStampPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mainTools = [
    { id: 'select' as Tool, icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand' as Tool, icon: Hand, label: 'Hand (H)' },
    { id: 'pencil' as Tool, icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter' as Tool, icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'arrow' as Tool, icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle' as Tool, icon: Square, label: 'Rectangle (R)' },
    { id: 'circle' as Tool, icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle' as Tool, icon: TriangleIcon, label: 'Triangle' },
    { id: 'diamond' as Tool, icon: DiamondIcon, label: 'Diamond' },
    { id: 'text' as Tool, icon: Type, label: 'Text (T)' },
    { id: 'sticky' as Tool, icon: StickyNote, label: 'Sticky Note (S)' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPEG, WebP, SVG).');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert('Image file size must be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      if (imageUrl) {
        setActiveTool('image', { imageUrl });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleToolClick = (toolId: Tool) => {
    setShowStampPicker(false);
    setActiveTool(toolId);
  };

  const handleImageButtonClick = () => {
    setShowStampPicker(false);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {mainTools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => handleToolClick(tool.id)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Stamp Emojis Tool */}
      <div className="relative">
        <button
          onClick={() => setShowStampPicker(!showStampPicker)}
          className={cn(
            "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center w-full",
            activeTool === 'stamp' || showStampPicker
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
          )}
          title="Stamp Emoji"
        >
          <Smile size={20} strokeWidth={2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
            Stamps
          </span>
        </button>

        {showStampPicker && (
          <div className="absolute left-14 top-0 bg-white/95 backdrop-blur-2xl p-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/60 grid grid-cols-4 gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 min-w-[150px]">
            {STAMPS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  setShowStampPicker(false);
                  setActiveTool('stamp', { stampEmoji: emoji });
                }}
                className="w-8 h-8 flex items-center justify-center text-lg rounded-xl hover:bg-indigo-50 hover:scale-110 transition-all cursor-pointer"
                title={`Stamp ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Upload Image Tool */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleImageButtonClick}
        className={cn(
          "p-2.5 rounded-xl transition-all duration-200 group relative flex items-center justify-center",
          activeTool === 'image'
            ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
        )}
        title="Upload Image (Max 3MB)"
      >
        <ImageIcon size={20} strokeWidth={2} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
          Upload Image
        </span>
      </button>

      <div className="h-px bg-slate-200/80 my-1 mx-2" />

      {/* Clear Board */}
      <button
        onClick={onClear}
        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative flex items-center justify-center"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-lg">
          Clear Board
        </span>
      </button>
    </div>
  );
};
