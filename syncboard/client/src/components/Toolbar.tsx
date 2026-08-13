import React, { useRef, useState, useEffect } from 'react';
import {
  MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2,
  Hand, ArrowRight, Triangle, Diamond, Image as ImageIcon, Sparkles, Highlighter, Smile
} from 'lucide-react';
import { cn } from '../lib/utils';
import { STAMPS } from '../constants';

export type Tool =
  | 'select' | 'pencil' | 'highlighter' | 'laser' | 'hand' | 'arrow'
  | 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky'
  | 'image' | 'stamp';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, content?: string) => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, setActiveTool, onClear }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStampMenuOpen, setIsStampMenuOpen] = useState(false);
  const stampMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (stampMenuRef.current && !stampMenuRef.current.contains(event.target as Node)) {
        setIsStampMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'laser', icon: Sparkles, label: 'Laser Pointer (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: Triangle, label: 'Triangle (Y)' },
    { id: 'diamond', icon: Diamond, label: 'Diamond (D)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Image size exceeds the 3MB limit.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Only image files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setActiveTool('image', event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be uploaded again if needed
    e.target.value = '';
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setIsStampMenuOpen(false);
            setActiveTool(tool.id);
          }}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-50"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Image Upload Tool Button */}
      <button
        onClick={() => {
          setIsStampMenuOpen(false);
          fileInputRef.current?.click();
        }}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-50"
        )}
        title="Upload Image"
      >
        <ImageIcon size={20} strokeWidth={2} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Upload Image (Max 3MB)
        </span>
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Stamp Tool Selector */}
      <div className="relative" ref={stampMenuRef}>
        <button
          onClick={() => setIsStampMenuOpen(!isStampMenuOpen)}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative w-full flex justify-center",
            activeTool === 'stamp'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-50"
          )}
          title="Stamps"
        >
          <Smile size={20} strokeWidth={activeTool === 'stamp' ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Stamp Selector
          </span>
        </button>

        {isStampMenuOpen && (
          <div className="absolute left-14 top-0 bg-white rounded-xl shadow-xl border border-slate-200/60 p-2 flex gap-1 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
            {STAMPS.map((stamp) => (
              <button
                key={stamp.emoji}
                onClick={() => {
                  setActiveTool('stamp', stamp.emoji);
                  setIsStampMenuOpen(false);
                }}
                className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title={stamp.label}
              >
                {stamp.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200/50 my-1 mx-2" />
      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
          Clear Board
        </span>
      </button>
    </div>
  );
};
