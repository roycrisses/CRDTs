import React, { useState, useEffect, useRef } from 'react';
import { Undo2, Redo2, Share2, Activity, Download, ChevronDown, Edit3 } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopBarProps {
  status: string;
  roomName: string;
  onRoomNameChange: (newName: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExportPNG: () => void;
  onExportSVG: () => void;
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
  onExportPNG,
  onExportSVG,
  users
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRoomName, setTempRoomName] = useState(roomName);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempRoomName(roomName);
  }, [roomName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const handleSaveRoomName = () => {
    const trimmed = tempRoomName.trim();
    if (trimmed && trimmed.length <= 50) {
      onRoomNameChange(trimmed);
    } else {
      setTempRoomName(roomName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveRoomName();
    } else if (e.key === 'Escape') {
      setTempRoomName(roomName);
      setIsEditing(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed top-6 left-6 right-6 h-16 flex items-center justify-between px-6 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_8px_30px_rgba(99,102,241,0.3)]">
          <Activity className="text-white" size={24} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={tempRoomName}
                maxLength={50}
                onChange={(e) => setTempRoomName(e.target.value)}
                onBlur={handleSaveRoomName}
                onKeyDown={handleKeyDown}
                className="text-base font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded outline-none w-48 leading-tight"
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 cursor-pointer group hover:bg-slate-100 px-1.5 py-0.5 rounded transition-colors"
              >
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  {roomName}
                </h1>
                <Edit3 size={13} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <div className={cn(
              "w-2 h-2 rounded-full",
              status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
            )} />
          </div>
          <span className="text-[10px] font-semibold text-slate-400 capitalize px-1.5">
            {status === 'connected' ? 'Live Collaborative Room' : 'Offline / Reconnecting'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-1.5 mr-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-md transition-transform hover:scale-110 hover:z-10 cursor-help"
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {getInitials(user.name)}
            </div>
          ))}
          {users.length === 0 && (
            <div className="text-[10px] text-slate-400 font-semibold px-2 bg-slate-100 py-1 rounded-md">Solo Mode</div>
          )}
        </div>

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
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={18} />
        </button>

        <div className="w-px h-6 bg-slate-200 mx-2" />

        {/* Dropdown Export Menu */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="p-2.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            title="Export Canvas"
          >
            <Download size={18} />
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-40 bg-white/95 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.15)] border border-slate-100 p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  onExportPNG();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
              >
                Export as PNG (High Res)
              </button>
              <button
                onClick={() => {
                  onExportSVG();
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
              >
                Export as Vector SVG
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleShare}
          className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-[0_4px_14px_rgba(99,102,241,0.4)] active:scale-95 cursor-pointer"
        >
          <Share2 size={14} />
          {copied ? 'Link Copied!' : 'Share'}
        </button>
      </div>
    </div>
  );
};
