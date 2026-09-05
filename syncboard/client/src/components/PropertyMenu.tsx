import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { COLOR_SWATCHES, FONT_FAMILIES } from '../constants';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
  onDelete?: () => void;
}

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate, onDelete }) => {
  if (!selectedObject) return null;

  const isText =
    selectedObject instanceof fabric.IText ||
    (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  const rect = selectedObject.getBoundingRect();

  // Calculate coordinates with boundary limits to keep property menu visible
  const leftPos = Math.max(180, Math.min(window.innerWidth - 180, rect.left + rect.width / 2));
  const topPos = Math.max(80, rect.top - 65);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${leftPos}px`,
    top: `${topPos}px`,
    transform: 'translateX(-50%)',
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ fontFamily: e.target.value });
  };

  return (
    <div
      className="flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/60 z-50 animate-in fade-in zoom-in-95 duration-150"
      style={style}
    >
      {/* Color Swatches */}
      <div className="flex items-center gap-1 px-1">
        {COLOR_SWATCHES.map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-5 h-5 rounded-full border border-black/10 hover:scale-125 transition-all cursor-pointer shadow-sm"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200/80 mx-0.5" />

      {/* Stroke toggle */}
      <button
        onClick={() => {
          const currentStroke = selectedObject.strokeWidth || 0;
          onUpdate({ strokeWidth: currentStroke === 0 ? 3 : 0, stroke: selectedObject.fill as string });
        }}
        className={cn(
          "p-2 rounded-xl transition-colors",
          selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "text-slate-600 hover:bg-slate-100"
        )}
        title="Toggle Stroke"
      >
        <Square size={18} />
      </button>

      {/* Font selector for text or sticky notes */}
      {isText && (
        <>
          <div className="w-px h-6 bg-slate-200/80 mx-0.5" />
          <select
            onChange={handleFontChange}
            className="text-xs font-semibold bg-slate-100/80 border border-slate-200 text-slate-700 px-2 py-1 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            defaultValue="Inter, sans-serif"
            title="Font Family"
          >
            {FONT_FAMILIES.map((font) => (
              <option key={font.name} value={font.value}>
                {font.name}
              </option>
            ))}
          </select>
          <button
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
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

      <div className="w-px h-6 bg-slate-200/80 mx-0.5" />

      {/* Z-Index Controls */}
      <button
        onClick={() => onUpdate({ zAction: 'front' })}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Bring Forward"
      >
        <ArrowUp size={18} />
      </button>
      <button
        onClick={() => onUpdate({ zAction: 'back' })}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Send Backward"
      >
        <ArrowDown size={18} />
      </button>

      {/* Delete Object */}
      {onDelete && (
        <>
          <div className="w-px h-6 bg-slate-200/80 mx-0.5" />
          <button
            onClick={onDelete}
            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            title="Delete Object (Delete / Backspace)"
          >
            <Trash2 size={18} />
          </button>
        </>
      )}
    </div>
  );
};
