import React from 'react';
import { fabric } from 'fabric';
import {
  Type,
  Square,
  Copy,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { COLORS, FONTS } from '../lib/constants';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (
    props: Partial<fabric.ITextOptions> & {
      content?: string;
      zAction?: 'front' | 'back' | 'forward' | 'backward';
    }
  ) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  selectedObject,
  onUpdate,
  onDuplicate,
  onDelete,
}) => {
  if (!selectedObject) return null;

  const isText =
    selectedObject instanceof fabric.IText ||
    (selectedObject instanceof fabric.Group &&
      selectedObject.item(1) instanceof fabric.IText);

  const rect = selectedObject.getBoundingRect();

  // Position above the object, respecting viewport boundaries
  let leftPos = rect.left + rect.width / 2;
  let topPos = rect.top - 60;

  if (topPos < 80) topPos = rect.top + rect.height + 20;
  if (leftPos < 180) leftPos = 180;
  if (leftPos > window.innerWidth - 180) leftPos = window.innerWidth - 180;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${leftPos}px`,
    top: `${topPos}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex items-center gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in-95 duration-150"
      style={style}
    >
      {/* Colors */}
      <div className="flex items-center gap-1 px-1">
        {COLORS.slice(0, 7).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-5 h-5 rounded-full border border-black/10 hover:scale-125 transition-transform cursor-pointer shadow-xs"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

      {/* Stroke Toggle */}
      <button
        onClick={() => {
          const currentStroke = selectedObject.strokeWidth || 0;
          onUpdate({
            strokeWidth: currentStroke === 0 ? 3 : 0,
            stroke: (selectedObject.fill as string) || '#6366f1',
          });
        }}
        className={cn(
          "p-2 rounded-xl transition-colors",
          selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-500 hover:bg-slate-100"
        )}
        title="Toggle Border Stroke"
      >
        <Square size={16} />
      </button>

      {/* Font Family Picker for Text/Sticky */}
      {isText && (
        <>
          <select
            onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            defaultValue={FONTS[0].value}
            className="text-xs bg-slate-100 text-slate-700 font-medium px-2 py-1 rounded-lg border border-slate-200 outline-none cursor-pointer hover:bg-slate-200/60"
            title="Font Family"
          >
            {FONTS.map((font) => (
              <option key={font.value} value={font.value}>
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
            title="Edit Text Content"
          >
            <Type size={16} />
          </button>
        </>
      )}

      <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

      {/* Z-Index Layers */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onUpdate({ zAction: 'forward' })}
          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
          title="Bring Forward"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'backward' })}
          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
          title="Send Backward"
        >
          <ChevronDown size={16} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
          title="Bring to Front"
        >
          <ArrowUpToLine size={16} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
          title="Send to Back"
        >
          <ArrowDownToLine size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200/80 mx-0.5" />

      {/* Duplicate & Delete */}
      <button
        onClick={onDuplicate}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Duplicate Element (Cmd+D / Ctrl+D)"
      >
        <Copy size={16} />
      </button>

      <button
        onClick={onDelete}
        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
        title="Delete Element (Delete / Backspace)"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};
