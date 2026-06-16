import React from 'react';
import { fabric } from 'fabric';
import {
  BringToFront,
  SendToBack,
  Layers
} from 'lucide-react';

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

const FONT_FAMILIES = [
  { name: 'Sans', value: 'Inter, system-ui, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'ui-monospace, monospace' },
];

const FONT_SIZES = [12, 14, 16, 20, 24, 32, 48, 64];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText ||
                 (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  // Get viewport coordinates for the menu
  const rect = selectedObject.getBoundingRect();
  const canvas = selectedObject.canvas;

  if (!canvas) return null;

  const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
  const zoom = canvas.getZoom();

  const menuLeft = (rect.left * zoom) + vpt[4] + (rect.width * zoom) / 2;
  const menuTop = (rect.top * zoom) + vpt[5] - 12;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${menuLeft}px`,
    top: `${menuTop}px`,
    transform: 'translate(-50%, -100%)',
  };

  const currentOpacity = Math.round((selectedObject.opacity || 1) * 100);

  return (
    <div
      className="flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in slide-in-from-top-2 duration-200"
      style={style}
    >
      <div className="flex items-center gap-1 px-1">
        {COLORS.slice(0, 8).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer shadow-sm"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200/60 mx-1" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
          title="Bring to Front"
        >
          <BringToFront size={18} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
          title="Send to Back"
        >
          <SendToBack size={18} />
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200/60 mx-1" />

      <div className="flex items-center gap-2 px-2">
        <Layers size={16} className="text-slate-400" />
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={currentOpacity}
          onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
          className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="text-[10px] font-bold text-slate-500 w-6">{currentOpacity}%</span>
      </div>

      {isText && (
        <>
          <div className="w-px h-6 bg-slate-200/60 mx-1" />
          <div className="flex items-center gap-1">
            <select
              className="text-[11px] font-bold text-slate-600 bg-slate-50 border-none rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500/20 cursor-pointer"
              value={FONT_SIZES.find(s => s === (selectedObject as fabric.IText).fontSize) || 16}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>

            <select
              className="text-[11px] font-bold text-slate-600 bg-slate-50 border-none rounded-md px-1.5 py-1 outline-none focus:ring-1 focus:ring-indigo-500/20 cursor-pointer"
              value={(selectedObject as fabric.IText).fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
            >
              {FONT_FAMILIES.map(font => (
                <option key={font.value} value={font.value}>{font.name}</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
};
