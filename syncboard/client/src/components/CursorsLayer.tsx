import React, { useState, useEffect } from 'react';
import { MousePointer2 } from 'lucide-react';

export interface RemoteUser {
  id: number;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
}

export interface RemoteSelection {
  userId: number;
  userName: string;
  userColor: string;
  rect: { left: number; top: number; width: number; height: number };
}

export interface LaserPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  time: number;
}

interface CursorsLayerProps {
  users: RemoteUser[];
  remoteSelections?: RemoteSelection[];
  laserPoints?: LaserPoint[];
}

export const CursorsLayer: React.FC<CursorsLayerProps> = ({
  users,
  remoteSelections = [],
  laserPoints = [],
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (laserPoints.length === 0) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 50);
    return () => clearInterval(interval);
  }, [laserPoints.length]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
      {/* Laser Pointer Trails */}
      {laserPoints.map((pt) => {
        const age = Math.max(0, now - pt.time);
        const opacity = Math.max(0, 1 - age / 1000);
        if (opacity <= 0) return null;

        return (
          <div
            key={pt.id}
            className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(239,68,68,0.8)] transition-opacity"
            style={{
              left: `${pt.x}px`,
              top: `${pt.y}px`,
              backgroundColor: pt.color,
              opacity,
            }}
          />
        );
      })}

      {/* Remote Selections Overlay */}
      {remoteSelections.map((sel) => (
        <div
          key={`${sel.userId}-${sel.rect.left}-${sel.rect.top}`}
          className="absolute border-2 border-dashed rounded transition-all duration-75 pointer-events-none"
          style={{
            left: `${sel.rect.left}px`,
            top: `${sel.rect.top}px`,
            width: `${sel.rect.width}px`,
            height: `${sel.rect.height}px`,
            borderColor: sel.userColor,
            backgroundColor: `${sel.userColor}15`,
          }}
        >
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 text-[10px] font-bold text-white rounded shadow-xs whitespace-nowrap"
            style={{ backgroundColor: sel.userColor }}
          >
            {sel.userName}
          </div>
        </div>
      ))}

      {/* Remote Cursors */}
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
              className="w-5 h-5 drop-shadow-md"
              style={{
                fill: user.color,
                color: user.color,
              }}
            />
            <div
              className="ml-3 mt-1 px-2 py-0.5 rounded-lg text-white text-[11px] font-bold whitespace-nowrap shadow-md tracking-wide"
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
