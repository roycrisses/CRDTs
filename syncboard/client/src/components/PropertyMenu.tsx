import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { Type, Square, BringToFront, SendToBack } from 'lucide-react';
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
  { name: 'Light Yellow', value: '#fef3c7' },
  { name: 'Mint', value: '#dcfce7' },
];

const FONTS = [
  { name: 'Sans', value: 'Inter, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Mono', value: 'monospace' },
];

const FONT_SIZES = [14, 16, 18, 24, 32, 48];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  const [opacity, setOpacity] = useState(1);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (selectedObject) {
      const currentOpacity = selectedObject.opacity ?? 1;
      const rect = selectedObject.getBoundingRect();
      // Keep menu within screen boundaries
      const leftCoord = Math.max(180, Math.min(window.innerWidth - 180, rect.left + rect.width / 2));
      const topCoord = Math.max(80, rect.top - 80);

      const timer = setTimeout(() => {
        setOpacity(currentOpacity);
        setMenuPosition({ left: leftCoord, top: topCoord });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedObject]);

  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${menuPosition.left}px`,
    top: `${menuPosition.top}px`,
    transform: 'translateX(-50%)',
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setOpacity(val);
    onUpdate({ opacity: val });
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in-95 duration-150 w-72"
      style={style}
    >
      {/* Colors & Stroke row */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 flex-wrap max-w-[190px]">
          {COLORS.slice(0, 10).map((color) => (
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
              const currentStroke = selectedObject.strokeWidth || 0;
              onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
            }}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer",
              selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
            )}
            title="Toggle Stroke"
          >
            <Square size={16} />
          </button>
        </div>
      </div>

      <div className="h-px bg-slate-100 my-0.5" />

      {/* Typography controls */}
      {isText && (
        <>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase w-12">Font</span>
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100 flex-1">
              {FONTS.map((font) => (
                <button
                  key={font.value}
                  onClick={() => onUpdate({ fontFamily: font.value })}
                  className="flex-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded py-0.5 transition-all cursor-pointer"
                  style={{ fontFamily: font.value }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase w-12">Size</span>
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {FONT_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdate({ fontSize: size })}
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                >
                  {size}
                </button>
              ))}
            </div>
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
          </div>

          <div className="h-px bg-slate-100 my-0.5" />
        </>
      )}

      {/* Opacity slider */}
      <div className="flex items-center gap-1.5 px-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase w-12">Opacity</span>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={opacity}
          onChange={handleOpacityChange}
          className="flex-1 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="text-[11px] font-bold text-slate-500 min-w-[28px] text-right">
          {Math.round(opacity * 100)}%
        </span>
      </div>

      <div className="h-px bg-slate-100 my-0.5" />

      {/* Arrangement Row (Bring Front / Back) */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase">Arrange Layers</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUpdate({ zAction: 'back' })}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
            title="Send to Back"
          >
            <SendToBack size={14} />
            Back
          </button>
          <button
            onClick={() => onUpdate({ zAction: 'front' })}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
            title="Bring to Front"
          >
            <BringToFront size={14} />
            Front
          </button>
        </div>
      </div>
    </div>
  );
};
