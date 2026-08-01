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
  vpt: number[];
}

export const CursorsLayer: React.FC<CursorsLayerProps> = ({ users, vpt }) => {
  const zoom = vpt[0] ?? 1;
  const panX = vpt[4] ?? 0;
  const panY = vpt[5] ?? 0;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
      {users.map((user) => {
        if (!user.cursor) return null;

        // Convert canvas-space coordinates to screen-space coordinates
        const screenX = user.cursor.x * zoom + panX;
        const screenY = user.cursor.y * zoom + panY;

        return (
          <div
            key={user.id}
            className="absolute transition-transform duration-75 ease-linear"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
            }}
          >
            <MousePointer2
              className="w-5 h-5"
              style={{
                fill: user.color,
                color: user.color,
              }}
            />
            <div
              className="ml-4 px-2 py-1 rounded-md text-white text-[10px] font-bold whitespace-nowrap shadow-sm"
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
