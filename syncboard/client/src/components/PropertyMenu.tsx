import React, { useState } from 'react';
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
  SlidersHorizontal,
  Tag,
  CircleDot,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { COLORS, STICKY_COLORS, FONTS, FONT_SIZES, STATUS_BADGES } from '../constants';
import type { StatusBadge } from '../constants';

export interface PropertyUpdateProps extends Partial<fabric.ITextOptions> {
  content?: string;
  zAction?: 'front' | 'back' | 'forward' | 'backward';
  strokeDashArray?: number[];
  opacity?: number;
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
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showMoreControls, setShowMoreControls] = useState(false);

  if (!selectedObject) return null;

  const rect = propertyMenuRect || selectedObject.getBoundingRect();

  // Screen clamping positioning
  const rawLeft = rect.left + rect.width / 2;
  const rawTop = rect.top - 65;

  const clampedLeft = Math.max(180, Math.min(window.innerWidth - 180, rawLeft));
  const clampedTop = Math.max(
    80,
    Math.min(window.innerHeight - 80, rawTop < 80 ? rect.top + rect.height + 15 : rawTop)
  );

  const isText =
    selectedObject instanceof fabric.IText ||
    (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  const isSticky = selectedObject instanceof fabric.Group && selectedObject.item(0) instanceof fabric.Rect;

  const colorPalette = isSticky ? STICKY_COLORS : COLORS;

  const handleApplyStatusBadge = (badge: StatusBadge) => {
    if (selectedObject instanceof fabric.IText) {
      onUpdate({ content: `[${badge.label}] ${selectedObject.text || ''}` });
    } else if (selectedObject instanceof fabric.Group) {
      const text = selectedObject.item(1) as unknown as fabric.IText;
      const currentText = text?.text || '';
      const cleanText = currentText.replace(/^\[.*?\]\s*/, '');
      onUpdate({ content: `[${badge.label}] ${cleanText}` });
    } else {
      onUpdate({ content: badge.label });
    }
    setShowStatusPicker(false);
  };

  return (
    <div
      className="fixed flex flex-col items-center gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/80 z-50 animate-in fade-in zoom-in-95 duration-150 -translate-x-1/2"
      style={{
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`,
      }}
    >
      <div className="flex items-center gap-1.5">
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

        {/* Status Tag Picker Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowStatusPicker(!showStatusPicker)}
            className={cn(
              'p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold',
              showStatusPicker
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-600 hover:bg-slate-100'
            )}
            title="Add Status Tag"
          >
            <Tag size={15} />
          </button>

          {showStatusPicker && (
            <div className="absolute left-0 top-9 bg-white/95 backdrop-blur-xl p-2 rounded-xl shadow-xl border border-slate-200/80 z-50 flex flex-col gap-1 w-36 animate-in fade-in zoom-in-95 duration-150">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                Status Tag
              </span>
              {STATUS_BADGES.map((badge) => (
                <button
                  key={badge.id}
                  onClick={() => handleApplyStatusBadge(badge)}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-left transition-transform hover:scale-105 flex items-center justify-between"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Font Controls if text object */}
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

            <select
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
              className="px-2 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 text-slate-700 cursor-pointer focus:outline-none"
              defaultValue="24"
              title="Font Size"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
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
            title="Toggle Stroke Border"
          >
            <Square size={16} />
          </button>
        )}

        {/* More Formatting Controls Toggle */}
        <button
          onClick={() => setShowMoreControls(!showMoreControls)}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            showMoreControls
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-600 hover:bg-slate-100'
          )}
          title="More Formatting Controls"
        >
          <SlidersHorizontal size={16} />
        </button>

        <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

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

      {/* Expanded Formatting Controls Panel */}
      {showMoreControls && (
        <div className="w-full pt-2 border-t border-slate-200/60 flex items-center justify-between gap-3 text-xs">
          {/* Opacity Control */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <CircleDot size={12} /> Opacity
            </span>
            {[1, 0.75, 0.5, 0.25].map((op) => (
              <button
                key={op}
                onClick={() => onUpdate({ opacity: op })}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors',
                  (selectedObject.opacity ?? 1) === op
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                )}
              >
                {op * 100}%
              </button>
            ))}
          </div>

          {/* Stroke Style Control */}
          {!isSticky && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500">Style</span>
              <button
                onClick={() => onUpdate({ strokeDashArray: [] })}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700"
                title="Solid Stroke"
              >
                Solid
              </button>
              <button
                onClick={() => onUpdate({ strokeDashArray: [6, 6] })}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700"
                title="Dashed Stroke"
              >
                Dashed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
