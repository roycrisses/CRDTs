import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ArrowUp, ArrowDown, Layers } from 'lucide-react';
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
    top: `${rect.top - 80}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 animate-in fade-in zoom-in duration-200"
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

      <div className="h-px bg-slate-200/50 mx-1" />

      <div className="flex items-center gap-2 px-1">
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

        <div className="w-px h-6 bg-slate-200" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Bring to Front"
          >
            <ArrowUp size={18} />
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send to Back"
          >
            <ArrowDown size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200" />

        <div className="flex items-center gap-2">
          <Layers size={14} className="text-slate-400" />
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            defaultValue={selectedObject.opacity || 1}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {isText && (
        <div className="flex items-center gap-2 px-1 py-1 bg-slate-50/50 rounded-xl">
          <select
            className="text-[10px] bg-transparent border-none focus:outline-none text-slate-600 font-medium"
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            defaultValue={(selectedObject as fabric.IText).fontFamily || 'Inter, sans-serif'}
          >
            <option value="Inter, sans-serif">Inter</option>
            <option value="Georgia, serif">Serif</option>
            <option value="ui-monospace, monospace">Mono</option>
            <option value="'Comic Sans MS', cursive">Handwritten</option>
          </select>
          <div className="w-px h-3 bg-slate-200" />
          <select
            className="text-[10px] bg-transparent border-none focus:outline-none text-slate-600 font-medium"
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
            defaultValue={(selectedObject as fabric.IText).fontSize || 24}
          >
            <option value="12">12</option>
            <option value="16">16</option>
            <option value="24">24</option>
            <option value="32">32</option>
            <option value="48">48</option>
            <option value="64">64</option>
          </select>
        </div>
      )}
    </div>
  );
};
