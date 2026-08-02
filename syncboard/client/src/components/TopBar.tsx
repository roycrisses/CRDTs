import React, { useState } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Edit2, Check, X } from 'lucide-react';
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
  onRoomNameChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(roomName);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleStartEditing = () => {
    setEditValue(roomName);
    setIsEditing(true);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed.length <= 50) {
      onRoomNameChange(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Room link copied to clipboard!');
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value.slice(0, 50))}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  autoFocus
                  maxLength={50}
                  className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                />
                <button onClick={handleSave} className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded">
                  <Check size={14} />
                </button>
                <button onClick={handleCancel} className="p-0.5 text-rose-600 hover:bg-rose-50 rounded">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                <p className="text-xs font-semibold text-slate-600 capitalize max-w-[150px] truncate">{roomName}</p>
                <button
                  onClick={handleStartEditing}
                  className="p-0.5 text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Rename Room"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            )}
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              )}
            />
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
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={20} />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Export to PNG"
        >
          <Download size={20} />
        </button>

        <button
          onClick={onExportSVG}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer text-xs font-semibold border border-slate-200 hover:border-slate-300 mr-2"
          title="Export to SVG"
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
