import React, { useState } from 'react';
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
  localUser: { name: string; color: string };
  onUpdateLocalUser: (name: string, color: string) => void;
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
  localUser,
}) => {
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [tempRoomName, setTempRoomName] = useState(roomName);
  const [copied, setCopied] = useState(false);

  const handleRoomSubmit = () => {
    const trimmed = tempRoomName.trim().slice(0, 50);
    if (trimmed) {
      onRoomNameChange(trimmed);
    } else {
      setTempRoomName(roomName);
    }
    setIsEditingRoom(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
            <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100">
              FigmaJam Edition
            </span>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            {isEditingRoom ? (
              <input
                type="text"
                value={tempRoomName}
                onChange={(e) => setTempRoomName(e.target.value)}
                onBlur={handleRoomSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRoomSubmit();
                  if (e.key === 'Escape') {
                    setTempRoomName(roomName);
                    setIsEditingRoom(false);
                  }
                }}
                maxLength={50}
                autoFocus
                className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded outline-none border border-indigo-400"
              />
            ) : (
              <button
                onClick={() => {
                  setTempRoomName(roomName);
                  setIsEditingRoom(true);
                }}
                className="group flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                title="Click to rename board"
              >
                <span>{roomName}</span>
                <Edit2 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            <div
              className={cn(
                "w-2 h-2 rounded-full",
                status === 'connected' ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
              )}
              title={status === 'connected' ? "Connected" : "Connecting..."}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Collaborative Users */}
        <div className="flex items-center -space-x-2 mr-3">
          {/* Local User Badge */}
          <div
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-md z-20 cursor-default"
            style={{ backgroundColor: localUser.color }}
            title={`You (${localUser.name})`}
          >
            {getInitials(localUser.name)}
          </div>

          {/* Remote Users */}
          {users.map((user) => (
            <div
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-30 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
        </div>

        <div className="w-px h-6 bg-slate-200/80 mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200/80 mx-1" />

        {/* Export PNG */}
        <button
          onClick={onExport}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          title="Export Board as PNG"
        >
          <Download size={18} />
        </button>

        {/* Share Link */}
        <button
          onClick={handleShare}
          className={cn(
            "ml-2 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95",
            copied
              ? "bg-emerald-600 text-white shadow-emerald-200"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
          )}
        >
          {copied ? (
            <>
              <Check size={15} />
              Copied!
            </>
          ) : (
            <>
              <Share2 size={15} />
              Share
            </>
          )}
        </button>
      </div>
    </div>
  );
};
