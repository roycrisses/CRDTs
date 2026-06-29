import React from 'react';
import { fabric } from 'fabric';
import { Type, Layers, ChevronUp, ChevronDown } from 'lucide-react';
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
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

const FONT_FAMILIES = [
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, monospace' },
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();
  const currentOpacity = (selectedObject.opacity || 1) * 100;

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 70}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/60 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1.5 px-1">
        <div className="flex items-center gap-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className={cn(
                "w-5 h-5 rounded-full border border-black/5 hover:scale-125 transition-transform cursor-pointer",
                selectedObject.fill === color.value && "ring-2 ring-indigo-500 ring-offset-1"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1.5" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            title="Bring to Front"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            title="Send to Back"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100 mx-1" />

      <div className="flex items-center gap-3 px-2 py-1">
        <div className="flex items-center gap-2 flex-1">
          <Layers size={14} className="text-slate-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={currentOpacity}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
            className="w-24 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <span className="text-[10px] font-bold text-slate-500 w-6">{Math.round(currentOpacity)}%</span>
        </div>

        {isText && (
          <div className="flex items-center gap-2">
            <div className="w-px h-4 bg-slate-200" />
            <select
              className="text-[10px] font-bold bg-transparent outline-none text-slate-600 cursor-pointer"
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              // @ts-expect-error: fontFamily exists on IText
              value={selectedObject.fontFamily || 'Inter, sans-serif'}
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.value} value={f.value}>{f.name}</option>
              ))}
            </select>
            <div className="w-px h-4 bg-slate-200" />
            <button
              onClick={() => {
                if (selectedObject instanceof fabric.IText) {
                  selectedObject.enterEditing();
                } else if (selectedObject instanceof fabric.Group) {
                  const text = selectedObject.item(1) as unknown as fabric.IText;
                  text.enterEditing();
                }
              }}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit Text"
            >
              <Type size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
