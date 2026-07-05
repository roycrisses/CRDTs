import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
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
  { name: 'Sky', value: '#e0f2fe' },
  { name: 'Rose', value: '#ffe4e6' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 60}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex flex-wrap items-center gap-1 px-1 max-w-[140px]">
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

      <div className="w-px h-8 bg-slate-200 mx-1" />

      <div className="flex items-center gap-0.5">
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

      <div className="w-px h-8 bg-slate-200 mx-1" />

      <div className="flex flex-col gap-1 px-2 min-w-[80px]">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
          <span>Opacity</span>
          <span>{Math.round((selectedObject.opacity || 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={selectedObject.opacity || 1}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

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
          <>
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
            <select
              className="text-xs font-bold text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer hover:bg-slate-100 rounded-lg p-1"
              value={(selectedObject as fabric.IText).fontSize || 24}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) } as any)}
            >
              {[12, 16, 24, 32, 48, 64, 80].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
};
