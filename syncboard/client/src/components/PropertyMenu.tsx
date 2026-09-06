import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { COLORS, STICKY_COLORS, FONTS } from '../constants';

export interface PropertyUpdateProps extends Partial<fabric.ITextOptions> {
  content?: string;
  zAction?: 'front' | 'back';
}

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  propertyMenuRect: { left: number; top: number; width: number; height: number } | null;
  onUpdate: (props: PropertyUpdateProps) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  selectedObject,
  propertyMenuRect,
  onUpdate,
  onDuplicate,
  onDelete,
}) => {
  if (!selectedObject || !propertyMenuRect) return null;

  const isText =
    selectedObject instanceof fabric.IText ||
    (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  const isSticky = selectedObject instanceof fabric.Group && (selectedObject as fabric.Group).item(0) instanceof fabric.Rect;

  // Calculate clamped viewport position
  const rawLeft = propertyMenuRect.left + propertyMenuRect.width / 2;
  const rawTop = propertyMenuRect.top - 65;

  const clampedLeft = Math.min(Math.max(180, rawLeft), window.innerWidth - 180);
  const clampedTop = Math.max(80, rawTop);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${clampedLeft}px`,
    top: `${clampedTop}px`,
    transform: 'translateX(-50%)',
  };

  const activeColors = isSticky ? STICKY_COLORS : COLORS;

  return (
    <div
      className="flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/60 z-50 animate-fade-in-zoom"
      style={style}
    >
      {/* Color Swatches */}
      <div className="flex items-center gap-1 px-1">
        {activeColors.slice(0, 7).map((colorHex) => (
          <button
            key={colorHex}
            onClick={() => onUpdate({ fill: colorHex })}
            className="w-5 h-5 rounded-full border border-slate-300/60 hover:scale-125 transition-transform cursor-pointer shadow-2xs"
            style={{ backgroundColor: colorHex }}
            title="Change Fill Color"
          />
        ))}
      </div>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Stroke Toggle */}
      {!isSticky && (
        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 3 : 0, stroke: (selectedObject.fill as string) || '#6366f1' });
          }}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            selectedObject.strokeWidth ? "bg-indigo-100 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
          )}
          title="Toggle Stroke / Border"
        >
          <Square size={16} />
        </button>
      )}

      {/* Text & Font Controls */}
      {isText && (
        <>
          <button
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => {
              if (selectedObject instanceof fabric.IText) {
                selectedObject.enterEditing();
              } else if (selectedObject instanceof fabric.Group) {
                const textObj = selectedObject.item(1) as unknown as fabric.IText;
                textObj.enterEditing();
              }
            }}
            title="Edit Text"
          >
            <Type size={16} />
          </button>

          {/* Font Family selector */}
          <div className="relative group flex items-center">
            <select
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 px-2 py-1 rounded-lg outline-none cursor-pointer border border-slate-200"
              defaultValue="Inter, sans-serif"
            >
              {FONTS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Z-Index / Layer Ordering */}
      <button
        onClick={() => onUpdate({ zAction: 'front' })}
        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Bring to Front"
      >
        <ArrowUp size={16} />
      </button>
      <button
        onClick={() => onUpdate({ zAction: 'back' })}
        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Send to Back"
      >
        <ArrowDown size={16} />
      </button>

      <div className="w-px h-5 bg-slate-200 mx-0.5" />

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Duplicate Element (Cmd/Ctrl+D)"
      >
        <Copy size={16} />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        title="Delete Element (Delete/Backspace)"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};
