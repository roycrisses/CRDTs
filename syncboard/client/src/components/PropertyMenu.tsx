import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, BringToFront, SendToBack, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> & { content?: string; fontSize?: number; fontFamily?: string }) => void;
  onZIndexChange?: (action: 'front' | 'back') => void;
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
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#ffffff' },
];

const FONT_FAMILIES = [
  { name: 'Sans', value: 'Inter, system-ui, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, monospace' },
  { name: 'Handwriting', value: 'Comic Sans MS, cursive' },
];

const FONT_SIZES = [12, 16, 20, 24, 32, 48, 64];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate, onZIndexChange }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 70}px`,
    transform: 'translateX(-50%)',
  };

  const getFontSize = () => {
    if (selectedObject instanceof fabric.IText) return selectedObject.fontSize;
    if (selectedObject instanceof fabric.Group) {
      const text = selectedObject.item(1) as unknown as fabric.IText;
      return text.fontSize;
    }
    return 24;
  };

  const getFontFamily = () => {
    if (selectedObject instanceof fabric.IText) return selectedObject.fontFamily;
    if (selectedObject instanceof fabric.Group) {
      const text = selectedObject.item(1) as unknown as fabric.IText;
      return text.fontFamily;
    }
    return 'Inter, sans-serif';
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1.5 px-1">
        <div className="flex items-center gap-1 max-w-[240px] flex-wrap">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className={cn(
                "w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform cursor-pointer",
                selectedObject.fill === color.value && "ring-2 ring-indigo-500 ring-offset-2"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => onZIndexChange?.('front')}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            title="Bring to Front"
          >
            <BringToFront size={18} />
          </button>
          <button
            onClick={() => onZIndexChange?.('back')}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            title="Send to Back"
          >
            <SendToBack size={18} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100 mx-1" />

      <div className="flex items-center gap-3 px-2 py-1">
        <div className="flex items-center gap-2 flex-1">
          <Layers size={14} className="text-slate-400" />
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={selectedObject.opacity || 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            title="Opacity"
          />
        </div>

        <div className="w-px h-4 bg-slate-200" />

        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
          }}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
          )}
          title="Toggle Stroke"
        >
          <Square size={18} />
        </button>

        {isText && (
          <>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1">
              <select
                value={getFontSize()}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                className="text-xs font-medium bg-slate-50 border-none rounded-md px-1 py-1 focus:ring-0 cursor-pointer"
              >
                {FONT_SIZES.map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>
              <select
                value={getFontFamily()}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="text-xs font-medium bg-slate-50 border-none rounded-md px-1 py-1 focus:ring-0 cursor-pointer w-20 truncate"
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font.value} value={font.value}>{font.name}</option>
                ))}
              </select>
              <button
                className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
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
                <Type size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
