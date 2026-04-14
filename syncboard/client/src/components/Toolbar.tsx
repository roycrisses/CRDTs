import React from 'react';
import { MousePointer2, Square, Circle, Type, StickyNote, Pencil, Trash2, type LucideIcon } from 'lucide-react';

export type ToolType = 'select' | 'rectangle' | 'circle' | 'text' | 'sticky' | 'pen';

interface ToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onClear: () => void;
  onDelete: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onToolChange, onClear, onDelete }) => {
  const tools: { type: ToolType; icon: LucideIcon; label: string }[] = [
    { type: 'select', icon: MousePointer2, label: 'Select' },
    { type: 'rectangle', icon: Square, label: 'Rectangle' },
    { type: 'circle', icon: Circle, label: 'Circle' },
    { type: 'text', icon: Type, label: 'Text' },
    { type: 'sticky', icon: StickyNote, label: 'Sticky Note' },
    { type: 'pen', icon: Pencil, label: 'Pen' },
  ];

  return (
    <div className="toolbar">
      {tools.map((tool) => (
        <button
          key={tool.type}
          className={`tool-button ${activeTool === tool.type ? 'active' : ''}`}
          onClick={() => onToolChange(tool.type)}
          title={tool.label}
        >
          <tool.icon size={20} />
        </button>
      ))}
      <div className="toolbar-separator" />
      <button className="tool-button delete-button" onClick={onDelete} title="Delete Selected">
        <Trash2 size={20} />
      </button>
      <button className="tool-button clear-button" onClick={onClear} title="Clear Board">
        <span style={{ fontSize: '18px' }}>🚮</span>
      </button>
    </div>
  );
};
