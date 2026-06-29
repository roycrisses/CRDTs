import React, { useState, useEffect } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  users: { id: number; name: string; color: string }[];
  onRoomNameChange?: (name: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  users,
  onRoomNameChange
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [localRoomName, setLocalRoomName] = useState(roomName);

  useEffect(() => {
    setLocalRoomName(roomName);
  }, [roomName]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (localRoomName.trim() && localRoomName !== roomName) {
      onRoomNameChange?.(localRoomName);
    }
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.3)] group cursor-pointer hover:scale-105 transition-transform">
          <Activity className="text-white group-hover:rotate-12 transition-transform" size={24} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                autoFocus
                className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded outline-none border-b-2 border-indigo-500"
                value={localRoomName}
                onChange={(e) => setLocalRoomName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
            ) : (
              <h1
                className="text-sm font-bold text-slate-900 leading-tight cursor-pointer hover:bg-slate-100 px-2 py-0.5 rounded transition-colors"
                onClick={() => setIsEditingName(true)}
              >
                {roomName}
              </h1>
            )}
            <div className={cn(
              "w-2 h-2 rounded-full shadow-sm",
              status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-2">
            {status === 'connected' ? 'Live Session' : 'Offline'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-3 mr-6">
          {users.slice(0, 5).map((user) => (
            <div
              key={user.id}
              className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-md transition-all hover:scale-110 hover:-translate-y-1 hover:z-20 cursor-help ring-2 ring-transparent hover:ring-indigo-200"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {users.length > 5 && (
            <div className="w-9 h-9 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[11px] font-bold text-slate-500 shadow-md">
              +{users.length - 5}
            </div>
          )}
          {users.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              <span className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">Solo Mode</span>
            </div>
          )}
        </div>

        <div className="flex items-center bg-slate-50/50 p-1 rounded-xl border border-slate-100">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-all active:scale-95"
          title="Export Board"
        >
          <Download size={20} />
        </button>

        <button className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)] active:scale-95">
          <Share2 size={16} />
          Share
          <ChevronDown size={14} className="opacity-50" />
        </button>
      </div>
    </div>
  );
};
