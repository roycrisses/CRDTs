import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ChevronUp, ChevronDown, Layers } from 'lucide-react';
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

      <div className="w-px h-6 bg-slate-200 mx-1" />

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

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1 px-2">
          <Layers size={14} className="text-slate-400 mr-1" />
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Bring to Front"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send to Back"
          >
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-2 px-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={selectedObject.opacity || 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {isText && (
          <>
            <div className="w-px h-6 bg-slate-200 mx-1" />

            <div className="flex items-center gap-1 px-1">
              <select
                className="text-xs font-medium text-slate-600 bg-slate-50 border-none rounded-lg p-1 outline-none"
                value={(selectedObject as unknown as fabric.IText).fontFamily || 'Inter, sans-serif'}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              >
                <option value="Inter, sans-serif">Sans</option>
                <option value="Georgia, serif">Serif</option>
                <option value="monospace">Mono</option>
              </select>

              <input
                type="number"
                className="w-12 text-xs font-medium text-slate-600 bg-slate-50 border-none rounded-lg p-1 outline-none"
                value={(selectedObject as unknown as fabric.IText).fontSize || 24}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                min="8"
                max="120"
              />
            </div>

            <div className="w-px h-6 bg-slate-200 mx-1" />

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
      </div>
    </div>
  );
};
