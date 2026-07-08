import React from 'react';
import { MousePointer2 } from 'lucide-react';

interface RemoteUser {
  id: number;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: { left: number; top: number; width: number; height: number };
}

interface CursorsLayerProps {
  users: RemoteUser[];
}

export const CursorsLayer: React.FC<CursorsLayerProps> = ({ users }) => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
      {users.map((user) => {
        return (
          <React.Fragment key={user.id}>
            {user.selection && (
              <div
                className="absolute border-2 rounded-sm transition-all duration-75"
                style={{
                  borderColor: user.color,
                  left: user.selection.left,
                  top: user.selection.top,
                  width: user.selection.width,
                  height: user.selection.height,
                  boxShadow: `0 0 0 1px white, 0 0 8px ${user.color}40`,
                }}
              >
                <div
                  className="absolute -top-6 left-0 px-1.5 py-0.5 rounded text-white text-[10px] font-bold whitespace-nowrap shadow-sm"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name}
                </div>
              </div>
            )}
            {user.cursor && (
              <div
                className="absolute transition-transform duration-75 ease-linear"
                style={{
                  transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
                }}
              >
                <MousePointer2
                  className="w-5 h-5"
                  style={{
                    fill: user.color,
                    color: user.color,
                  }}
                />
                {!user.selection && (
                  <div
                    className="ml-4 px-2 py-1 rounded-md text-white text-[10px] font-bold whitespace-nowrap shadow-sm"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.name}
                  </div>
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
