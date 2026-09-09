import React from 'react';
import { fabric } from 'fabric';
import {
  Type,
  Square,
  Copy,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { COLORS, STICKY_COLORS, FONTS } from '../constants';

export interface PropertyUpdateProps extends Partial<fabric.ITextOptions> {
  content?: string;
  zAction?: 'front' | 'back' | 'forward' | 'backward';
}

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  propertyMenuRect?: { left: number; top: number; width: number; height: number } | null;
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
  if (!selectedObject) return null;

  const rect = propertyMenuRect || selectedObject.getBoundingRect();

  // Screen clamping positioning
  const rawLeft = rect.left + rect.width / 2;
  const rawTop = rect.top - 65;

  const clampedLeft = Math.max(180, Math.min(window.innerWidth - 180, rawLeft));
  const clampedTop = Math.max(80, Math.min(window.innerHeight - 80, rawTop < 80 ? rect.top + rect.height + 15 : rawTop));

  const isText =
    selectedObject instanceof fabric.IText ||
    (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  const isSticky = selectedObject instanceof fabric.Group && selectedObject.item(0) instanceof fabric.Rect;

  const colorPalette = isSticky ? STICKY_COLORS : COLORS;

  return (
    <div
      className="fixed flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 z-50 animate-in fade-in zoom-in-95 duration-150 -translate-x-1/2"
      style={{
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`,
      }}
    >
      {/* Color Palette */}
      <div className="flex items-center gap-1 px-1">
        {colorPalette.slice(0, 6).map((color) => (
          <button
            key={color}
            onClick={() => onUpdate({ fill: color })}
            className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform cursor-pointer shadow-xs"
            style={{ backgroundColor: color }}
            title={`Fill Color: ${color}`}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

      {/* Font Family Selector if text object */}
      {isText && (
        <>
          <select
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 text-slate-700 cursor-pointer focus:outline-none"
            defaultValue="Inter, sans-serif"
          >
            {FONTS.map((font) => (
              <option key={font.value} value={font.value}>
                {font.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (selectedObject instanceof fabric.IText) {
                selectedObject.enterEditing();
              } else if (selectedObject instanceof fabric.Group) {
                const text = selectedObject.item(1) as unknown as fabric.IText;
                text?.enterEditing?.();
              }
            }}
            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Text"
          >
            <Type size={16} />
          </button>

          <div className="w-px h-5 bg-slate-200/80 mx-0.5" />
        </>
      )}

      {/* Stroke Toggle */}
      {!isSticky && (
        <button
          onClick={() => {
            const currentWidth = selectedObject.strokeWidth || 0;
            onUpdate({
              strokeWidth: currentWidth === 0 ? 3 : 0,
              stroke: (selectedObject.fill as string) || '#1e293b',
            });
          }}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            selectedObject.strokeWidth
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-600 hover:bg-slate-100'
          )}
          title="Toggle Stroke"
        >
          <Square size={16} />
        </button>
      )}

      {/* Z-Index Controls */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Bring to Front"
        >
          <ArrowUpToLine size={16} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'forward' })}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Bring Forward"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'backward' })}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Send Backward"
        >
          <ChevronDown size={16} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Send to Back"
        >
          <ArrowDownToLine size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

      {/* Duplicate & Delete */}
      <button
        onClick={onDuplicate}
        className="p-1.5 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
        title="Duplicate (Cmd/Ctrl+D)"
      >
        <Copy size={16} />
      </button>

      <button
        onClick={onDelete}
        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
        title="Delete Object"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};
