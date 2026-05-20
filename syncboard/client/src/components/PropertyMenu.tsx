import React from 'react';
import { Trash2 } from 'lucide-react';

interface PropertyMenuProps {
  position: { x: number; y: number };
  color: string;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b',
  '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  position,
  color,
  onColorChange,
  onDelete,
}) => {
  return (
    <div
      className="fixed z-50 flex items-center gap-2 p-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 -translate-x-1/2 -translate-y-[calc(100%+12px)]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-center gap-1 px-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className="w-6 h-6 rounded-md border border-slate-200 transition-transform hover:scale-110 active:scale-95"
            style={{
              backgroundColor: c,
              boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none'
            }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <button
        onClick={onDelete}
        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
        title="Delete"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};
