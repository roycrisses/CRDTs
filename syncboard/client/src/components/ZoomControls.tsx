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
    <div className="fixed bottom-8 left-8 flex items-center gap-0.5 p-1 bg-white/90 backdrop-blur-2xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <button
        onClick={onZoomOut}
        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Zoom Out"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={onReset}
        className="px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-w-[50px] text-center"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Zoom In"
      >
        <Plus size={16} />
      </button>
      <div className="w-px h-4 bg-slate-200 mx-1" />
      <button
        onClick={onReset}
        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Fit to Screen"
      >
        <Maximize size={16} />
      </button>
    </div>
  );
};
