import React, { useState, useRef } from 'react';
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Diamond as DiamondIcon,
  Type,
  StickyNote,
  Pencil,
  Highlighter,
  Pointer,
  Smile,
  Image as ImageIcon,
  Trash2,
  Hand,
  ArrowRight,
  Frame,
  LayoutTemplate,
  Tag,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { STAMPS, BADGES, MAX_FILE_SIZE } from '../constants';

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
  | 'stamp'
  | 'badge'
  | 'frame';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (
    tool: Tool,
    extra?: { stampEmoji?: string; imageUrl?: string; badgeText?: string; badgeBg?: string; badgeColor?: string }
  ) => void;
  onClear: () => void;
  onOpenTemplates: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  onOpenTemplates,
}) => {
  const [showStampPicker, setShowStampPicker] = useState(false);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert('Image size exceeds 3MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        setActiveTool('select', { imageUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);

    if (e.target) e.target.value = '';
  };

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand Pan (H)' },
    { id: 'pencil', icon: Pencil, label: 'Draw (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'laser', icon: Pointer, label: 'Laser Pointer (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Connector / Arrow (A)' },
    { id: 'frame', icon: Frame, label: 'Frame Container (F)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: TriangleIcon, label: 'Triangle' },
    { id: 'diamond', icon: DiamondIcon, label: 'Diamond' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
    { id: 'stamp', icon: Smile, label: 'Emoji Stamp' },
    { id: 'badge', icon: Tag, label: 'Status Badge' },
    { id: 'image', icon: ImageIcon, label: 'Upload Image' },
  ] as const;

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 max-h-[85vh] overflow-y-auto no-scrollbar">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Templates Button */}
      <button
        onClick={onOpenTemplates}
        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-all duration-200 group relative flex items-center justify-center font-bold shrink-0"
        title="Open Templates Gallery"
      >
        <LayoutTemplate size={18} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900/90 backdrop-blur text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
          Templates Gallery
        </span>
      </button>

      <div className="h-px bg-slate-200/80 my-0.5 mx-2 shrink-0" />

      {tools.map((tool) => {
        const isToolActive =
          activeTool === tool.id ||
          (tool.id === 'stamp' && showStampPicker) ||
          (tool.id === 'badge' && showBadgePicker);

        return (
          <div key={tool.id} className="relative shrink-0">
            <button
              onClick={() => {
                if (tool.id === 'image') {
                  fileInputRef.current?.click();
                  setShowStampPicker(false);
                  setShowBadgePicker(false);
                } else if (tool.id === 'stamp') {
                  setShowStampPicker(!showStampPicker);
                  setShowBadgePicker(false);
                } else if (tool.id === 'badge') {
                  setShowBadgePicker(!showBadgePicker);
                  setShowStampPicker(false);
                } else {
                  setShowStampPicker(false);
                  setShowBadgePicker(false);
                  setActiveTool(tool.id as Tool);
                }
              }}
              className={cn(
                'p-2 rounded-xl transition-all duration-200 group relative flex items-center justify-center',
                isToolActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
              )}
              title={tool.label}
            >
              <tool.icon size={18} strokeWidth={isToolActive ? 2.5 : 2} />
              <span className="absolute left-14 px-2 py-1 bg-slate-900/90 backdrop-blur text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
                {tool.label}
              </span>
            </button>

            {/* Stamp Selector Popup */}
            {tool.id === 'stamp' && showStampPicker && (
              <div className="absolute left-14 top-0 bg-white/95 backdrop-blur-2xl p-2.5 rounded-2xl shadow-2xl border border-slate-200/80 z-50 grid grid-cols-4 gap-2 animate-in fade-in zoom-in-95 duration-150">
                {STAMPS.map((stamp) => (
                  <button
                    key={stamp.id}
                    onClick={() => {
                      setActiveTool('stamp', { stampEmoji: stamp.emoji });
                      setShowStampPicker(false);
                    }}
                    className="p-2 text-xl hover:bg-indigo-50 rounded-xl transition-transform hover:scale-125 flex items-center justify-center"
                    title={stamp.label}
                  >
                    {stamp.emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Badge Selector Popup */}
            {tool.id === 'badge' && showBadgePicker && (
              <div className="absolute left-14 top-0 bg-white/95 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl border border-slate-200/80 z-50 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150 min-w-[130px]">
                {BADGES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveTool('badge', {
                        badgeText: b.label,
                        badgeBg: b.bg,
                        badgeColor: b.color,
                      });
                      setShowBadgePicker(false);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-transform hover:scale-105 text-left shadow-xs"
                    style={{ backgroundColor: b.bg, color: b.color }}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="h-px bg-slate-200/80 my-0.5 mx-2 shrink-0" />

      <button
        onClick={onClear}
        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative flex items-center justify-center shrink-0"
        title="Clear Board"
      >
        <Trash2 size={18} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-md z-50">
          Clear Board
        </span>
      </button>
    </div>
  );
};
