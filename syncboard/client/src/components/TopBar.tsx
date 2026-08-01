import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Check, Edit2 } from 'lucide-react';
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
  const [tempName, setTempName] = useState(roomName);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(roomName);
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
    setIsEditing(false);
    const trimmed = tempName.trim();
    if (trimmed && trimmed !== roomName) {
      onRoomNameChange(trimmed);
    } else {
      setTempName(roomName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempName(roomName);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL', err);
    }
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 group">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                maxLength={50}
                className="text-base font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-indigo-300 outline-none w-48"
              />
            ) : (
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => setIsEditing(true)}>
                <h1 className="text-lg font-bold text-slate-900 leading-tight hover:text-indigo-600 transition-colors">
                  {roomName}
                </h1>
                <Edit2 size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">SyncBoard Workspace</span>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === 'connected' ? "bg-emerald-500" : "bg-rose-500"
            )} />
            <span className="text-[10px] font-medium text-slate-400">
              {status === 'connected' ? 'Synced' : 'Connecting...'}
            </span>
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
            <div className="text-[10px] text-slate-400 font-medium px-2 bg-slate-100 py-1 rounded-full border border-slate-200/50">Solo session</div>
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
          onClick={handleShare}
          className={cn(
            "ml-2 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer",
            copied
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
          )}
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          {copied ? 'Copied URL!' : 'Share'}
        </button>
      </div>
    </div>
  );
};
