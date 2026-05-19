import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  activeObject: fabric.Object | null;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

const COLORS = [
  '#f8fafc', // white
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  activeObject,
  onColorChange,
  onDelete,
}) => {
  if (!activeObject) return null;

  const boundingRect = activeObject.getBoundingRect();
  const canvasElement = activeObject.canvas?.getElement();

  if (!canvasElement) return null;

  const canvasRect = canvasElement.getBoundingClientRect();

  return (
    <div
      className="fixed z-50 flex items-center gap-2 p-2 bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 -translate-x-1/2"
      style={{
        left: canvasRect.left + boundingRect.left + boundingRect.width / 2,
        top: canvasRect.top + boundingRect.top - 60,
      }}
    >
      <div className="flex items-center gap-1.5 px-1.5 border-r border-slate-200 mr-0.5">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={cn(
              "w-6 h-6 rounded-full border border-slate-200 transition-transform hover:scale-110 active:scale-95",
              activeObject.fill === color && "ring-2 ring-indigo-500 ring-offset-2"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onDelete}
          className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
