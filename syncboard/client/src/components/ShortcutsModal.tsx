import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { SHORTCUTS } from '../constants';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = ['Tools', 'Actions', 'Canvas'] as const;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Keyboard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-500">Speed up your workflow with hotkeys.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {categories.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat}>
                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">
                  {cat} Shortcuts
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((s) => (
                    <div
                      key={s.key + s.action}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <span className="text-xs font-medium text-slate-700">{s.action}</span>
                      <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-white text-slate-800 rounded-md border border-slate-200 shadow-2xs">
                        {s.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
