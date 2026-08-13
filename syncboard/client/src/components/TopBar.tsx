import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, User, Check } from 'lucide-react';
import { cn } from '../lib/utils';
import { COLORS } from '../constants';

interface TopBarProps {
  status: string;
  roomName: string;
  onRoomNameChange: (name: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport: () => void;
  users: { id: number; name: string; color: string }[];
  localUser: { name: string; color: string };
  onLocalUserChange: (user: { name: string; color: string }) => void;
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
  onLocalUserChange,
}) => {
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [editedRoomName, setEditedRoomName] = useState(roomName);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditedRoomName(roomName);
  }, [roomName]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';
  };

  const handleRoomNameSubmit = () => {
    const trimmed = editedRoomName.trim();
    if (trimmed && trimmed.length <= 50) {
      onRoomNameChange(trimmed);
    } else {
      setEditedRoomName(roomName);
    }
    setIsEditingRoom(false);
  };

  const handleRoomNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRoomNameSubmit();
    } else if (e.key === 'Escape') {
      setEditedRoomName(roomName);
      setIsEditingRoom(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL: ', err);
    }
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
            {isEditingRoom ? (
              <input
                type="text"
                value={editedRoomName}
                maxLength={50}
                onChange={(e) => setEditedRoomName(e.target.value)}
                onBlur={handleRoomNameSubmit}
                onKeyDown={handleRoomNameKeyDown}
                className="text-xs font-semibold text-indigo-600 px-1 py-0.5 border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                autoFocus
              />
            ) : (
              <p
                onClick={() => setIsEditingRoom(true)}
                className="text-xs font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors capitalize underline decoration-dotted decoration-slate-300 hover:decoration-indigo-500"
                title="Click to rename room"
              >
                {roomName}
              </p>
            )}
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              )}
              title={status === 'connected' ? 'Connected' : 'Connecting/Disconnected'}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
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

        <div className="w-px h-6 bg-slate-200 mx-2" />

        {/* User Profile Editor Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Edit My Profile"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
              style={{ backgroundColor: localUser.color }}
            >
              {getInitials(localUser.name)}
            </div>
            <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate">
              {localUser.name}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/60 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <User size={16} className="text-indigo-500" />
                My Profile
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={localUser.name}
                    maxLength={30}
                    onChange={(e) => onLocalUserChange({ ...localUser, name: e.target.value })}
                    className="w-full text-sm px-3 py-1.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Profile Color
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => onLocalUserChange({ ...localUser, color: color.value })}
                        className={cn(
                          "w-7 h-7 rounded-full border flex items-center justify-center transition-transform hover:scale-110",
                          localUser.color === color.value ? "border-slate-800 shadow" : "border-black/5"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {localUser.color === color.value && (
                          <Check size={12} className="text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
          onClick={onExport}
          className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          title="Export to PNG"
        >
          <Download size={20} />
        </button>

        <button
          onClick={handleShare}
          className={cn(
            "ml-2 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95",
            copied
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
          )}
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </div>
  );
};
