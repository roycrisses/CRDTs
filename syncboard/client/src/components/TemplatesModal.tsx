import React from 'react';
import { X, LayoutTemplate, Sparkles, Plus } from 'lucide-react';
import { TEMPLATES } from '../constants';
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
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-xs">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Board Templates
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold border border-indigo-100 flex items-center gap-1">
                  <Sparkles size={12} /> Interactive
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Select a ready-to-use template for your team collaboration.
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
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="group border border-slate-200/90 hover:border-indigo-500 hover:shadow-lg rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between bg-white relative overflow-hidden cursor-pointer"
              onClick={() => {
                onSelectTemplate(template);
                onClose();
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {template.category}
                </span>
                <button
                  className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-xs"
                  title="Insert Template"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-indigo-600 transition-colors">
                  {template.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {template.description}
                </p>
              </div>

              <div className="text-[11px] font-semibold text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                <span>{template.elements.length} components</span>
                <span className="group-hover:translate-x-1 transition-transform text-indigo-600 font-bold">
                  Add to Canvas &rarr;
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
