import React from 'react';
import { X, LayoutTemplate, Kanban, RotateCcw, GitFork, LayoutGrid } from 'lucide-react';
import { TEMPLATES } from '../constants';
import type { BoardTemplate } from '../constants';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
}

const getTemplateIcon = (id: string) => {
  switch (id) {
    case 'kanban':
      return Kanban;
    case 'retro':
      return RotateCcw;
    case 'mindmap':
      return GitFork;
    case 'swot':
      return LayoutGrid;
    default:
      return LayoutTemplate;
  }
};

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold text-lg">
            <LayoutTemplate className="text-indigo-600" size={24} />
            Choose Board Template
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {TEMPLATES.map((tpl: BoardTemplate) => {
            const Icon = getTemplateIcon(tpl.id);
            return (
              <div
                key={tpl.id}
                onClick={() => {
                  onSelectTemplate(tpl.id);
                  onClose();
                }}
                className="group relative p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-lg bg-white hover:bg-indigo-50/30 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon size={22} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                      {tpl.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed pl-1">
                    {tpl.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {tpl.category}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Insert &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
