import React from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Users } from 'lucide-react';
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
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
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
    <div className="fixed top-4 left-4 right-4 h-14 flex items-center justify-between px-4 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-100 shadow-lg">
          <Activity className="text-white" size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 leading-tight">SyncBoard</h1>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              status === 'connected' ? "bg-emerald-500" : "bg-rose-500"
            )} />
          </div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{roomName}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center -space-x-1.5 mr-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          <div className="ml-3 flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
            <Users size={12} className="text-slate-400" />
            <span className="text-[10px] font-bold text-slate-600">{users.length + 1}</span>
          </div>
        </div>

        <div className="w-px h-6 bg-slate-200/60 mx-2" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200/60 mx-2" />

        <button
          onClick={onExport}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-2"
          title="Export as Image"
        >
          <Download size={18} />
        </button>

        <button className="ml-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-slate-200">
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
};
