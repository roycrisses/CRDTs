import React, { useState } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Edit2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  onRoomNameChange: (newName: string) => void;
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
  onRoomNameChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  users
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRoomName, setTempRoomName] = useState(roomName);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSaveRoomName = () => {
    setIsEditing(false);
    if (tempRoomName.trim()) {
      onRoomNameChange(tempRoomName.trim());
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room link copied to clipboard! Share it with your friends.');
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white animate-pulse" size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempRoomName}
                  onChange={(e) => setTempRoomName(e.target.value)}
                  onBlur={handleSaveRoomName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRoomName();
                    if (e.key === 'Escape') {
                      setTempRoomName(roomName);
                      setIsEditing(false);
                    }
                  }}
                  autoFocus
                  className="px-2 py-0.5 border border-slate-300 rounded text-sm text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button onClick={handleSaveRoomName} className="p-1 text-emerald-600 hover:bg-slate-100 rounded">
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => { setTempRoomName(roomName); setIsEditing(true); }}>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">{roomName}</h1>
                <Edit2 size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-slate-400 capitalize">SyncBoard Session</p>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === 'connected' ? "bg-emerald-500 animate-ping" : "bg-rose-500"
            )} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2 mr-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-help"
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

        <div className="w-px h-6 bg-slate-200 mx-2" />

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

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <button
          onClick={() => onExport('png')}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Export as PNG"
        >
          <Download size={20} />
        </button>
        <button
          onClick={() => onExport('svg')}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors text-xs font-bold"
          title="Export as SVG"
        >
          SVG
        </button>

        <button
          onClick={handleShare}
          className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95 cursor-pointer"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};
