import React, { useState, useEffect, useRef } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Grid } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  onRoomNameChange: (newName: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  users: { id: number; name: string; color: string }[];
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
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
  users,
  snapToGrid,
  onToggleSnapToGrid,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(roomName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditVal(roomName);
  }, [roomName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const trimmed = editVal.trim();
    if (trimmed && trimmed.length <= 50) {
      onRoomNameChange(trimmed);
    } else {
      setEditVal(roomName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditVal(roomName);
      setIsEditing(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert('Room link copied to clipboard!'))
      .catch((err) => console.error('Failed to copy: ', err));
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white animate-pulse" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editVal}
                onChange={(e) => {
                  if (e.target.value.length <= 50) {
                    setEditVal(e.target.value);
                  }
                }}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                maxLength={50}
                className="text-xs font-semibold text-slate-700 capitalize border-b border-indigo-500 focus:outline-none bg-transparent"
              />
            ) : (
              <p
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-slate-400 capitalize cursor-pointer hover:text-slate-600 hover:underline transition-all"
                title="Click to rename"
              >
                {roomName}
              </p>
            )}
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
          onClick={onToggleSnapToGrid}
          className={cn(
            "p-2.5 rounded-lg transition-colors",
            snapToGrid ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-100"
          )}
          title="Snap to Grid"
        >
          <Grid size={20} />
        </button>

        <button
          onClick={onExport}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Export to PNG"
        >
          <Download size={20} />
        </button>

        <button
          onClick={handleShare}
          className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};
