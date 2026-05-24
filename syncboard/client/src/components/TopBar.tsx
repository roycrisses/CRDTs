import React from 'react';
import { Undo2, Redo2, Download, Activity, Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface User {
  id: number;
  name: string;
  color: string;
}

interface TopBarProps {
  status: string;
  roomName: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  users: User[];
  onExport: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  users,
  onExport,
}) => {
  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <p className="text-xs font-medium text-slate-400 capitalize">{roomName}</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1">
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

        <div className="w-px h-6 bg-slate-200" />

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 overflow-hidden mr-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="inline-block h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name.split(' ').map(n => n[0]).join('')}
              </div>
            ))}
            {users.length === 0 && (
              <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Users size={16} />
              </div>
            )}
          </div>

          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border",
            status === 'connected'
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-rose-50 text-rose-700 border-rose-100"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              status === 'connected' ? "bg-emerald-500" : "bg-rose-500"
            )} />
            {status === 'connected' ? 'Connected' : 'Reconnecting...'}
          </div>
        </div>

        <div className="w-px h-6 bg-slate-200" />

        <button
          onClick={onExport}
          className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-200 shadow-sm active:scale-95"
        >
          <Download size={18} />
          Export
        </button>
      </div>
    </div>
  );
};
