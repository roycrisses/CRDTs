import React from 'react';
import { Undo2, Redo2, Share2, Activity, Download } from 'lucide-react';
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
    <div className="fixed top-4 left-4 right-4 h-14 flex items-center justify-between px-4 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
          <Activity className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{roomName}</p>
            <div className={cn(
              "w-1 h-1 rounded-full",
              status === 'connected' ? "bg-emerald-500" : "bg-rose-500"
            )} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center -space-x-2 mr-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <button
          onClick={onExport}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Export to PNG"
        >
          <Download size={18} />
        </button>

        <button className="ml-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95">
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
};
