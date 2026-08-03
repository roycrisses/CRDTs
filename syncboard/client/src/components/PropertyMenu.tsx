import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, Layers, Sliders } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
  viewportTransform: number[];
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
  { name: 'Mint', value: '#dcfce7' },
  { name: 'Peach', value: '#fee2e2' },
  { name: 'Charcoal', value: '#1e293b' },
];

const FONT_FAMILIES = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'Courier New, monospace' },
];

const FONT_SIZES = [14, 16, 20, 24, 32, 48, 64];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate, viewportTransform }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  // Calculate viewport screen space coordinates for the selected object using the viewportTransform prop
  const rect = selectedObject.getBoundingRect();

  const vptX = viewportTransform[4];
  const vptY = viewportTransform[5];
  const zoom = viewportTransform[0];

  const leftPos = rect.left * zoom + vptX + (rect.width * zoom) / 2;
  const topPos = rect.top * zoom + vptY - 85;

  // Enforce screen boundary guards to keep the menu fully visible
  const clampedLeft = Math.max(180, Math.min(window.innerWidth - 180, leftPos));
  const clampedTop = Math.max(80, topPos);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${clampedLeft}px`,
    top: `${clampedTop}px`,
    transform: 'translateX(-50%)',
  };

  // Safe type helpers
  const getSelectedColor = () => {
    return (selectedObject.fill as string) || '#6366f1';
  };

  const getSelectedOpacity = () => {
    return typeof selectedObject.opacity === 'number' ? selectedObject.opacity : 1;
  };

  const getSelectedFontFamily = () => {
    if (selectedObject instanceof fabric.IText) {
      return selectedObject.fontFamily || 'Inter, sans-serif';
    } else if (selectedObject instanceof fabric.Group) {
      const text = selectedObject.item(1) as unknown as fabric.IText;
      return text?.fontFamily || 'Inter, sans-serif';
    }
    return 'Inter, sans-serif';
  };

  const getSelectedFontSize = () => {
    if (selectedObject instanceof fabric.IText) {
      return selectedObject.fontSize || 24;
    } else if (selectedObject instanceof fabric.Group) {
      const text = selectedObject.item(1) as unknown as fabric.IText;
      return text?.fontSize || 16;
    }
    return 24;
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-150 max-w-[90vw]"
      style={style}
    >
      {/* Primary properties row */}
      <div className="flex items-center gap-1.5 flex-wrap">

        {/* Colors selector */}
        <div className="flex items-center gap-1 px-1">
          {COLORS.slice(0, 8).map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className={cn(
                "w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer relative flex items-center justify-center",
                getSelectedColor() === color.value && "ring-2 ring-indigo-500 ring-offset-1"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200/80 mx-0.5" />

        {/* Stroke control */}
        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 3 : 0, stroke: selectedObject.fill as string });
          }}
          className={cn(
            "p-2 rounded-lg transition-colors cursor-pointer",
            selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
          )}
          title="Toggle Outline"
        >
          <Square size={16} />
        </button>

        {/* Layer order (z-index controls) */}
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          title="Bring to Front"
        >
          <Layers size={16} className="text-slate-600" />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          title="Send to Back"
        >
          <Layers size={16} className="text-slate-600 rotate-180" />
        </button>

        {/* Text-specific tools */}
        {isText && (
          <>
            <div className="w-px h-6 bg-slate-200/80 mx-0.5" />
            <button
              className="p-2 text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => {
                if (selectedObject instanceof fabric.IText) {
                  selectedObject.enterEditing();
                } else if (selectedObject instanceof fabric.Group) {
                  const text = selectedObject.item(1) as unknown as fabric.IText;
                  text.enterEditing();
                }
              }}
              title="Edit Text"
            >
              <Type size={16} />
            </button>
          </>
        )}
      </div>

      {/* Advanced Properties Row (Font details, Opacity) */}
      <div className="flex items-center justify-between gap-3 px-1 border-t border-slate-100 pt-2 flex-wrap text-xs">

        {/* Opacity slider */}
        <div className="flex items-center gap-1.5 min-w-[100px]">
          <Sliders size={13} className="text-slate-400" />
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={getSelectedOpacity()}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            title="Opacity"
          />
          <span className="text-[10px] text-slate-500 font-bold w-6">{Math.round(getSelectedOpacity() * 100)}%</span>
        </div>

        {/* Font Family selector */}
        {isText && (
          <div className="flex items-center gap-1">
            <select
              value={getSelectedFontFamily()}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="bg-slate-50 border border-slate-100 rounded px-1 py-0.5 text-[10px] font-semibold text-slate-600 outline-none cursor-pointer"
            >
              {FONT_FAMILIES.map((fam) => (
                <option key={fam.value} value={fam.value}>
                  {fam.name}
                </option>
              ))}
            </select>

            <select
              value={getSelectedFontSize()}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="bg-slate-50 border border-slate-100 rounded px-1 py-0.5 text-[10px] font-semibold text-slate-600 outline-none cursor-pointer"
            >
              {FONT_SIZES.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}px
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
