import React from 'react';
import { fabric } from 'fabric';
import { ArrowUp, ArrowDown, Type as FontIcon } from 'lucide-react';

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
  const rect = selectedObject.getBoundingRect();

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ opacity: parseFloat(e.target.value) });
  };

  const fonts = ['Inter, sans-serif', 'serif', 'monospace', 'Comic Sans MS'];
  const fontSizes = [12, 16, 24, 32, 48, 64];

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 70}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1.5 px-1">
        <div className="flex items-center gap-1 px-1">
          {COLORS.slice(0, 10).map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className="w-5 h-5 rounded-full border border-black/5 hover:scale-125 transition-transform cursor-pointer shadow-sm"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-0.5">
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

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={selectedObject.opacity || 1}
            onChange={handleOpacityChange}
            className="w-16 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {(isText || selectedObject instanceof fabric.IText) && (
        <>
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex items-center gap-2 px-1">
            <FontIcon size={14} className="text-slate-400" />
            <select
              className="text-xs bg-slate-50 border-none rounded px-1 py-0.5 outline-none font-medium"
              value={selectedObject instanceof fabric.IText ? selectedObject.fontFamily : 'Inter, sans-serif'}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            >
              {fonts.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
            </select>
            <select
              className="text-xs bg-slate-50 border-none rounded px-1 py-0.5 outline-none font-medium"
              value={selectedObject instanceof fabric.IText ? selectedObject.fontSize : 24}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
            >
              {fontSizes.map(s => <option key={s} value={s}>{s}px</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
};
