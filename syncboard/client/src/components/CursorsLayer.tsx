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
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: 0,
              top: 0,
              transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
            }}
          >
            <MousePointer2
              className="w-5 h-5 drop-shadow-sm"
              style={{
                fill: user.color,
                color: 'white',
                strokeWidth: 2
              }}
            />
            <div
              className="ml-4 px-2 py-1 rounded-full text-white text-[10px] font-bold whitespace-nowrap shadow-md border border-white/20"
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
