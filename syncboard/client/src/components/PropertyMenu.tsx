import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ChevronsUp, ChevronsDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  viewportRect: { left: number; top: number; width: number; height: number } | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
}

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Mint', value: '#dcfce7' },
];

const FONT_FAMILIES = [
  { name: 'Sans', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'Courier New, monospace' },
];

const FONT_SIZES = [14, 16, 20, 24, 32, 48];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  selectedObject,
  viewportRect,
  onUpdate
}) => {
  if (!selectedObject || !viewportRect) return null;

  // Determine element types
  const isText =
    selectedObject instanceof fabric.IText ||
    (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  // Determine current active properties
  const currentFill = selectedObject.fill as string || '';
  const currentOpacity = selectedObject.opacity !== undefined ? selectedObject.opacity : 1;
  const currentStrokeWidth = selectedObject.strokeWidth || 0;

  // Enforce positioning limits: at least 180px away from left/right boundaries, and 80px from top
  let left = viewportRect.left + viewportRect.width / 2;
  let top = viewportRect.top - 80;

  const menuWidth = 440;
  const halfMenuWidth = menuWidth / 2;

  if (left - halfMenuWidth < 180) {
    left = 180 + halfMenuWidth;
  }
  if (left + halfMenuWidth > window.innerWidth - 180) {
    left = window.innerWidth - 180 - halfMenuWidth;
  }

  if (top < 80) {
    top = viewportRect.top + viewportRect.height + 25;
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      {/* Colors Row */}
      <div className="flex items-center gap-1 px-1">
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className={cn(
              "w-6 h-6 rounded-full border border-black/5 hover:scale-115 transition-transform cursor-pointer relative",
              currentFill === color.value && "ring-2 ring-indigo-500 ring-offset-1"
            )}
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="h-px bg-slate-100/80 mx-1" />

      {/* Adjustments Row */}
      <div className="flex items-center justify-between gap-3 px-1 text-xs font-semibold text-slate-500">
        {/* Opacity Control */}
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={currentOpacity}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-[10px] w-8 text-right font-mono">{Math.round(currentOpacity * 100)}%</span>
        </div>

        <div className="w-px h-5 bg-slate-100" />

        {/* Stroke Toggle */}
        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
          }}
          className={cn(
            "p-1.5 rounded-lg transition-all border border-transparent cursor-pointer",
            currentStrokeWidth > 0
              ? "bg-indigo-50 text-indigo-600 border-indigo-100"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          )}
          title="Toggle Outline"
        >
          <Square size={16} />
        </button>

        {/* Layer / Depth Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all border border-transparent cursor-pointer"
            title="Bring to Front"
          >
            <ChevronsUp size={16} />
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all border border-transparent cursor-pointer"
            title="Send to Back"
          >
            <ChevronsDown size={16} />
          </button>
        </div>
      </div>

      {/* Text Settings Row (Only visible if text/sticky note is selected) */}
      {isText && (
        <>
          <div className="h-px bg-slate-100/80 mx-1" />
          <div className="flex items-center justify-between gap-2 px-1 text-xs font-semibold text-slate-500">
            {/* Font family */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 mr-1">Font</span>
              {FONT_FAMILIES.map((fam) => (
                <button
                  key={fam.value}
                  onClick={() => onUpdate({ fontFamily: fam.value })}
                  className="px-2 py-0.5 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 text-[10px] font-medium border border-slate-100 cursor-pointer transition-colors"
                >
                  {fam.name}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-100" />

            {/* Font size */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 mr-1">Size</span>
              <select
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                className="bg-slate-50 border border-slate-200/50 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 text-[11px] font-semibold text-slate-600 cursor-pointer"
                defaultValue={16}
              >
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </div>

            {/* Direct Edit Button */}
            <button
              onClick={() => {
                if (selectedObject instanceof fabric.IText) {
                  selectedObject.enterEditing();
                } else if (selectedObject instanceof fabric.Group) {
                  const text = selectedObject.item(1) as unknown as fabric.IText;
                  text.enterEditing();
                }
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer"
              title="Edit Text Content"
            >
              <Type size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
