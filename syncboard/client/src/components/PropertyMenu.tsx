import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ChevronUp, ChevronDown, Trash2, Hash, CaseSensitive } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & {
    content?: string,
    zAction?: 'front' | 'back',
    opacity?: number,
    fontSize?: number,
    fontFamily?: string
  }) => void;
  onDelete: () => void;
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

const FONTS = ['Inter, sans-serif', 'Georgia, serif', 'monospace', 'system-ui', 'cursive'];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate, onDelete }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  // Use canvas viewport transform to calculate real screen position
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

  return (
    <div
      className="flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1 px-1">
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200/60 mx-1" />

      <div className="flex items-center gap-1">
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

        <div className="flex items-center gap-2 px-2 group relative">
          <CaseSensitive size={16} className="text-slate-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            defaultValue={selectedObject.opacity || 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            title="Opacity"
          />
        </div>

        {isText && (
          <>
            <div className="w-px h-6 bg-slate-200/60 mx-1" />
            <select
              className="bg-transparent text-xs font-medium text-slate-600 outline-none cursor-pointer hover:bg-slate-50 p-1 rounded"
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              defaultValue={(selectedObject as fabric.IText).fontFamily}
            >
              {FONTS.map(font => (
                <option key={font} value={font} style={{ fontFamily: font }}>{font.split(',')[0]}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 px-1">
              <Hash size={14} className="text-slate-400" />
              <input
                type="number"
                className="w-10 bg-transparent text-xs font-medium text-slate-600 outline-none p-1 rounded hover:bg-slate-50"
                min="8"
                max="120"
                defaultValue={(selectedObject as fabric.IText).fontSize || 24}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              />
            </div>
            <button
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
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
          </>
        )}

        <div className="w-px h-6 bg-slate-200/60 mx-1" />

        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          title="Bring to Front"
        >
          <ChevronUp size={18} />
        </button>

        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          title="Send to Back"
        >
          <ChevronDown size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200/60 mx-1" />

        <button
          onClick={onDelete}
          className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
