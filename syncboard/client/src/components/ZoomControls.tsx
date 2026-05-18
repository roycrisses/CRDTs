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
  onReset,
}) => {
  return (
    <div className="fixed bottom-6 left-6 flex items-center gap-1 p-1 bg-white/80 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50">
      <button
        onClick={onZoomOut}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>

      <div className="px-2 min-w-[3.5rem] text-center text-sm font-bold text-slate-700 select-none">
        {Math.round(zoom * 100)}%
      </div>

      <button
        onClick={onZoomIn}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      <button
        onClick={onReset}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Fit to Screen"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};
