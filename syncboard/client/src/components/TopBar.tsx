import React from 'react';
import { Undo2, Redo2, Share2, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  remoteUsers: { id: number; name: string; color: string }[];
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  remoteUsers
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <p className="text-xs font-medium text-slate-400 capitalize">{roomName}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex -space-x-2 overflow-hidden">
          {remoteUsers.slice(0, 5).map((user) => (
            <div
              key={user.id}
              className="inline-block h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {remoteUsers.length > 5 && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 ring-2 ring-white">
              +{remoteUsers.length - 5}
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={20} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-2" />
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
          status === 'connected'
            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
            : "bg-rose-50 text-rose-700 border-rose-100"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          )} />
          {status === 'connected' ? 'Live' : 'Offline'}
        </div>
        <button className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95">
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};
