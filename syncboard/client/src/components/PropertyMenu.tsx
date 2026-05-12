import React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#000000', '#ffffff'];
const STICKY_COLORS = ['#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'];

interface PropertyMenuProps {
  selectedObject: {
    type: string;
    fill: string;
    subType?: string;
  };
  onUpdate: (properties: { fill?: string; stroke?: string }) => void;
  onDelete: () => void;
}

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  selectedObject,
  onUpdate,
  onDelete,
}) => {
  const isSticky = selectedObject.subType === 'sticky';
  const colorList = isSticky ? STICKY_COLORS : COLORS;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
      <div className="flex items-center gap-1.5 px-2">
        {colorList.map((color) => (
          <button
            key={color}
            onClick={() => onUpdate({ fill: color })}
            className={cn(
              "w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 active:scale-95",
              selectedObject.fill === color ? "border-indigo-500" : "border-transparent"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-slate-100" />

      <button
        onClick={onDelete}
        className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
        title="Delete Object"
      >
        <Trash2 size={20} />
      </button>
    </div>
  );
};
