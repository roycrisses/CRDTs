import React from 'react';
import { fabric } from 'fabric';
import { Trash2, Type, Palette } from 'lucide-react';

interface PropertyMenuProps {
  activeObject: fabric.Object;
  onUpdate: (properties: Partial<fabric.IObjectOptions>) => void;
  onDelete: () => void;
}

const COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444',
  '#fef3c7', '#dcfce7', '#dbeafe', '#f3e8ff', '#fee2e2'
];

export const PropertyMenu: React.FC<PropertyMenuProps> = ({
  activeObject,
  onUpdate,
  onDelete,
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  // Calculate position relative to the object
  const rect = activeObject.getBoundingRect();
  const canvasElement = activeObject.canvas?.getElement();
  if (!canvasElement) return null;
  const canvasRect = canvasElement.getBoundingClientRect();

  const top = canvasRect.top + rect.top - 60;
  const left = canvasRect.left + rect.left + rect.width / 2;

  const isText = activeObject instanceof fabric.IText ||
                 (activeObject instanceof fabric.Group && activeObject.item(1) instanceof fabric.IText);

  return (
    <div
      className="fixed z-[60] -translate-x-1/2 flex items-center gap-2 p-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200"
      style={{ top: Math.max(80, top), left }}
    >
      <div className="flex items-center gap-1 border-r border-slate-100 pr-1 mr-1">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-2 rounded-lg hover:bg-slate-50 transition-colors relative"
          title="Change Color"
        >
          <Palette size={18} className="text-slate-600" />
          <div
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white shadow-sm"
            style={{ backgroundColor: (activeObject.fill as string) || (activeObject instanceof fabric.Group ? (activeObject.item(0).fill as string) : '#000') }}
          />
        </button>

        {isText && (
          <button
            className="p-2 rounded-lg hover:bg-slate-50 transition-colors"
            title="Edit Text"
            onClick={() => {
              if (activeObject instanceof fabric.IText) {
                activeObject.enterEditing();
                activeObject.canvas?.setActiveObject(activeObject);
              } else if (activeObject instanceof fabric.Group) {
                const text = activeObject.item(1) as unknown as fabric.IText;
                text.enterEditing();
              }
            }}
          >
            <Type size={18} className="text-slate-600" />
          </button>
        )}
      </div>

      <button
        onClick={onDelete}
        className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
        title="Delete"
      >
        <Trash2 size={18} />
      </button>

      {showColorPicker && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-xl shadow-2xl border border-slate-100 grid grid-cols-4 gap-2 w-40">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => {
                onUpdate({ fill: color });
                setShowColorPicker(false);
              }}
              className="w-6 h-6 rounded-full hover:scale-110 transition-transform shadow-sm"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
