import React from 'react';
import { Trash2, Copy, Type } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  position: { x: number; y: number };
  color: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  type: string;
}

const COLORS = [
  '#f8fafc', '#f1f5f9', '#e2e8f0', // Slates
  '#ef4444', '#f97316', '#f59e0b', // Red, Orange, Amber
  '#10b981', '#06b6d4', '#3b82f6', // Emerald, Cyan, Blue
  '#6366f1', '#8b5cf6', '#d946ef', // Indigo, Violet, Fuchsia
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  position,
  color,
  onColorChange,
  onDelete,
  onDuplicate,
  type
}) => {
  return (
    <div
      className="fixed z-50 flex flex-col gap-3 p-3 bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 ring-1 ring-slate-200/50 animate-in fade-in zoom-in duration-200"
      style={{
        left: position.x,
        top: position.y - 80,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <div className="flex flex-wrap gap-1.5 w-40">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={cn(
                "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 active:scale-95",
                color === c ? "border-slate-900" : "border-transparent"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="w-px h-10 bg-slate-100 mx-1" />
        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100/80 hover:text-slate-900 transition-all active:scale-90"
            title="Duplicate"
          >
            <Copy size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50/80 transition-all active:scale-90"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>{type}</span>
        {type === 'text' && <Type size={12} />}
      </div>
    </div>
  );
};
