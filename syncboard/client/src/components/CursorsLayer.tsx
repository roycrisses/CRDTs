import React from 'react';
import { MousePointer2 } from 'lucide-react';

interface RemoteUser {
  id: number;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

interface CursorsLayerProps {
  users: RemoteUser[];
}

export const CursorsLayer: React.FC<CursorsLayerProps> = ({ users }) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
      {users.map((user) => {
        if (!user.cursor) return null;

        return (
          <div
            key={user.id}
            className="absolute transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
            }}
          >
            <MousePointer2
              className="w-5 h-5 drop-shadow-sm"
              style={{
                fill: user.color,
                color: user.color,
              }}
            />
            <div
              className="ml-3 mt-1 px-1.5 py-0.5 rounded-md text-white text-[9px] font-bold whitespace-nowrap shadow-md"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        );
      })}
    </div>
  );
};
