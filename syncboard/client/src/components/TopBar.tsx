import React, { useState } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Settings, Grid, Check } from 'lucide-react';
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
  users: { id: number; name: string; color: string }[];
  localUser: { name: string; color: string };
  updateLocalUser: (name: string, color: string) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
}

const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6', '#f43f5e'];

export const TopBar: React.FC<TopBarProps> = ({
  status,
  roomName,
  setRoomName,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  users,
  localUser,
  updateLocalUser,
  snapToGrid,
  setSnapToGrid
}) => {
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState(roomName);
  const [showSettings, setShowSettings] = useState(false);
  const [username, setUsername] = useState(localUser.name);
  const [userColor, setUserColor] = useState(localUser.color);
  const [shareCopied, setShareCopied] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const saveRoomName = () => {
    const trimmed = roomInput.trim().slice(0, 50);
    if (trimmed) {
      setRoomName(trimmed);
    } else {
      setRoomInput(roomName);
    }
    setIsEditingRoom(false);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    });
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
          </div>
          <div className="flex items-center gap-2">
            {isEditingRoom ? (
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value.slice(0, 50))}
                onBlur={saveRoomName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRoomName();
                  if (e.key === 'Escape') {
                    setRoomInput(roomName);
                    setIsEditingRoom(false);
                  }
                }}
                className="text-xs font-semibold text-slate-700 bg-slate-100 border-none rounded px-1.5 py-0.5 outline-none w-32 focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
            ) : (
              <p
                onClick={() => {
                  setRoomInput(roomName);
                  setIsEditingRoom(true);
                }}
                className="text-xs font-semibold text-slate-500 capitalize cursor-pointer hover:text-slate-800 hover:underline flex items-center gap-1"
                title="Click to rename"
              >
                {roomName}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Snap to Grid Toggle */}
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={cn(
            "p-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold border transition-all cursor-pointer",
            snapToGrid
              ? "bg-indigo-50 text-indigo-600 border-indigo-200"
              : "text-slate-500 border-slate-200 hover:bg-slate-50"
          )}
          title="Snap to Grid"
        >
          <Grid size={16} />
          <span>Snap to Grid</span>
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Remote Users Avatars */}
        <div className="flex items-center -space-x-2 mr-2">
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

        {/* Local User Customizer Button */}
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="User Profile Settings"
          >
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: localUser.color }}>
              {getInitials(localUser.name)}
            </div>
            <Settings size={16} />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-12 w-64 p-4 bg-white/95 backdrop-blur-md border border-slate-100 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Customize Profile</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Theme Color</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PALETTE.map((color) => (
                      <button
                        key={color}
                        onClick={() => setUserColor(color)}
                        className="w-8 h-8 rounded-full border border-black/5 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: color }}
                      >
                        {userColor === color && <Check size={14} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      updateLocalUser(username.trim() || 'Anonymous', userColor);
                      setShowSettings(false);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Export */}
        <button
          onClick={onExport}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
          title="Export to PNG"
        >
          <Download size={18} />
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={cn(
            "ml-1 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer",
            shareCopied ? "bg-emerald-600 shadow-emerald-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
          )}
        >
          {shareCopied ? (
            <>
              <Check size={14} />
              Copied!
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
