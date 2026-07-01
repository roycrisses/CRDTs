import React from 'react';
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
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-8 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-6">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={roomName}
              onChange={(e) => onRoomNameChange(e.target.value)}
              className="text-xs font-semibold text-slate-400 capitalize tracking-wide bg-transparent border-none p-0 focus:ring-0 focus:text-slate-600 transition-colors w-auto min-w-[100px]"
              placeholder="Room Name"
            />
            <div className={cn(
              "w-1.5 h-1.5 rounded-full shadow-sm",
              status === 'connected' ? "bg-emerald-500 shadow-emerald-200" : "bg-rose-500 shadow-rose-200"
            )} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center -space-x-2.5 mr-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-md transition-transform hover:scale-115 hover:z-10 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-[11px] text-slate-400 font-semibold px-3 py-1 bg-slate-50 rounded-full border border-slate-100">Solo session</div>
          )}
        </div>

        <div className="w-px h-8 bg-slate-200/60 mx-1" />

        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={20} />
          </button>
        </div>

        <div className="w-px h-8 bg-slate-200/60 mx-1" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-all"
          title="Export to PNG"
        >
          <Download size={20} />
        </button>

        <button className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95">
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};
