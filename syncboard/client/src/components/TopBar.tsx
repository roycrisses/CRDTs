import React, { useState, useRef, useEffect } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, Edit2, Check, X } from 'lucide-react';
import { cn } from '../lib/utils';

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

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

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
  const [tempRoomName, setTempRoomName] = useState(roomName);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [tempUserName, setTempUserName] = useState(localUser.name);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Sync tempRoomName with external roomName prop when editing starts or prop changes
  useEffect(() => {
    setTempRoomName(roomName);
  }, [roomName]);

  // Click outside listener for profile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
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

  const handleRoomNameSave = () => {
    const trimmed = tempRoomName.trim();
    if (trimmed && trimmed.length <= 50) {
      onRoomNameChange(trimmed);
      setIsEditingRoom(false);
    } else if (trimmed.length > 50) {
      alert("Room name must be 50 characters or less.");
    } else {
      setTempRoomName(roomName);
      setIsEditingRoom(false);
    }
  };

  const handleRoomNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRoomNameSave();
    } else if (e.key === 'Escape') {
      setTempRoomName(roomName);
      setIsEditingRoom(false);
    }
  };

  const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length <= 50) {
      setTempRoomName(val);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => {
        alert('Room URL copied to clipboard!');
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
          <h1 className="text-lg font-bold text-slate-900 leading-tight">SyncBoard</h1>
          <div className="flex items-center gap-2">
            {isEditingRoom ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempRoomName}
                  onChange={handleRoomNameChange}
                  onKeyDown={handleRoomNameKeyDown}
                  onBlur={handleRoomNameSave}
                  maxLength={50}
                  className="text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:border-indigo-500"
                  autoFocus
                />
                <button onMouseDown={handleRoomNameSave} className="text-emerald-600 hover:text-emerald-700">
                  <Check size={14} />
                </button>
                <button onMouseDown={() => { setTempRoomName(roomName); setIsEditingRoom(false); }} className="text-rose-600 hover:text-rose-700">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-1 cursor-pointer group"
                onClick={() => {
                  setTempRoomName(roomName);
                  setIsEditingRoom(true);
                }}
              >
                <p className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors capitalize">
                  {roomName}
                </p>
                <Edit2 size={10} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              status === 'connected' ? "bg-emerald-500" : "bg-rose-500"
            )} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Users list including customized local user */}
        <div className="flex items-center gap-2 mr-4">
          <div className="flex items-center -space-x-2">
            {/* Local User */}
            <div
              onClick={() => {
                setTempUserName(localUser.name);
                setShowProfileMenu(!showProfileMenu);
              }}
              className="w-8 h-8 rounded-full border-2 border-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-md transition-all hover:scale-110 hover:z-10 cursor-pointer relative"
              style={{ backgroundColor: localUser.color }}
              title={`${localUser.name} (You - Click to edit)`}
            >
              {getInitials(localUser.name)}
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border border-white flex items-center justify-center">
                <span className="w-1 h-1 bg-white rounded-full" />
              </span>
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

          {/* Profile Menu Popover */}
          {showProfileMenu && (
            <div
              ref={profileMenuRef}
              className="absolute right-48 top-16 w-64 bg-white rounded-xl shadow-2xl border border-slate-200/50 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <h3 className="text-sm font-bold text-slate-800 mb-3">Customize Profile</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={tempUserName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 25) {
                        setTempUserName(val);
                        onLocalUserChange({ ...localUser, name: val });
                      }
                    }}
                    maxLength={25}
                    placeholder="Enter name"
                    className="w-full text-sm font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Avatar Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => onLocalUserChange({ ...localUser, color })}
                        className={cn(
                          "w-6 h-6 rounded-full transition-transform hover:scale-110 relative",
                          localUser.color === color && "ring-2 ring-indigo-600 ring-offset-1"
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
          className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-100 active:scale-95 cursor-pointer"
        >
          <Share2 size={16} />
          Share
        </button>
      </div>
    </div>
  );
};
