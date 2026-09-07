import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, Copy, ArrowUp, ArrowDown, SunMedium } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> & { content?: string; opacity?: number; fontFamily?: string; zAction?: 'front' | 'back' }) => void;
  onDuplicate?: () => void;
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

  // Position the menu safely above the object
  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${Math.max(180, Math.min(window.innerWidth - 180, rect.left + rect.width / 2))}px`,
    top: `${Math.max(80, rect.top - 60)}px`,
    transform: 'translateX(-50%)',
  };

  const fonts = [
    { label: 'Inter', value: 'Inter, sans-serif' },
    { label: 'Serif', value: 'Georgia, serif' },
    { label: 'Mono', value: 'monospace' },
  ];

  return (
    <div
      className="flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      <div className="flex items-center gap-1 px-1">
        {COLORS.slice(0, 7).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer"
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
            onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
          }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
          )}
          title="Toggle Stroke"
        >
          <Square size={18} />
        </button>

        <button
          onClick={() => {
            const currentOpacity = selectedObject.opacity ?? 1;
            const nextOpacity = currentOpacity <= 0.5 ? 1 : 0.5;
            onUpdate({ opacity: nextOpacity });
          }}
          className={cn(
            "p-2 rounded-lg transition-colors",
            (selectedObject.opacity ?? 1) < 1 ? "bg-amber-50 text-amber-600" : "text-slate-500 hover:bg-slate-100"
          )}
          title="Toggle Opacity (100% / 50%)"
        >
          <SunMedium size={18} />
        </button>

        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          title="Bring to Front"
        >
          <ArrowUp size={18} />
        </button>

        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          title="Send to Back"
        >
          <ArrowDown size={18} />
        </button>

        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy size={18} />
          </button>
        )}

        {isText && (
          <>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <select
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none"
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              defaultValue="Inter, sans-serif"
            >
              {fonts.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
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
              <Type size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
