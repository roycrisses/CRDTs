import React from 'react';
import { fabric } from 'fabric';
import { Layers, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> | { content?: string; opacity?: number; fontSize?: number; fontFamily?: string }) => void;
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
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
];

const FONT_FAMILIES = [
  { name: 'Sans', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, monospace' },
];

const FONT_SIZES = [12, 16, 24, 32, 48, 64];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText ||
                 (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  // Get viewport coordinates for the object
  const canvas = selectedObject.canvas;
  if (!canvas) return null;

  const boundingRect = selectedObject.getBoundingRect();
  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

  const left = boundingRect.left * vpt[0] + vpt[4];
  const top = boundingRect.top * vpt[3] + vpt[5];
  const width = boundingRect.width * vpt[0];

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${left + width / 2}px`,
    top: `${top - 60}px`,
    transform: 'translateX(-50%)',
  };

  const currentOpacity = Math.round((selectedObject.opacity || 1) * 100);

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/60 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1.5 px-1">
        <div className="flex items-center gap-1">
          {COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => onUpdate({ fill: color.value })}
              className={cn(
                "w-5 h-5 rounded-full border border-slate-200 hover:scale-110 transition-transform cursor-pointer shadow-sm",
                selectedObject.fill === color.value && "ring-2 ring-indigo-500 ring-offset-1"
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
              selectedObject.bringToFront();
              canvas.renderAll();
              onUpdate({ }); // Trigger Yjs update
            }}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Bring to Front"
          >
            <ArrowUp size={16} />
          </button>
          <button
            onClick={() => {
              selectedObject.sendToBack();
              canvas.renderAll();
              onUpdate({ }); // Trigger Yjs update
            }}
            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send to Back"
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100 mx-1" />

      <div className="flex items-center gap-3 px-2 py-1">
        <div className="flex items-center gap-2 flex-1">
          <Layers size={14} className="text-slate-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={currentOpacity}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
            className="w-24 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-[10px] font-bold text-slate-500 min-w-[24px]">{currentOpacity}%</span>
        </div>

        {isText && (
          <>
            <div className="w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-1">
              <select
                className="text-[10px] font-bold text-slate-600 bg-slate-50 border-none rounded-md px-1 py-0.5 focus:ring-0"
                value={(selectedObject as fabric.IText).fontFamily}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f.value} value={f.value}>{f.name}</option>
                ))}
              </select>
              <select
                className="text-[10px] font-bold text-slate-600 bg-slate-50 border-none rounded-md px-1 py-0.5 focus:ring-0"
                value={(selectedObject as fabric.IText).fontSize}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              >
                {FONT_SIZES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
