import React from 'react';
import { fabric } from 'fabric';
import { Square, Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> | { content?: string; zAction?: 'front' | 'back' }) => void;
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
  const isImage = selectedObject instanceof fabric.Image;
  const rect = selectedObject.getBoundingRect();

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 65}px`,
    transform: 'translateX(-50%)',
  };

  const FONT_FAMILIES = ['Inter', 'Serif', 'Monospace', 'Comic Sans MS'];
  const FONT_SIZES = [12, 16, 24, 32, 48, 64];

  return (
    <div
      className="flex items-center gap-1 p-1.5 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      {!isImage && (
        <div className="flex items-center gap-1 px-1">
          {COLORS.slice(0, 7).map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      )}

      {!isImage && <div className="w-px h-6 bg-slate-200 mx-1" />}

      <div className="flex items-center gap-1">
        {!isText && !isImage && (
          <button
            onClick={() => {
              const currentStroke = selectedObject.strokeWidth || 0;
              onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
            }}
            className={cn(
              "p-2 rounded-lg transition-colors",
              selectedObject.strokeWidth ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
            )}
            title="Toggle Stroke"
          >
            <Square size={18} />
          </button>
        )}

        {isText && (
          <div className="flex items-center gap-1">
            <select
              className="text-xs font-bold text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 outline-none border-none hover:bg-slate-100 transition-colors"
              value={(selectedObject as fabric.IText).fontFamily || 'Inter'}
              onChange={(e) => onUpdate({ fontFamily: e.target.value } as Partial<fabric.IObjectOptions>)}
            >
              {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <select
              className="text-xs font-bold text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 outline-none border-none hover:bg-slate-100 transition-colors"
              value={(selectedObject as fabric.IText).fontSize || 24}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) } as Partial<fabric.IObjectOptions>)}
            >
              {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm rounded-lg transition-all"
            title="Bring to Front"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm rounded-lg transition-all"
            title="Send to Back"
          >
            <ArrowDown size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2 px-2">
          <Layers size={14} className="text-slate-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={selectedObject.opacity ?? 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
          />
        </div>
      </div>
    </div>
  );
};
