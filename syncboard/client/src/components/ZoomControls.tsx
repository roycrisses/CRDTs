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
    <div className="fixed bottom-6 left-6 flex items-center gap-2 p-1.5 bg-white/80 backdrop-blur-xl rounded-xl shadow-xl border border-white/20 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>

      <button
        onClick={onReset}
        className="px-2 min-w-[60px] text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-lg py-1 transition-colors"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      <button
        onClick={onReset}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Fit to Screen"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};
