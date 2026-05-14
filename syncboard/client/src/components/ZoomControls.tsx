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
    <div className="fixed bottom-6 right-6 flex items-center gap-2 p-1.5 bg-white/70 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 ring-1 ring-slate-200/50 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100/80 transition-all active:scale-90"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>
      <button
        onClick={onReset}
        className="px-2 py-1 min-w-[60px] text-xs font-bold text-slate-700 hover:bg-slate-100/80 rounded-lg transition-all active:scale-90"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100/80 transition-all active:scale-90"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>
      <div className="w-px h-6 bg-slate-200 mx-1" />
      <button
        onClick={onReset}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100/80 transition-all active:scale-90"
        title="Fit to Screen"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};
