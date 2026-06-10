import React from 'react';
import { fabric } from 'fabric';
import { Square, ArrowUp, ArrowDown, Type as TypeIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> | { content?: string; opacity?: number; fontFamily?: string; fontSize?: number }) => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
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
  { name: 'Dark', value: '#1e293b' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Orange', value: '#f97316' },
];

const FONT_FAMILIES = ['Inter', 'serif', 'monospace'];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  selectedObject,
  onUpdate,
  onBringToFront,
  onSendToBack
}) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 70}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="grid grid-cols-6 gap-1 px-1">
        {COLORS.map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-5 h-5 rounded-full border border-black/5 hover:scale-125 transition-transform cursor-pointer shadow-sm"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-8 bg-slate-200/80 mx-1" />

      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center gap-1 px-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            defaultValue={selectedObject.opacity}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            title="Opacity"
          />
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Opacity</span>
        </div>

        <div className="w-px h-8 bg-slate-200/80 mx-1" />

        <button
          onClick={onBringToFront}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
          title="Bring to Front"
        >
          <ArrowUp size={16} />
        </button>
        <button
          onClick={onSendToBack}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
          title="Send to Back"
        >
          <ArrowDown size={16} />
        </button>

        <div className="w-px h-8 bg-slate-200/80 mx-1" />

        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: (selectedObject.fill as string) || '#000000' });
          }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
          )}
          title="Toggle Stroke"
        >
          <Square size={16} />
        </button>

        {isText && (
          <>
            <div className="w-px h-8 bg-slate-200/80 mx-1" />

            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
              <select
                className="text-[10px] font-bold text-slate-600 bg-transparent outline-none px-1"
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                value={(selectedObject as any).fontFamily || 'Inter'}
              >
                {FONT_FAMILIES.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
              <input
                type="number"
                className="w-10 text-[10px] font-bold text-slate-600 bg-transparent outline-none border-l border-slate-200 px-1"
                min="12"
                max="120"
                defaultValue={(selectedObject as any).fontSize || 24}
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
              <TypeIcon size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
