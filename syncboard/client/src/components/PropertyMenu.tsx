import React from 'react';
import { Trash2, Pipette } from 'lucide-react';
import { cn } from '../lib/utils';

const COLORS = [
  '#f8fafc', '#f1f5f9', '#e2e8f0', // Whites/Greys
  '#ef4444', '#f97316', '#f59e0b', // Reds/Oranges/Yellows
  '#10b981', '#06b6d4', '#3b82f6', // Greens/Cyans/Blues
  '#6366f1', '#8b5cf6', '#d946ef', // Indigos/Purples/Pinks
  '#000000', // Black
];

interface PropertyMenuProps {
  activeColor: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  position: { x: number; y: number };
}

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  activeColor,
  onColorChange,
  onDelete,
  position,
}) => {
  return (
    <div
      className="fixed z-50 flex items-center gap-2 p-2 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl transition-all duration-200"
      style={{
        left: position.x,
        top: position.y - 60, // Position above the object
        transform: 'translateX(-50%)',
      }}
    >
      <div className="flex items-center gap-1 px-1 border-r border-slate-200 mr-1">
        <Pipette size={16} className="text-slate-400 mr-1" />
        <div className="flex gap-1 max-w-[180px] flex-wrap">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={cn(
                "w-5 h-5 rounded-md border border-slate-200 transition-transform hover:scale-110 active:scale-95",
                activeColor === color && "ring-2 ring-indigo-500 ring-offset-1"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onDelete}
        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
        title="Delete"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};
