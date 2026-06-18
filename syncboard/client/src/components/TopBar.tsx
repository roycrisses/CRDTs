import React from 'react';
import { Undo2, Redo2, Share2, Activity, Download, FileJson } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  setRoomName: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onExportSVG: () => void;
  users: { id: number; name: string; color: string }[];
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
  setRoomName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onExportSVG,
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
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-100 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div className="flex flex-col">
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="text-sm font-bold text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 h-5"
            placeholder="Untitled Project"
          />
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {status === 'connected' ? 'Live' : 'Offline'}
            </span>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              status === 'connected' ? "bg-emerald-500" : "bg-rose-500"
            )} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex items-center -space-x-3 mr-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-help ring-1 ring-slate-100"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-[10px] text-slate-400 font-bold px-2 py-1 bg-slate-50 rounded-full border border-slate-100">Solo</div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
            title="Undo (Cmd+Z)"
          >
            <Undo2 size={18} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:hover:bg-transparent transition-all"
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 size={18} />
          </button>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={onExport}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all group relative"
            title="Export PNG"
          >
            <Download size={18} />
            <span className="absolute top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">PNG</span>
          </button>
          <button
            onClick={onExportSVG}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-all group relative"
            title="Export SVG"
          >
            <FileJson size={18} />
            <span className="absolute top-12 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">SVG</span>
          </button>
        </div>

        <button className="ml-3 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95 border border-indigo-500/50">
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
};
