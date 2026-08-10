import React, { useState, useEffect, useRef } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Edit2, Check, User } from 'lucide-react';
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

const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

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
  onUpdateLocalUser,
}) => {
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [tempRoomName, setTempRoomName] = useState(roomName);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editName, setEditName] = useState(localUser.name);
  const [editColor, setEditColor] = useState(localUser.color);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempRoomName(roomName);
  }, [roomName]);

  useEffect(() => {
    setEditName(localUser.name);
    setEditColor(localUser.color);
  }, [localUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSaveRoomName = () => {
    const trimmed = tempRoomName.trim();
    if (trimmed && trimmed.length <= 50) {
      onRoomNameChange(trimmed);
    } else {
      setTempRoomName(roomName);
    }
    setIsEditingRoom(false);
  };

  const handleRoomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRoomName();
    } else if (e.key === 'Escape') {
      setTempRoomName(roomName);
      setIsEditingRoom(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editName.trim();
    if (trimmed && trimmed.length <= 25) {
      onUpdateLocalUser(trimmed, editColor);
      setShowProfileMenu(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        alert('Room URL copied to clipboard! Share it with your friends to collaborate.');
      })
      .catch((err) => {
        console.error('Failed to copy: ', err);
      });
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white animate-pulse" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-extrabold text-indigo-950 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            {isEditingRoom ? (
              <input
                type="text"
                value={tempRoomName}
                maxLength={50}
                onChange={(e) => {
                  if (e.target.value.length <= 50) {
                    setTempRoomName(e.target.value);
                  }
                }}
                onBlur={handleSaveRoomName}
                onKeyDown={handleRoomKeyDown}
                autoFocus
                className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500 max-w-[200px]"
              />
            ) : (
              <div className="flex items-center gap-1 group/room cursor-pointer" onClick={() => setIsEditingRoom(true)}>
                <p className="text-xs font-bold text-slate-500 capitalize">{roomName}</p>
                <Edit2 size={10} className="text-slate-400 opacity-0 group-hover/room:opacity-100 transition-opacity" />
              </div>
            )}
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                status === 'connected' ? "bg-emerald-500" : "bg-rose-500 animate-ping"
              )}
              title={status === 'connected' ? 'Connected' : 'Connecting...'}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2 mr-4">
          {/* Local User Badge */}
          <div
            className="w-8 h-8 rounded-full border-2 border-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md transition-transform hover:scale-110 hover:z-10 cursor-pointer relative group"
            style={{ backgroundColor: localUser.color }}
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title="Edit your profile"
          >
            {getInitials(localUser.name)}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-indigo-600 rounded-full flex items-center justify-center border border-white">
              <User size={8} className="text-white" />
            </div>
          </div>

          {/* Remote Users */}
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
        </div>

        {/* Profile Settings Dropdown */}
        {showProfileMenu && (
          <div
            ref={profileRef}
            className="absolute right-48 top-16 w-64 p-4 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3">Your Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={25}
                  required
                  className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Avatar Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={cn(
                        "w-6 h-6 rounded-full border transition-all flex items-center justify-center cursor-pointer",
                        editColor === c ? "border-indigo-600 scale-110 shadow-sm" : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {editColor === c && <Check size={10} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-100"
              >
                Save Profile
              </button>
            </form>
          </div>
        )}

        <div className="w-px h-6 bg-slate-200 mx-2" />

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
          title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Export to PNG"
        >
          <Download size={18} />
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
