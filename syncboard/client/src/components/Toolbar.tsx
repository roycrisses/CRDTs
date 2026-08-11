import React, { useRef } from 'react';
import {
  MousePointer2, Square, Circle as CircleIcon, Type, StickyNote, Pencil, Trash2, Hand, ArrowRight,
  Triangle, Image as ImageIcon, Sparkles, Smile
} from 'lucide-react';
import { cn } from '../lib/utils';
import { STAMPS } from './constants';

export type Tool = 'select' | 'pencil' | 'highlighter' | 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'hand' | 'arrow' | 'image' | 'stamp';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool, payload?: string) => void;
  onClear: () => void;
  selectedStamp: string;
  setSelectedStamp: (stamp: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  selectedStamp,
  setSelectedStamp,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Sparkles, label: 'Highlighter (I)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: Triangle, label: 'Triangle' },
    { id: 'diamond', icon: Square, label: 'Diamond', rotate: true },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    { id: 'image', icon: ImageIcon, label: 'Image Upload' },
    { id: 'stamp', icon: Smile, label: 'Emoji Stamp' },
  ] as const;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Image file size must be less than 3MB.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('Only image files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setActiveTool('image', reader.result);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value to allow uploading same file again
    e.target.value = '';
  };

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 max-h-[85vh] overflow-y-auto scrollbar-none">
      {tools.map((tool) => {
        const isSelected = activeTool === tool.id;
        return (
          <div key={tool.id} className="relative group flex items-center">
            <button
              onClick={() => {
                if (tool.id === 'image') {
                  fileInputRef.current?.click();
                } else {
                  setActiveTool(tool.id);
                }
              }}
              className={cn(
                "p-3 rounded-xl transition-all duration-200 cursor-pointer relative flex items-center justify-center",
                isSelected
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
              )}
              title={tool.label}
            >
              <tool.icon
                size={20}
                strokeWidth={isSelected ? 2.5 : 2}
                className={cn(
                  tool.id === 'diamond' && "rotate-45",
                  tool.id === 'highlighter' && "text-amber-500 fill-amber-200"
                )}
              />
            </button>
            <span className="absolute left-16 px-2 py-1 bg-slate-900 text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              {tool.label}
            </span>

            {/* Custom Stamp Sub-selector */}
            {tool.id === 'stamp' && isSelected && (
              <div className="absolute left-16 flex gap-1 p-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/50 z-50 animate-in fade-in slide-in-from-left-2 duration-200">
                {STAMPS.map((stamp) => (
                  <button
                    key={stamp}
                    onClick={() => setSelectedStamp(stamp)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-slate-100 transition-colors cursor-pointer",
                      selectedStamp === stamp && "bg-indigo-50 border border-indigo-200"
                    )}
                  >
                    {stamp}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        className="hidden"
      />

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative flex items-center justify-center cursor-pointer"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-16 px-2 py-1 bg-rose-600 text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
          Clear Board
        </span>
      </button>
    </div>
  );
};
