import React from 'react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  position: { x: number; y: number };
  color: string;
  onColorChange: (color: string) => void;
}

const COLORS = [
  '#f8fafc', // Slate 50
  '#ef4444', // Red 500
  '#f97316', // Orange 500
  '#f59e0b', // Amber 500
  '#84cc16', // Lime 500
  '#10b981', // Emerald 500
  '#06b6d4', // Cyan 500
  '#3b82f6', // Blue 500
  '#6366f1', // Indigo 500
  '#8b5cf6', // Violet 500
  '#d946ef', // Fuchsia 500
  '#f43f5e', // Rose 500
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  position,
  color,
  onColorChange,
}) => {
  return (
    <div
      className="fixed z-50 p-2 bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 flex items-center gap-1.5 transition-all duration-200"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -120%)',
      }}
    >
      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onColorChange(c)}
          className={cn(
            "w-6 h-6 rounded-full border border-slate-200 transition-transform hover:scale-125 active:scale-95",
            color === c && "ring-2 ring-indigo-500 ring-offset-2"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
};
