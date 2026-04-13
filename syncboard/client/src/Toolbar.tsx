import React from 'react';
import { MousePointer2, Pencil, Square, Circle, Type, StickyNote, Trash2, Undo2, Redo2, Eraser } from 'lucide-react';

export type Tool = 'select' | 'pencil' | 'rectangle' | 'circle' | 'text' | 'sticky';

interface ToolbarProps {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  onToolSelect,
  onDelete,
  onUndo,
  onRedo,
  onClear
}) => {
  return (
    <div className="toolbar">
      <div className="tool-group">
        <button
          className={activeTool === 'select' ? 'active' : ''}
          onClick={() => onToolSelect('select')}
          title="Select (V)"
        >
          <MousePointer2 size={20} />
        </button>
        <button
          className={activeTool === 'pencil' ? 'active' : ''}
          onClick={() => onToolSelect('pencil')}
          title="Pencil (P)"
        >
          <Pencil size={20} />
        </button>
      </div>

      <div className="divider" />

      <div className="tool-group">
        <button
          className={activeTool === 'rectangle' ? 'active' : ''}
          onClick={() => onToolSelect('rectangle')}
          title="Rectangle (R)"
        >
          <Square size={20} />
        </button>
        <button
          className={activeTool === 'circle' ? 'active' : ''}
          onClick={() => onToolSelect('circle')}
          title="Circle (O)"
        >
          <Circle size={20} />
        </button>
        <button
          className={activeTool === 'text' ? 'active' : ''}
          onClick={() => onToolSelect('text')}
          title="Text (T)"
        >
          <Type size={20} />
        </button>
        <button
          className={activeTool === 'sticky' ? 'active' : ''}
          onClick={() => onToolSelect('sticky')}
          title="Sticky Note (S)"
        >
          <StickyNote size={20} />
        </button>
      </div>

      <div className="divider" />

      <div className="tool-group">
        <button onClick={onUndo} title="Undo (Ctrl+Z)">
          <Undo2 size={20} />
        </button>
        <button onClick={onRedo} title="Redo (Ctrl+Y)">
          <Redo2 size={20} />
        </button>
      </div>

      <div className="divider" />

      <div className="tool-group">
        <button onClick={onDelete} className="danger" title="Delete (Del)">
          <Trash2 size={20} />
        </button>
        <button onClick={onClear} className="danger" title="Clear Canvas">
          <Eraser size={20} />
        </button>
      </div>
    </div>
  );
};
