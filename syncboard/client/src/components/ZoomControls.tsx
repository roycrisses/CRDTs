import React from 'react';
import { Minus, Plus, Maximize } from 'lucide-react';

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
  onReset
}) => {
  return (
    <div className="fixed bottom-8 right-8 flex items-center gap-1 p-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>
      <button
        onClick={onReset}
        className="px-2 py-1 min-w-[60px] text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>
      <div className="w-px h-6 bg-slate-100 mx-1" />
      <button
        onClick={onReset}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
        title="Fit to Screen"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};
