import React from 'react';
import { fabric } from 'fabric';
import { Type, Square, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface PropertyMenuProps {
  selectedObject: fabric.Object | null;
  onUpdate: (props: Partial<fabric.IObjectOptions> & { content?: string; zAction?: 'front' | 'back' }) => void;
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

  // Position the menu above the selected object, ensuring boundaries
  let leftPos = rect.left + rect.width / 2;
  let topPos = rect.top - 60;

  // Limit bounds to keep the menu at least 180px away from the left/right boundaries of the window
  if (leftPos < 180) {
    leftPos = 180;
  } else if (leftPos > window.innerWidth - 180) {
    leftPos = window.innerWidth - 180;
  }

  // Keep it at least 80px away from the top boundary of the window
  if (topPos < 80) {
    topPos = rect.top + rect.height + 20; // Flip it to the bottom if too close to the top
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    left: `${leftPos}px`,
    top: `${topPos}px`,
    transform: 'translateX(-50%)',
  };

  return (
    <div
      className="flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in zoom-in duration-200"
      style={style}
    >
      {/* Colors Panel */}
      <div className="flex items-center gap-1 px-1">
        {COLORS.slice(0, 7).map((color) => (
          <button
            key={color.value}
            onClick={() => onUpdate({ fill: color.value })}
            className="w-6 h-6 rounded-full border border-black/5 hover:scale-110 transition-transform cursor-pointer shadow-sm"
            style={{ backgroundColor: color.value }}
            title={color.name}
          />
        ))}
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Property & Layering Panel */}
      <div className="flex items-center gap-1">
        {/* Toggle Stroke */}
        <button
          onClick={() => {
            const currentStroke = selectedObject.strokeWidth || 0;
            onUpdate({ strokeWidth: currentStroke === 0 ? 2 : 0, stroke: selectedObject.fill as string });
          }}
          className={cn(
            "p-2 rounded-lg transition-colors cursor-pointer",
            selectedObject.strokeWidth ? "bg-indigo-50 text-indigo-600" : "text-slate-500 hover:bg-slate-100"
          )}
          title="Toggle Stroke"
        >
          <Square size={16} />
        </button>

        {/* Bring to Front */}
        <button
          onClick={() => onUpdate({ zAction: 'front' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Bring to Front"
        >
          <ChevronUp size={16} />
        </button>

        {/* Send to Back */}
        <button
          onClick={() => onUpdate({ zAction: 'back' })}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Send to Back"
        >
          <ChevronDown size={16} />
        </button>

        {/* Edit Text */}
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
  );
};
