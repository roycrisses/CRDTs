import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'V', description: 'Select Tool' },
  { key: 'H', description: 'Hand / Pan Tool' },
  { key: 'P', description: 'Pencil / Pen' },
  { key: 'I', description: 'Highlighter Tool' },
  { key: 'L', description: 'Laser Pointer' },
  { key: 'A', description: 'Connector / Arrow' },
  { key: 'R', description: 'Rectangle Tool' },
  { key: 'O', description: 'Circle Tool' },
  { key: 'T', description: 'Text Tool' },
  { key: 'S', description: 'Sticky Note Tool' },
  { key: 'F', description: 'Frame Container Tool' },
  { key: 'Cmd / Ctrl + D', description: 'Duplicate Selected Element' },
  { key: 'Delete / Backspace', description: 'Delete Selected Element' },
  { key: 'Cmd / Ctrl + Z', description: 'Undo Action' },
  { key: 'Cmd + Shift + Z / Ctrl + Y', description: 'Redo Action' },
  { key: '?', description: 'Toggle Shortcuts Modal' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
            <Keyboard className="text-indigo-600" size={22} />
            Keyboard Shortcuts
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUTS.map((sc, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
            >
              <span className="text-slate-600 font-medium">{sc.description}</span>
              <kbd className="px-2 py-1 bg-white border border-slate-200 shadow-xs rounded-md font-mono text-[11px] font-semibold text-indigo-600">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
