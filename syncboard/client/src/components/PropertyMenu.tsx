import React from 'react';
import { fabric } from 'fabric';
import { MoveUp, MoveDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  activeObject: fabric.Object | null;
  onUpdate: (properties: Partial<fabric.IObjectOptions>) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  position: { x: number; y: number };
}

const COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#000000', '#ffffff', '#94a3b8'
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  activeObject,
  onUpdate,
  onBringToFront,
  onSendToBack,
  position
}) => {
  if (!activeObject) return null;

  return (
    <div
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 flex items-center gap-2 animate-in fade-in zoom-in duration-200"
      style={{
        left: position.x,
        top: position.y - 60,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex items-center gap-1 px-1">
        {COLORS.map(color => (
          <button
            key={color}
            onClick={() => onUpdate({ fill: color })}
            className={cn(
              "w-6 h-6 rounded-md border border-slate-200 transition-transform hover:scale-110",
              activeObject.fill === color && "ring-2 ring-indigo-500 ring-offset-2"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={onBringToFront}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Bring to Front"
        >
          <MoveUp size={18} />
        </button>
        <button
          onClick={onSendToBack}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Send to Back"
        >
          <MoveDown size={18} />
        </button>
      </div>
    </div>
  );
};
