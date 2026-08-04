import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, Layers, Sparkles, Copy } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
  onDuplicate: () => void;
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

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate, onDuplicate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();

  // Position the menu above the selected object with window viewport containment
  const rawLeft = rect.left + rect.width / 2;
  const left = Math.max(180, Math.min(window.innerWidth - 180, rawLeft));
  const rawTop = rect.top - 80;
  const top = Math.max(80, rawTop);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${left}px`,
    top: `${top}px`,
    transform: 'translateX(-50%)',
  };

  const getActiveFill = () => {
    if (selectedObject instanceof fabric.Group) {
      const rectObj = selectedObject.item(0);
      return rectObj ? rectObj.fill : '';
    }
    return selectedObject.fill || '';
  };

  const activeFill = getActiveFill() as string;

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className={cn(
                "w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer",
                activeFill.toLowerCase() === color.value.toLowerCase() ? "ring-2 ring-indigo-500 ring-offset-1" : ""
              )}
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
              onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: (selectedObject.fill as string) || '#6366f1' });
            }}
            className={cn(
              "p-2 rounded-lg transition-colors cursor-pointer",
              selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
            )}
            title="Toggle Stroke"
          >
            <Square size={18} />
          </button>

          {isText && (
            <button
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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

          <button
            onClick={onDuplicate}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Duplicate"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-200/50" />

      {/* Advanced FigJam settings */}
      <div className="flex items-center gap-3 px-1.5 py-1 text-xs text-slate-500 justify-between">
        <div className="flex items-center gap-2">
          <Layers size={14} />
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="hover:text-indigo-600 cursor-pointer font-medium"
          >
            To Front
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="hover:text-indigo-600 cursor-pointer font-medium"
          >
            To Back
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Sparkles size={14} />
          <span className="font-medium">Opacity:</span>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            defaultValue={Math.round((selectedObject.opacity || 1) * 100)}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) / 100 })}
            className="w-16 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>
      </div>

      {isText && (
        <>
          <div className="h-px bg-slate-200/50" />
          <div className="flex items-center justify-between px-1.5 py-1 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span>Font size:</span>
              <select
                className="bg-slate-50 border border-slate-200 rounded p-1 text-[11px] cursor-pointer"
                defaultValue={selectedObject instanceof fabric.IText ? selectedObject.fontSize : (selectedObject instanceof fabric.Group ? (selectedObject.item(1) as unknown as fabric.IText).fontSize : 16)}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value, 10) })}
              >
                <option value="12">Small (12px)</option>
                <option value="16">Medium (16px)</option>
                <option value="24">Large (24px)</option>
                <option value="36">X-Large (36px)</option>
                <option value="48">Huge (48px)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Font:</span>
              <select
                className="bg-slate-50 border border-slate-200 rounded p-1 text-[11px] cursor-pointer"
                defaultValue={selectedObject instanceof fabric.IText ? selectedObject.fontFamily : (selectedObject instanceof fabric.Group ? (selectedObject.item(1) as unknown as fabric.IText).fontFamily : 'Inter, sans-serif')}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              >
                <option value="Inter, sans-serif">Inter</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Courier New, monospace">Courier</option>
                <option value="Comic Sans MS, cursive">Comic Sans</option>
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
