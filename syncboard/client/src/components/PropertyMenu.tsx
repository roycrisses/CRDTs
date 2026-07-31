import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ChevronUp, ChevronDown, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> & { content?: string; zAction?: 'front' | 'back'; fontSize?: number; fontFamily?: string }) => void;
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

const FONTS = ['Inter, sans-serif', 'Georgia, serif', 'Courier New, monospace'];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({ selectedObject, onUpdate }) => {
  if (!selectedObject) return null;

  const isText = selectedObject instanceof fabric.IText || (selectedObject instanceof fabric.Group && selectedObject.item(1) instanceof fabric.IText);
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
      className="flex items-center gap-1.5 p-1.5 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1 px-1">
        {COLORS.slice(0, 8).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Opacity Control */}
      <div className="flex items-center gap-1 px-1.5" title="Opacity">
        <Sun size={14} className="text-slate-400" />
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

      <div className="w-px h-6 bg-slate-200" />

      {/* Layer Ordering (Bring to Front / Back) */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          title="Bring to Front"
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          title="Send to Back"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200" />

      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
          }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
          )}
          title="Toggle Stroke"
        >
          <Square size={16} />
        </button>

        {isText && (
          <>
            <button
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
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

            {/* Typography Controls */}
            <div className="flex items-center gap-1">
              <select
                onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                className="text-xs font-medium border border-slate-200 rounded p-1 text-slate-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                title="Font Family"
              >
                {FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font.split(',')[0]}
                  </option>
                ))}
              </select>

              <select
                onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
                className="text-xs font-medium border border-slate-200 rounded p-1 text-slate-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-500"
                title="Font Size"
              >
                <option value="12">12px</option>
                <option value="16">16px</option>
                <option value="20">20px</option>
                <option value="24" selected>24px</option>
                <option value="32">32px</option>
                <option value="48">48px</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
