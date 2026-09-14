import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutGroups = [
    {
      title: 'Tools & Drawing',
      shortcuts: [
        { key: 'V', label: 'Select Tool' },
        { key: 'H', label: 'Hand Pan Tool' },
        { key: 'P', label: 'Pencil / Pen' },
        { key: 'I', label: 'Highlighter Tool' },
        { key: 'L', label: 'Laser Pointer' },
        { key: 'A', label: 'Arrow / Connector' },
        { key: 'R', label: 'Rectangle Shape' },
        { key: 'O', label: 'Circle Shape' },
        { key: 'T', label: 'Text Block' },
        { key: 'S', label: 'Sticky Note' },
      ],
    },
    {
      title: 'Canvas & Navigation',
      shortcuts: [
        { key: 'Space + Drag', label: 'Pan Canvas' },
        { key: 'Wheel', label: 'Zoom In / Out' },
        { key: '?', label: 'Open Keyboard Shortcuts' },
      ],
    },
    {
      title: 'Actions & Editing',
      shortcuts: [
        { key: 'Cmd/Ctrl + D', label: 'Duplicate Object' },
        { key: 'Cmd/Ctrl + Z', label: 'Undo' },
        { key: 'Cmd/Ctrl + Shift + Z / Ctrl + Y', label: 'Redo' },
        { key: 'Delete / Backspace', label: 'Delete Selected' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Keyboard size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-500 font-medium">
                Speed up your workflow with standard FigJam keyboard controls
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Command size={14} /> {group.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.shortcuts.map((sc) => (
                  <div
                    key={sc.key}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/60"
                  >
                    <span className="text-xs font-medium text-slate-700">{sc.label}</span>
                    <kbd className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-mono font-bold text-slate-800 shadow-xs">
                      {sc.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
