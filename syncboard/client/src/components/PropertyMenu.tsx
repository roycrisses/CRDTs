import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, Sliders, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & { zAction?: 'front' | 'back' }) => void;
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
];

const FONT_FAMILIES = [
  { label: 'Sans-Serif', value: 'Inter, sans-serif' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
  { label: 'Comic/Sketch', value: '"Comic Sans MS", cursive, sans-serif' },
];

const FONT_SIZES = [14, 18, 24, 32, 40, 48];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  // Check if target has text (either directly IText or a Group with text inside, like sticky)
  const isIText = selectedObject instanceof fabric.IText;
  const isGroupWithText = selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText;
  const isText = isIText || isGroupWithText;

  const rect = selectedObject.getBoundingRect();

  // Position the menu above the selected object, with limits to keep it fully visible
  const leftPos = Math.max(180, Math.min(window.innerWidth - 180, rect.left + rect.width / 2));
  const topPos = Math.max(80, rect.top - 70);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${leftPos}px`,
    top: `${topPos}px`,
    transform: 'translateX(-50%)',
  };

  // Extract current property values to reflect in controls safely
  const currentOpacity = selectedObject.opacity !== undefined ? selectedObject.opacity : 1;
  const currentStrokeWidth = selectedObject.strokeWidth || 0;

  let currentFontFamily = 'Inter, sans-serif';
  let currentFontSize = 24;

  if (isIText) {
    const textObj = selectedObject as fabric.IText;
    currentFontFamily = textObj.fontFamily || currentFontFamily;
    currentFontSize = textObj.fontSize || currentFontSize;
  } else if (isGroupWithText) {
    const textObj = (selectedObject as fabric.Group).item(1) as unknown as fabric.IText;
    currentFontFamily = textObj.fontFamily || currentFontFamily;
    currentFontSize = textObj.fontSize || currentFontSize;
  }

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 animate-in fade-in zoom-in duration-200 w-[340px]"
      style={style}
    >
      {/* Top Row: Fill Colors and Quick Styles */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
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

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const nextStroke = currentStrokeWidth === 0 ? 2 : 0;
              onUpdate({ strokeWidth: nextStroke, stroke: selectedObject.fill as string });
            }}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer",
              currentStrokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
            )}
            title="Toggle Stroke border"
          >
            <Square size={16} />
          </button>

          {isText && (
            <button
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
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
          )}
        </div>
      </div>

      <div className="h-px bg-slate-200/60 my-0.5" />

      {/* Font Family, Font Size, Opacity slider */}
      <div className="space-y-2 px-1">
        {isText && (
          <div className="flex items-center justify-between gap-2">
            <select
              value={currentFontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none font-semibold text-slate-700 cursor-pointer focus:border-indigo-500"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>

            <select
              value={currentFontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="w-18 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none font-semibold text-slate-700 cursor-pointer focus:border-indigo-500"
            >
              {FONT_SIZES.map((sz) => (
                <option key={sz} value={sz}>{sz}px</option>
              ))}
            </select>
          </div>
        )}

        {/* Opacity Control */}
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-400 w-10">Opacity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={currentOpacity}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="flex-1 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{Math.round(currentOpacity * 100)}%</span>
        </div>

        {/* Z-Index / Layer Ordering */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <Layers size={14} />
            <span>Layer Ordering</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUpdate({ zAction: 'back' })}
              className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Send to Back
            </button>
            <button
              onClick={() => onUpdate({ zAction: 'front' })}
              className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              Bring to Front
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
