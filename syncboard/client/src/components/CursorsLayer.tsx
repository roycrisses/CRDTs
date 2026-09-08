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
            className="absolute transition-transform duration-75 ease-linear pointer-events-none"
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
              className="ml-4 -mt-2 px-2.5 py-0.5 rounded-full text-white text-[11px] font-bold whitespace-nowrap shadow-md tracking-wide"
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
