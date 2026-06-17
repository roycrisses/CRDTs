import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, BringToFront, SendToBack, Minus, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
  vpt: number[];
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

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate, vpt }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const textObj = selectedObject instanceof fabric.IText ? selectedObject : (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText ? selectedObject.item(1) as unknown as fabric.IText : null);

  // Get bounding rect in canvas coordinates (without zoom/pan)
  const rect = selectedObject.getBoundingRect(true, true);

  // Transform to viewport coordinates
  const left = (rect.left + rect.width / 2) * vpt[0] + vpt[4];
  const top = rect.top * vpt[3] + vpt[5];

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top - 70}px`,
    transform: 'translateX(-50%)',
  };

  const fontFamilies = ['Inter, sans-serif', 'Georgia, serif', 'Courier New, monospace', 'Comic Sans MS, cursive'];

  return (
    <div
      className="flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1.5 px-1">
        {COLORS.slice(0, 8).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer shadow-sm"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-slate-200 mx-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          title="Bring to Front"
        >
          <BringToFront size={18} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          title="Send to Back"
        >
          <SendToBack size={18} />
        </button>
      </div>

      <div className="w-px h-8 bg-slate-200 mx-1" />

      <div className="flex items-center gap-2 px-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Opacity</span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          defaultValue={selectedObject.opacity || 1}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      {isText && textObj && (
        <>
          <div className="w-px h-8 bg-slate-200 mx-1" />
          <div className="flex items-center gap-1">
             <select
              className="text-xs font-medium bg-slate-50 border-none rounded-lg px-2 py-1 outline-none"
              value={textObj.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            >
              {fontFamilies.map(f => (
                <option key={f} value={f}>{f.split(',')[0]}</option>
              ))}
            </select>
            <div className="flex items-center bg-slate-50 rounded-lg">
              <button
                onClick={() => onUpdate({ fontSize: Math.max(8, (textObj.fontSize || 20) - 2) })}
                className="p-1.5 hover:text-indigo-600"
              >
                <Minus size={14} />
              </button>
              <span className="text-[10px] font-bold w-6 text-center">{textObj.fontSize}</span>
              <button
                onClick={() => onUpdate({ fontSize: Math.min(100, (textObj.fontSize || 20) + 2) })}
                className="p-1.5 hover:text-indigo-600"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </>
      )}

      <div className="w-px h-8 bg-slate-200 mx-1" />

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

        {isText && (
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
        )}
      </div>
    </div>
  );
};
