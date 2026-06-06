import React from 'react';
import { fabric } from 'fabric';
import { Square, ArrowUp, ArrowDown, Type as FontIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> & { content?: string, zIndex?: 'front' | 'back', fontSize?: number, fontFamily?: string }) => void;
}

const COLORS = [
  { name: 'Slate', value: '#1e293b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
];

const FONT_FAMILIES = [
  { name: 'Sans', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Merriweather, serif' },
  { name: 'Mono', value: 'Fira Code, monospace' },
];

const FONT_SIZES = [12, 16, 24, 32, 48, 64];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();
  const canvasElement = selectedObject.canvas?.getElement();
  const canvasRect = canvasElement?.getBoundingClientRect();

  if (!canvasRect) return null;

  // Position the menu above the selected object, relative to the viewport
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${canvasRect.left + rect.left + rect.width / 2}px`,
    top: `${canvasRect.top + rect.top - 20}px`,
    transform: 'translateX(-50%) translateY(-100%)',
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-[500]"
      style={style}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className="w-5 h-5 rounded-full border border-black/5 hover:scale-125 transition-transform cursor-pointer"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ zIndex: 'front' })}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Bring to Front"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onUpdate({ zIndex: 'back' })}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send to Back"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100 w-full" />

      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            defaultValue={selectedObject.opacity}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-24 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const currentStroke = selectedObject.strokeWidth || 0;
              onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
            }}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              selectedObject.strokeWidth ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"
            )}
            title="Toggle Stroke"
          >
            <Square size={16} />
          </button>
        </div>
      </div>

      {isText && (
        <>
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex items-center gap-2 px-1">
            <select
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="text-xs font-medium text-slate-600 bg-slate-50 border-none rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
              defaultValue={(selectedObject instanceof fabric.IText ? selectedObject.fontFamily : ((selectedObject as fabric.Group).item?.(1) as unknown as fabric.IText)?.fontFamily) || 'Sans'}
            >
              {FONT_FAMILIES.map(font => (
                <option key={font.value} value={font.value}>{font.name}</option>
              ))}
            </select>

            <select
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="text-xs font-medium text-slate-600 bg-slate-50 border-none rounded-lg px-2 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
              defaultValue={(selectedObject instanceof fabric.IText ? selectedObject.fontSize : ((selectedObject as fabric.Group).item?.(1) as unknown as fabric.IText)?.fontSize) || 24}
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
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
              <FontIcon size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
