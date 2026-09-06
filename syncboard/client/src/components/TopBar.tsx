import React, { useState, useEffect } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Edit2, Check, User, Palette } from 'lucide-react';
import { cn } from '../lib/utils';
import { USER_COLORS } from '../constants';

export interface LocalUser {
  name: string;
  color: string;
}

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
  localUser: LocalUser;
  onUpdateLocalUser: (user: Partial<LocalUser>) => void;
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
  onUpdateLocalUser,
}) => {
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [tempRoomName, setTempRoomName] = useState(roomName);
  const [copied, setCopied] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    setTempRoomName(roomName);
  }, [roomName]);

  const handleRoomNameSubmit = () => {
    const trimmed = tempRoomName.trim().slice(0, 50);
    if (trimmed) {
      onRoomNameChange(trimmed);
    } else {
      setTempRoomName(roomName);
    }
    setIsEditingRoom(false);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Room URL copied to clipboard: ' + window.location.href);
    }
  };

  const getInitials = (name: string) => {
    return name
      ? name
          .trim()
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U';
  };

  return (
    <div className="fixed top-5 left-6 right-6 h-16 flex items-center justify-between px-5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {/* Left section: Logo & Room Name */}
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-md">
          <Activity className="text-white" size={22} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-slate-900 tracking-tight">SyncBoard</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/60">
              <span
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  status === 'connected' ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              <span className="text-[11px] font-semibold text-slate-600 capitalize">
                {status}
              </span>
            </div>
          </div>

          {/* Editable Room Name */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {isEditingRoom ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  maxLength={50}
                  value={tempRoomName}
                  onChange={(e) => setTempRoomName(e.target.value.slice(0, 50))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRoomNameSubmit();
                    if (e.key === 'Escape') {
                      setTempRoomName(roomName);
                      setIsEditingRoom(false);
                    }
                  }}
                  onBlur={handleRoomNameSubmit}
                  autoFocus
                  className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-indigo-300 outline-none w-48"
                />
                <button
                  onClick={handleRoomNameSubmit}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingRoom(true)}
                className="group flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                title="Click to rename room"
              >
                <span className="truncate max-w-[200px]">{roomName}</span>
                <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right section: Remote Users, Local Profile, Actions */}
      <div className="flex items-center gap-2">
        {/* User Avatars & Profile Settings button */}
        <div className="flex items-center gap-2 mr-2">
          {/* Active Remote Users */}
          <div className="flex items-center -space-x-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-help"
                style={{ backgroundColor: user.color }}
                title={`${user.name} (Active)`}
              >
                {getInitials(user.name)}
              </div>
            ))}
          </div>

          {/* Local User Profile Toggle Button */}
          <div className="relative">
            <button
              onClick={() => setShowProfileModal((prev) => !prev)}
              className="flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 transition-colors"
              title="Edit your profile name and color"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                style={{ backgroundColor: localUser.color }}
              >
                {getInitials(localUser.name)}
              </div>
              <span className="text-xs font-semibold text-slate-700 max-w-[90px] truncate">
                {localUser.name}
              </span>
            </button>

            {/* Local Profile Popover */}
            {showProfileModal && (
              <div className="absolute right-0 top-11 w-64 p-4 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-xl border border-slate-200/60 z-50 animate-fade-in-zoom">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Your Profile</h3>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                      <User size={12} /> Display Name
                    </label>
                    <input
                      type="text"
                      maxLength={25}
                      value={localUser.name}
                      onChange={(e) => onUpdateLocalUser({ name: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Palette size={12} /> Cursor Color
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {USER_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => onUpdateLocalUser({ color })}
                          className={cn(
                            "w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center",
                            localUser.color === color ? "ring-2 ring-indigo-500 ring-offset-2 scale-105" : ""
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Export PNG */}
        <button
          onClick={onExport}
          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          title="Export Board to PNG"
        >
          <Download size={18} />
        </button>

        {/* Share Button */}
        <button
          onClick={handleShare}
          className={cn(
            "ml-1 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95",
            copied
              ? "bg-emerald-600 text-white shadow-emerald-200"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
          )}
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </div>
  );
};
