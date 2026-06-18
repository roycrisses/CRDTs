import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, Layers, ArrowUp, ArrowDown } from 'lucide-react';
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

const FONTS = [
  { name: 'Sans', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, monospace' },
  { name: 'Hand', value: 'Comic Sans MS, cursive' },
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();

  // Position the menu above the selected object, account for viewport
  const canvas = selectedObject.canvas;
  if (!canvas) return null;

  const vpt = canvas.viewportTransform!;
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${(rect.left + rect.width / 2) * vpt[0] + vpt[4]}px`,
    top: `${rect.top * vpt[3] + vpt[5] - 70}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1 px-1">
        {COLORS.slice(0, 7).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-slate-200 hover:scale-110 transition-transform cursor-pointer"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          title="Bring to Front"
        >
          <ArrowUp size={18} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          title="Send to Back"
        >
          <ArrowDown size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <div className="flex items-center gap-2 px-2">
        <Layers size={16} className="text-slate-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          defaultValue={selectedObject.opacity}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      {(isText || selectedObject instanceof fabric.IText) && (
        <>
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <select
            className="text-xs font-bold bg-transparent border-none outline-none text-slate-700 cursor-pointer"
            defaultValue={(selectedObject as unknown as fabric.IText).fontFamily || 'Inter, sans-serif'}
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
          >
            {FONTS.map(font => (
              <option key={font.value} value={font.value}>{font.name}</option>
            ))}
          </select>
        </>
      )}

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
