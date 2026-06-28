import React from 'react';
import { fabric } from 'fabric';
import { ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react';
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

const FONT_FAMILIES = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'monospace' },
  { name: 'Handwritten', value: 'cursive' },
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isIText = selectedObject instanceof fabric.IText;
  const isGroupWithText = selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText;
  const isText = isIText || isGroupWithText;

  const textObj = isIText ? (selectedObject as fabric.IText) : (isGroupWithText ? (selectedObject as fabric.Group).item(1) as unknown as fabric.IText : null);

  const rect = selectedObject.getBoundingRect();
  const canvas = selectedObject.canvas;

  if (!canvas) return null;

  // Use canvas viewport transform to calculate exact screen position
  const vpt = canvas.viewportTransform!;
  const screenLeft = (rect.left * vpt[0] + vpt[4]);
  const screenTop = (rect.top * vpt[3] + vpt[5]);
  const screenWidth = rect.width * vpt[0];

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${screenLeft + screenWidth / 2}px`,
    top: `${screenTop - 12}px`,
    transform: 'translate(-50%, -100%)',
  };

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
              className={cn(
                "w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer",
                selectedObject.fill === color.value && "ring-2 ring-indigo-500 ring-offset-2"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1">
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
        </div>
      </div>

      <div className="h-px bg-slate-100 w-full" />

      <div className="flex items-center gap-3 px-1">
        <div className="flex items-center gap-2 flex-1">
          <Minus size={14} className="text-slate-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={selectedObject.opacity ?? 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-24 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <Plus size={14} className="text-slate-400" />
        </div>

        {isText && (
          <>
            <div className="w-px h-6 bg-slate-200" />
            <select
              value={textObj?.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="text-xs font-medium bg-transparent border-none focus:ring-0 cursor-pointer text-slate-600"
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value}>{f.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg px-2 py-1">
              <button onClick={() => onUpdate({ fontSize: (textObj?.fontSize ?? 20) - 2 })} className="text-slate-500 hover:text-slate-900"><Minus size={12} /></button>
              <span className="text-[10px] font-bold w-6 text-center">{textObj?.fontSize}</span>
              <button onClick={() => onUpdate({ fontSize: (textObj?.fontSize ?? 20) + 2 })} className="text-slate-500 hover:text-slate-900"><Plus size={12} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
