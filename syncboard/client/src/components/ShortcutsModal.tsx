import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', desc: 'Select Tool' },
    { key: 'H', desc: 'Hand / Pan Canvas' },
    { key: 'P', desc: 'Pencil Tool' },
    { key: 'I', desc: 'Highlighter Tool' },
    { key: 'L', desc: 'Laser Pointer' },
    { key: 'A', desc: 'Arrow / Connector' },
    { key: 'R', desc: 'Rectangle Shape' },
    { key: 'O', desc: 'Circle Shape' },
    { key: 'T', desc: 'Text Tool' },
    { key: 'S', desc: 'Sticky Note Tool' },
    { key: 'Cmd/Ctrl + D', desc: 'Duplicate Selected Object' },
    { key: 'Cmd/Ctrl + Z', desc: 'Undo Action' },
    { key: 'Cmd/Ctrl + Shift + Z', desc: 'Redo Action' },
    { key: 'Backspace / Delete', desc: 'Delete Selected Object' },
    { key: 'Space + Drag', desc: 'Pan Canvas Area' },
    { key: 'Mouse Wheel', desc: 'Zoom In / Out' },
    { key: '?', desc: 'Toggle Shortcuts Modal' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Speed up your workflow with hotkeys.
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

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto divide-y divide-slate-100">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="py-2.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">{sc.desc}</span>
              <kbd className="px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 shadow-xs flex items-center gap-1">
                {sc.key.includes('Cmd') && <Command size={12} />}
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
