import React from 'react';
import { X, LayoutGrid, Sparkles } from 'lucide-react';
import { BOARD_TEMPLATES } from '../constants';
import type { BoardTemplate } from '../constants';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BoardTemplate) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <LayoutGrid size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Figma Jam & Miro Templates
                <span className="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={12} /> Starter
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Choose a pre-built interactive canvas layout to jumpstart your collaboration
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

        {/* Templates Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {BOARD_TEMPLATES.map((template) => (
            <div
              key={template.id}
              onClick={() => {
                onSelectTemplate(template);
                onClose();
              }}
              className="group p-5 bg-slate-50/80 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-300 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg group-hover:border-indigo-200 group-hover:text-indigo-600">
                    {template.category}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    Use Template &rarr;
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-indigo-900">
                  {template.title}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {template.description}
                </p>
              </div>

              {/* Elements badge */}
              <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between text-slate-400 text-[11px]">
                <span>{template.elements.length} components included</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
