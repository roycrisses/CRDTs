import React from 'react';
import { Plus, Minus, Maximize } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
}) => {
  return (
    <div className="fixed bottom-8 left-8 flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <button
        onClick={onZoomOut}
        className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-all"
        title="Zoom Out"
      >
        <Minus size={18} strokeWidth={2.5} />
      </button>
      <button
        onClick={onReset}
        className="px-4 py-2 text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all min-w-[70px] tracking-tight"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-all"
        title="Zoom In"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
      <div className="w-px h-6 bg-slate-200/60 mx-1.5" />
      <button
        onClick={onReset}
        className="p-2.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-xl transition-all"
        title="Fit to Screen"
      >
        <Maximize size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
};
