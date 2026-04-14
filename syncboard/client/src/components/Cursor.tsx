import React from 'react';
import { MousePointer2 } from 'lucide-react';

interface CursorProps {
  name: string;
  color: string;
  x: number;
  y: number;
}

export const Cursor: React.FC<CursorProps> = ({ name, color, x, y }) => {
  return (
    <div
      className="remote-cursor"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        color: color,
      }}
    >
      <MousePointer2 size={20} fill={color} />
      <div className="cursor-label" style={{ backgroundColor: color }}>
        {name}
      </div>
    </div>
  );
};
