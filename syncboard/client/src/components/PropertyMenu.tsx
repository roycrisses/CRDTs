import React from 'react';
import { fabric } from 'fabric';
import { Square, ArrowUp, ArrowDown, Type as TypeIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
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

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  // Use viewport coordinates to position the menu
  const canvas = selectedObject.canvas;
  if (!canvas) return null;

  const rect = selectedObject.getBoundingRect();
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

  const screenLeft = rect.left * vpt[0] + vpt[4];
  const screenTop = rect.top * vpt[3] + vpt[5];
  const screenWidth = rect.width * vpt[0];

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${screenLeft + screenWidth / 2}px`,
    top: `${screenTop - 70}px`,
    transform: 'translateX(-50%)',
  };

  const fonts = ['Inter', 'serif', 'monospace', 'cursive'];
  const fontSizes = [12, 16, 24, 32, 48, 64];

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className="w-5 h-5 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Bring to Front"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send to Back"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100 w-full" />

      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            defaultValue={selectedObject.opacity}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="w-px h-6 bg-slate-200" />

        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
          }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
          )}
          title="Toggle Stroke"
        >
          <Square size={18} />
        </button>

        {isText && (
          <div className="flex items-center gap-1">
            <select
              className="text-xs bg-slate-100 border-none rounded-md px-1 py-1 text-slate-600 focus:ring-0"
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              defaultValue={(selectedObject instanceof fabric.IText ? selectedObject.fontFamily : (selectedObject as fabric.Group).item(1).get('fontFamily' as keyof fabric.Object)) || 'Inter'}
            >
              {fonts.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <select
              className="text-xs bg-slate-100 border-none rounded-md px-1 py-1 text-slate-600 focus:ring-0"
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              defaultValue={(selectedObject instanceof fabric.IText ? selectedObject.fontSize : (selectedObject as fabric.Group).item(1).get('fontSize' as keyof fabric.Object)) || 24}
            >
              {fontSizes.map(s => <option key={s} value={s}>{s}px</option>)}
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
              <TypeIcon size={16} />
            </button>
          </div>
        )}

        {!isText && (
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
            <Square size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
