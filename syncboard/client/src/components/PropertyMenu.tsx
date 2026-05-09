import React from 'react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  position: { x: number; y: number };
  fill: string;
  onFillChange: (color: string) => void;
}

const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#94a3b8', // Slate
  '#000000', // Black
  '#ffffff', // White
];

const STICKY_COLORS = [
  '#fef3c7', // Yellow
  '#dcfce7', // Green
  '#dbeafe', // Blue
  '#f3e8ff', // Purple
  '#fee2e2', // Red
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  position,
  fill,
  onFillChange
}) => {
  const isStickyColor = STICKY_COLORS.includes(fill.toLowerCase());
  const colorList = isStickyColor ? STICKY_COLORS : COLORS;

  return (
    <div
      className="fixed z-50 flex items-center gap-1.5 p-1.5 bg-white rounded-xl shadow-2xl border border-slate-200"
      style={{
        left: position.x,
        top: position.y - 80, // Moved up more to avoid overlapping with scaling handles
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex items-center gap-1">
        {colorList.map((color) => (
          <button
            key={color}
            onClick={() => onFillChange(color)}
            className={cn(
              "w-6 h-6 rounded-full border border-slate-200 transition-transform hover:scale-110 active:scale-95",
              fill === color && "ring-2 ring-indigo-500 ring-offset-1"
            )}
            style={{
              backgroundColor: color,
            }}
          />
        ))}
      </div>
    </div>
  );
};
