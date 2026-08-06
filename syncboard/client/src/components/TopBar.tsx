import React, { useState, useEffect, useRef } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Pencil, Check } from 'lucide-react';
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
  const [editedName, setEditedName] = useState(roomName);
  const [isCopied, setIsCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedName(roomName);
  }, [roomName]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSave = () => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed.length <= 50) {
      onRoomNameChange(trimmed);
    } else {
      setEditedName(roomName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedName(roomName);
      setIsEditing(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      alert('Failed to copy room URL to clipboard.');
    }
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={22} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value.slice(0, 50))}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 max-w-[180px]"
                maxLength={50}
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 group cursor-pointer"
              >
                <p className="text-xs font-semibold text-slate-500 capitalize hover:text-slate-800 transition-colors">
                  {roomName}
                </p>
                <Pencil size={11} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"
              )}
              title={status === 'connected' ? 'Connected' : 'Connecting/Disconnected'}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Collaborative user avatars list */}
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
            <div className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
              Solo Session
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200/60 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-transparent transition-all cursor-pointer"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200/60 mx-1" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer"
          title="Export to PNG"
        >
          <Download size={18} />
        </button>

        <button
          onClick={handleShare}
          className={cn(
            "ml-2 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer border border-transparent",
            isCopied
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
          )}
        >
          {isCopied ? (
            <>
              <Check size={14} />
              Copied URL
            </>
          ) : (
            <>
              <Share2 size={14} />
              Share
            </>
          )}
        </button>
      </div>
    </div>
  );
};
