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
  onExport: (format: 'png' | 'svg') => void;
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
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState(roomName);

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
        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
          <Activity className="text-white" size={22} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                autoFocus
                className="text-sm font-bold text-slate-900 bg-slate-100 rounded px-1 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              />
            ) : (
              <h1
                className="text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 px-1 rounded transition-colors"
                onClick={() => setIsEditing(true)}
              >
                {name}
              </h1>
            )}
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              status === 'connected' ? "bg-emerald-500" : "bg-rose-500"
            )} />
          </div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">SyncBoard Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
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
            <div className="text-[10px] text-slate-400 font-medium px-2">Solo session</div>
          )}
        </div>

        <div className="w-px h-8 bg-slate-200/60 mx-2" />

        <div className="flex items-center bg-slate-100/50 rounded-xl p-1 gap-0.5">
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

        <div className="w-px h-8 bg-slate-200/60 mx-2" />

        <div className="flex items-center bg-slate-100/50 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => onExport('png')}
            className="p-2 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            title="Export to PNG"
          >
            PNG
          </button>
          <button
            onClick={() => onExport('svg')}
            className="p-2 text-xs font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
            title="Export to SVG"
          >
            SVG
          </button>
        </div>

        <button className="ml-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95">
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
};
