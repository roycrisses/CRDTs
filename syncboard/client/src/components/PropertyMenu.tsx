import React from 'react';
import { fabric } from 'fabric';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  activeObject: fabric.Object | null;
  onStyleChange: (style: { fill?: string; stroke?: string; strokeWidth?: number }) => void;
  position: { top: number; left: number };
}

const COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#000000',
  '#ffffff', '#94a3b8'
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  activeObject,
  onStyleChange,
  position
}) => {
  if (!activeObject) return null;

  // Determine which properties are applicable
  const isText = activeObject.type === 'i-text';
  const subType = (activeObject as { subType?: string }).subType;
  const isSticky = subType === 'sticky';
  const isArrow = subType === 'arrow';

  const getActiveFill = () => {
    if (isSticky && activeObject instanceof fabric.Group) {
      return (activeObject.item(0) as fabric.Rect).fill;
    }
    if (isArrow && activeObject instanceof fabric.Group) {
      return (activeObject.item(0) as unknown as fabric.Line).stroke;
    }
    return activeObject.fill;
  };

  const getActiveStrokeWidth = () => {
    if (isArrow && activeObject instanceof fabric.Group) {
      return (activeObject.item(0) as unknown as fabric.Line).strokeWidth;
    }
    return activeObject.strokeWidth;
  };

  const activeFill = getActiveFill();
  const activeStrokeWidth = getActiveStrokeWidth();

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-3 flex flex-col gap-3 transition-all duration-200"
      style={{
        top: position.top - 70,
        left: position.left,
        transform: 'translateX(-50%)'
      }}
    >
      <div className="flex flex-wrap gap-1.5 w-40">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onStyleChange({ fill: color })}
            className={cn(
              "w-6 h-6 rounded-md border border-slate-200 cursor-pointer hover:scale-110 transition-transform",
              activeFill === color && "ring-2 ring-indigo-500 ring-offset-1"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {!isText && !isSticky && (
        <div className="flex items-center gap-3 border-t border-slate-100 pt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stroke</span>
          <div className="flex gap-1">
            {[1, 2, 4, 8].map((width) => (
              <button
                key={width}
                onClick={() => onStyleChange({ strokeWidth: width })}
                className={cn(
                  "px-2 py-0.5 text-[10px] font-bold rounded bg-slate-50 border border-slate-200 hover:bg-slate-100",
                  activeStrokeWidth === width && "bg-indigo-50 border-indigo-200 text-indigo-600"
                )}
              >
                {width}px
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
