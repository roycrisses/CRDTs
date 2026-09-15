import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { category: 'Tools', items: [
      { key: 'V', desc: 'Select Tool' },
      { key: 'H', desc: 'Hand Pan Tool' },
      { key: 'P', desc: 'Pencil Tool' },
      { key: 'I', desc: 'Highlighter' },
      { key: 'L', desc: 'Laser Pointer' },
      { key: 'A', desc: 'Arrow / Connector' },
      { key: 'R', desc: 'Rectangle' },
      { key: 'O', desc: 'Circle' },
      { key: 'T', desc: 'Text' },
      { key: 'S', desc: 'Sticky Note' },
      { key: 'F', desc: 'Frame Container' },
    ]},
    { category: 'Actions', items: [
      { key: 'Cmd/Ctrl + D', desc: 'Duplicate Selection' },
      { key: 'Cmd/Ctrl + Z', desc: 'Undo' },
      { key: 'Cmd/Ctrl + Shift + Z', desc: 'Redo' },
      { key: 'Delete / Backspace', desc: 'Delete Selection' },
      { key: 'Mouse Wheel', desc: 'Zoom In / Out' },
      { key: 'Alt + Drag', desc: 'Pan Viewport' },
      { key: '?', desc: 'Toggle Shortcuts Guide' },
    ]},
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl border border-slate-200/80 max-w-lg w-full mx-4 relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-xl transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Keyboard size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Keyboard Shortcuts</h2>
            <p className="text-xs text-slate-500 font-medium">Quick controls for seamless whiteboarding</p>
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((group) => (
            <div key={group.category} className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                {group.category}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.desc}</span>
                    <kbd className="px-2 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs font-mono font-semibold text-indigo-600 text-[11px]">
                      {item.key}
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
