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
    <div className="fixed bottom-6 left-6 flex items-center gap-1 p-1 bg-white/90 backdrop-blur-2xl rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all cursor-pointer"
        title="Zoom Out"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={onReset}
        className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all min-w-[55px] cursor-pointer"
        title="Fit to Screen"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2 text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all cursor-pointer"
        title="Zoom In"
      >
        <Plus size={16} />
      </button>
      <div className="w-px h-4 bg-slate-200/50 mx-1" />
      <button
        onClick={onReset}
        className="p-2 text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-lg transition-all cursor-pointer"
        title="Fit to Screen"
      >
        <Maximize size={16} />
      </button>
    </div>
  );
};
