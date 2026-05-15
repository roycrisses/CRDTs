import React from 'react';

interface PropertyMenuProps {
  position: { x: number; y: number };
  color: string;
  onColorChange: (color: string) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#d946ef', '#f43f5e', '#64748b', '#000000'
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  position,
  color,
  onColorChange,
}) => {
  return (
    <div
      className="fixed z-[100] flex flex-wrap gap-1 p-2 bg-white rounded-xl shadow-2xl border border-slate-200 w-32"
      style={{
        left: position.x,
        top: position.y - 60,
        transform: 'translateX(-50%)'
      }}
    >
      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => onColorChange(c)}
          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
            color === c ? 'border-slate-400 scale-110' : 'border-transparent'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
};
