import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Check, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { MAX_ROOM_NAME_LENGTH } from '../constants';

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
  users,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(roomName);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempName(roomName);
  }, [roomName]);

  useEffect(() => {
    if (isEditingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingName]);

  const handleNameSubmit = () => {
    const trimmed = tempName.trim();
    if (trimmed.length > 0 && trimmed.length <= MAX_ROOM_NAME_LENGTH) {
      onRoomNameChange(trimmed);
    } else {
      setTempName(roomName);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setTempName(roomName);
      setIsEditingName(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API fails
      const dummy = document.createElement('input');
      document.body.appendChild(dummy);
      dummy.value = window.location.href;
      dummy.select();
      document.execCommand('copy');
      document.body.removeChild(dummy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 transition-all">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                maxLength={MAX_ROOM_NAME_LENGTH}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSubmit}
                onKeyDown={handleKeyDown}
                className="text-xs font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="group flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                title="Click to rename room"
              >
                <span>{roomName}</span>
                <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
              </button>
            )}
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                status === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"
              )}
              title={status === 'connected' ? 'Live connected' : 'Connecting...'}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2 mr-3">
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
            <div className="text-[11px] text-slate-400 font-medium px-2 bg-slate-100 py-1 rounded-full border border-slate-200/60">
              Solo Session
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200/80 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200/80 mx-1" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 transition-colors"
          title="Export Canvas to PNG"
        >
          <Download size={18} />
        </button>

        <button
          onClick={handleShare}
          className="ml-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-200"
        >
          {copied ? (
            <>
              <Check size={16} className="text-emerald-300" />
              <span>Copied Link!</span>
            </>
          ) : (
            <>
              <Share2 size={16} />
              <span>Share</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
