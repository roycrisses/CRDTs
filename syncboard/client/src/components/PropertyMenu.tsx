import React from 'react';
import { fabric } from 'fabric';
import { Type, BringToFront, SendToBack, Type as TypeIcon } from 'lucide-react';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> & { content?: string; zIndexAction?: 'front' | 'back'; fontSize?: number; fontFamily?: string }) => void;
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
  const textObject = selectedObject instanceof fabric.IText
    ? selectedObject
    : (selectedObject instanceof fabric.Group ? selectedObject.item(1) as unknown as fabric.IText : null);

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
      className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1">
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
            onClick={() => onUpdate({ zIndexAction: 'front' })}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Bring to Front"
          >
            <BringToFront size={18} />
          </button>
          <button
            onClick={() => onUpdate({ zIndexAction: 'back' })}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send to Back"
          >
            <SendToBack size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

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
      </div>

      {(isText || selectedObject instanceof fabric.IText) && (
        <>
          <div className="h-px bg-slate-100 w-full" />
          <div className="flex items-center gap-2 px-1">
            <select
              className="text-xs font-medium bg-slate-50 border-none rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
              value={textObject?.fontFamily || 'Inter, sans-serif'}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
              <option value="cursive">Cursive</option>
            </select>
            <div className="flex items-center gap-1 bg-slate-50 rounded-md px-1">
              <TypeIcon size={14} className="text-slate-400" />
              <input
                type="number"
                min="8"
                max="120"
                className="w-10 text-xs font-medium bg-transparent border-none py-1 outline-none"
                defaultValue={textObject?.fontSize || 24}
                onBlur={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                onKeyDown={(e) => e.key === 'Enter' && onUpdate({ fontSize: parseInt((e.target as HTMLInputElement).value) })}
              />
            </div>
            <button
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
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
              <Type size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
