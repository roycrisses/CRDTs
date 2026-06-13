import React, { useState } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, FileJson } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  onExportSVG: () => void;
  users: { id: number; name: string; color: string }[];
  onRoomNameChange: (newName: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  onExportSVG,
  users,
  onRoomNameChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(roomName);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onRoomNameChange(tempName);
    }
    setIsEditing(false);
  };

  return (
    <div className="fixed top-4 left-4 right-4 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
          <Activity className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                autoFocus
                className="text-xs font-medium text-slate-900 bg-slate-100 px-1 rounded outline-none border-b border-indigo-500"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
            ) : (
              <p
                className="text-xs font-medium text-slate-400 capitalize cursor-pointer hover:text-slate-600 transition-colors"
                onClick={() => setIsEditing(true)}
              >
                {roomName}
              </p>
            )}
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2 mr-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-all hover:scale-110 hover:z-10 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-[10px] text-slate-400 font-medium px-2 italic">Solo Session</div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200/60 mx-2" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={20} />
        </button>

        <div className="w-px h-6 bg-slate-200/60 mx-2" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-all group relative"
          title="Export to PNG"
        >
          <Download size={20} />
          <span className="absolute top-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
            PNG
          </span>
        </button>

        <button
          onClick={onExportSVG}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-all group relative"
          title="Export to SVG"
        >
          <FileJson size={20} />
          <span className="absolute top-14 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity shadow-xl">
            SVG
          </span>
        </button>

        <button className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95">
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};
