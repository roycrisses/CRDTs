import React from 'react';
import { MousePointer2 } from 'lucide-react';

interface CursorProps {
  name: string;
  color: string;
  x: number;
  y: number;
}

const Cursor: React.FC<CursorProps> = ({ name, color, x, y }) => {
  return (
    <div
      className="absolute pointer-events-none transition-all duration-75 ease-out z-[100]"
      style={{ left: x, top: y }}
    >
      <MousePointer2
        className="w-5 h-5"
        style={{ fill: color, color: color }}
      />
      <div
        className="ml-3 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow-sm"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  );
};

interface AwarenessState {
  user: {
    name: string;
    color: string;
  };
  cursor?: {
    x: number;
    y: number;
  };
}

interface CursorsLayerProps {
  connections: [number, AwarenessState][];
  selfId: number;
}

export const CursorsLayer: React.FC<CursorsLayerProps> = ({ connections, selfId }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {connections.map(([id, state]) => {
        if (id === selfId || !state.cursor) return null;
        return (
          <Cursor
            key={id}
            name={state.user.name}
            color={state.user.color}
            x={state.cursor.x}
            y={state.cursor.y}
          />
        );
      })}
    </div>
  );
};
