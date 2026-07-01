import React from 'react';
import { fabric } from 'fabric';
import { Type, Square } from 'lucide-react';
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
  { name: 'Yellow', value: '#fef3c7' },
  { name: 'Mint', value: '#dcfce7' },
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
  const rect = selectedObject.getBoundingRect();

  const getOpacity = () => {
    return Math.round((selectedObject.opacity || 1) * 100);
  };

  const getFontSize = () => {
    if (selectedObject instanceof fabric.IText) return selectedObject.fontSize;
    if (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText) {
      return (selectedObject.item(1) as unknown as fabric.IText).fontSize;
    }
    return 24;
  };

  const getFontFamily = () => {
    if (selectedObject instanceof fabric.IText) return selectedObject.fontFamily;
    if (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText) {
      return (selectedObject.item(1) as unknown as fabric.IText).fontFamily;
    }
    return 'Inter, sans-serif';
  };

  // Position the menu above the selected object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${rect.left + rect.width / 2}px`,
    top: `${rect.top - 70}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex flex-col gap-2 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1.5 px-1.5">
        {COLORS.slice(0, 8).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer ring-offset-2 hover:ring-2 ring-indigo-500/30"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}

        <div className="w-px h-6 bg-slate-200/60 mx-1" />

        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all"
          title="Bring to Front"
        >
          Front
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-1.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all"
          title="Send to Back"
        >
          Back
        </button>
      </div>

      <div className="h-px bg-slate-100/60 w-full" />

      <div className="flex items-center gap-3 px-1.5">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[45px]">Opacity</span>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={getOpacity()}
            onChange={(e) => onUpdate({ opacity: parseInt(e.target.value) / 100 })}
            className="w-24 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-[10px] font-bold text-slate-600 w-8">{getOpacity()}%</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const currentStroke = selectedObject.strokeWidth || 0;
              onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
            }}
            className={cn(
              "p-2 rounded-lg transition-all",
              selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
            )}
            title="Toggle Stroke"
          >
            <Square size={16} strokeWidth={2.5} />
          </button>

          {isText && (
            <>
              <button
                className="p-2 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all"
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
                <Type size={16} strokeWidth={2.5} />
              </button>

              <select
                value={getFontSize()}
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                className="text-[11px] font-bold bg-slate-50 text-slate-700 border-none rounded-lg px-1.5 py-1 cursor-pointer focus:ring-0"
              >
                {[12, 16, 20, 24, 32, 48, 64, 80].map(size => (
                  <option key={size} value={size}>{size}px</option>
                ))}
              </select>

              <select
                value={getFontFamily()}
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="text-[11px] font-bold bg-slate-50 text-slate-700 border-none rounded-lg px-1.5 py-1 cursor-pointer focus:ring-0 max-w-[80px]"
              >
                {['Inter, sans-serif', 'serif', 'monospace', 'cursive'].map(font => (
                  <option key={font} value={font}>{font.split(',')[0]}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
