import React, { useState, useEffect } from 'react';
import { Undo2, Redo2, Share2, Activity, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  onRoomNameChange: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  users: { id: number; name: string; color: string }[];
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
  onRoomNameChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  users
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localName, setLocalName] = useState(roomName);

  useEffect(() => {
    setLocalName(roomName);
  }, [roomName]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localName.trim() && localName !== roomName) {
      onRoomNameChange(localName);
    } else {
      setLocalName(roomName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalName(roomName);
    }
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <Activity className="text-white" size={24} />
        </div>
        <div className="flex flex-col">
          {isEditing ? (
            <input
              autoFocus
              className="text-lg font-bold text-slate-900 leading-tight bg-slate-100 rounded px-1 outline-none border-none focus:ring-2 focus:ring-indigo-500/20"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <h1
              className="text-lg font-bold text-slate-900 leading-tight cursor-pointer hover:bg-slate-50 rounded px-1 -ml-1 transition-colors"
              onClick={() => setIsEditing(true)}
            >
              {roomName}
            </h1>
          )}
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {status === 'connected' ? 'Live Workspace' : 'Offline Mode'}
            </p>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              status === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500"
            )} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2 mr-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-all hover:scale-110 hover:-translate-y-0.5 hover:z-10 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter px-2">Solo</div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors group relative"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Undo
            </span>
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors group relative"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} />
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
              Redo
            </span>
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <button
          onClick={onExport}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors group relative"
          title="Export PNG"
        >
          <Download size={18} />
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Export PNG
          </span>
        </button>

        <button className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95 group relative">
          <Share2 size={16} />
          Share
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Invite others
          </span>
        </button>
      </div>
    </div>
  );
};
