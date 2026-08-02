import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.ITextOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
  vpt: number[];
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
  { name: 'Dark', value: '#1e293b' },
  { name: 'White', value: '#ffffff' },
];

const FONT_FAMILIES = [
  { name: 'Sans', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'Fira Code, monospace' },
];

const FONT_SIZES = [12, 16, 20, 24, 32, 48, 64];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate, vpt }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  let currentFill = '#000000';
  let currentStrokeWidth = 0;
  let currentOpacity = 1;
  let currentFontFamily = 'Inter, sans-serif';
  let currentFontSize = 24;

  if (selectedObject instanceof fabric.Group) {
    const rect = selectedObject.item(0);
    currentFill = rect.fill as string || '#000000';
    currentStrokeWidth = rect.strokeWidth || 0;
    currentOpacity = selectedObject.opacity || 1;
  } else {
    currentFill = selectedObject.fill as string || '#000000';
    currentStrokeWidth = selectedObject.strokeWidth || 0;
    currentOpacity = selectedObject.opacity || 1;
    if (selectedObject instanceof fabric.IText) {
      currentFontFamily = selectedObject.fontFamily || 'Inter, sans-serif';
      currentFontSize = selectedObject.fontSize || 24;
    }
  }

  // Calculate absolute position considering viewport transform
  const rect = selectedObject.getBoundingRect(true, true);
  const zoom = vpt[0];
  const tx = vpt[4];
  const ty = vpt[5];

  const screenLeft = rect.left * zoom + tx;
  const screenTop = rect.top * zoom + ty;
  const screenWidth = rect.width * zoom;

  // Bound within visible screen limits
  const calculatedLeft = Math.max(180, Math.min(window.innerWidth - 180, screenLeft + screenWidth / 2));
  const calculatedTop = Math.max(80, screenTop - 70);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${calculatedLeft}px`,
    top: `${calculatedTop}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200 w-auto max-w-sm md:max-w-md lg:max-w-lg"
      style={style}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center gap-1 px-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className={cn(
                "w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform cursor-pointer",
                currentFill === color.value && "ring-2 ring-indigo-500 ring-offset-1"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200/50 mx-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              onUpdate({ strokeWidth: currentStrokeWidth === 0 ? 2 : 0, stroke: currentFill });
            }}
            className={cn(
              "p-2 rounded-lg transition-colors cursor-pointer",
              currentStrokeWidth > 0 ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
            )}
            title="Toggle Stroke"
          >
            <Square size={16} />
          </button>

          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Bring to Front"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Send to Back"
          >
            <ArrowDown size={16} />
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
              <Type size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="h-px bg-slate-100 w-full" />

      <div className="flex items-center justify-between gap-4 px-1.5">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={currentOpacity}
            onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-indigo-600 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{Math.round(currentOpacity * 100)}%</span>
        </div>

        {isText && (
          <>
            <div className="w-px h-6 bg-slate-200/50" />
            <div className="flex items-center gap-1.5">
              <select
                value={currentFontFamily}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>

              <select
                value={currentFontSize}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {FONT_SIZES.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}px
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
