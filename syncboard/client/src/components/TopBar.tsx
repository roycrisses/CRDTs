import React, { useState, useEffect, useRef } from 'react';
import {
  Undo2,
  Redo2,
  Share2,
  Activity,
  Download,
  Upload,
  Check,
  Edit2,
  User,
  HelpCircle,
  Grid,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ROOM_NAME_MAX_LENGTH, COLORS } from '../constants';

interface UserProfile {
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
  onExportJson: () => void;
  onImportJson: (jsonString: string) => void;
  users: { id: number; name: string; color: string }[];
  localUser: UserProfile;
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  onOpenShortcuts: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
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
  onExportJson,
  onImportJson,
  users,
  localUser,
  onUpdateProfile,
  onOpenShortcuts,
  showGrid,
  onToggleGrid,
}) => {
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [tempRoomName, setTempRoomName] = useState(roomName);
  const [copied, setCopied] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [editingName, setEditingName] = useState(localUser.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempRoomName(roomName);
  }, [roomName]);

  useEffect(() => {
    setEditingName(localUser.name);
  }, [localUser.name]);

  useEffect(() => {
    if (isEditingRoom && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingRoom]);

  const handleSaveRoomName = () => {
    const trimmed = tempRoomName.trim().slice(0, ROOM_NAME_MAX_LENGTH);
    if (trimmed) {
      onRoomNameChange(trimmed);
    } else {
      setTempRoomName(roomName);
    }
    setIsEditingRoom(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRoomName();
    } else if (e.key === 'Escape') {
      setTempRoomName(roomName);
      setIsEditingRoom(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(`Room Link: ${window.location.href}`);
    }
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        onImportJson(content);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const getInitials = (name: string) => {
    return (name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50 transition-all">
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonUpload}
        className="hidden"
      />

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-indigo-200 shadow-lg">
          <Activity className="text-white" size={24} />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
            SyncBoard
            <span
              className={cn(
                'w-2 h-2 rounded-full inline-block',
                status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              )}
              title={`Status: ${status}`}
            />
          </h1>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            {isEditingRoom ? (
              <input
                ref={inputRef}
                type="text"
                maxLength={ROOM_NAME_MAX_LENGTH}
                value={tempRoomName}
                onChange={(e) => setTempRoomName(e.target.value)}
                onBlur={handleSaveRoomName}
                onKeyDown={handleKeyDown}
                className="px-2 py-0.5 border border-indigo-300 rounded bg-indigo-50/50 text-indigo-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            ) : (
              <button
                onClick={() => setIsEditingRoom(true)}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1 group text-left"
                title="Click to edit room name"
              >
                <span className="truncate max-w-[200px]">{roomName}</span>
                <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Toggle Canvas Grid */}
        <button
          onClick={onToggleGrid}
          className={cn(
            'p-2.5 rounded-xl transition-all',
            showGrid ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100/80'
          )}
          title="Toggle Canvas Background Grid"
        >
          <Grid size={18} />
        </button>

        {/* Shortcuts Helper Modal Button */}
        <button
          onClick={onOpenShortcuts}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 transition-all"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200/80 mx-0.5" />

        {/* Remote Users & Local User Profile */}
        <div className="relative flex items-center -space-x-2 mr-1">
          {/* Local User Avatar */}
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-9 h-9 rounded-full border-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-md hover:scale-105 transition-transform z-20 relative"
            style={{ backgroundColor: localUser.color }}
            title={`Your profile: ${localUser.name}`}
          >
            {getInitials(localUser.name)}
          </button>

          {/* Remote Avatars */}
          {users.map((u) => (
            <div
              key={u.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm transition-transform hover:scale-110 hover:z-30 cursor-help"
              style={{ backgroundColor: u.color }}
              title={u.name}
            >
              {getInitials(u.name)}
            </div>
          ))}

          {/* User Profile Popover */}
          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-64 bg-white/95 backdrop-blur-2xl p-4 rounded-2xl shadow-2xl border border-slate-200/80 z-50 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <User size={14} /> Profile Settings
                </span>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Close
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Your Display Name</label>
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => {
                    const trimmed = editingName.trim();
                    if (trimmed) onUpdateProfile({ name: trimmed });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = editingName.trim();
                      if (trimmed) onUpdateProfile({ name: trimmed });
                      setShowProfileMenu(false);
                    }
                  }}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={24}
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 mb-1 block">Avatar Color</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => onUpdateProfile({ color })}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform hover:scale-110 border border-black/10 flex items-center justify-center",
                        localUser.color === color && "ring-2 ring-indigo-600 ring-offset-1"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-slate-200/80 mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200/80 mx-1" />

        <button
          onClick={onExport}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 transition-all"
          title="Export Board to PNG Image"
        >
          <Download size={18} />
        </button>

        <button
          onClick={onExportJson}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 transition-all text-xs font-bold"
          title="Backup Board State to JSON File"
        >
          .JSON
        </button>

        <button
          onClick={() => jsonInputRef.current?.click()}
          className="p-2.5 rounded-xl text-slate-600 hover:bg-slate-100/80 transition-all"
          title="Import Board from JSON File"
        >
          <Upload size={18} />
        </button>

        <button
          onClick={handleShare}
          className="ml-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-200 active:scale-95"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          {copied ? 'Copied!' : 'Share'}
        </button>
      </div>
    </div>
  );
};
