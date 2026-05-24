import React from 'react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  position: { x: number; y: number };
  activeColor: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

const COLORS = [
  '#f8fafc', // white-ish
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#1e293b', // slate-800
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  position,
  activeColor,
  onColorChange,
  onDelete,
}) => {
  return (
    <div
      className="fixed z-50 flex items-center gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200"
      style={{
        left: position.x,
        top: position.y - 60, // Position above the object
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-1.5 px-1">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 active:scale-95",
              activeColor === color ? "border-slate-900 shadow-sm" : "border-transparent"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="w-px h-6 bg-slate-200 mx-1" />
      <button
        onClick={onDelete}
        className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
      >
        Delete
      </button>
    </div>
  );
};
