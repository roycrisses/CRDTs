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
    <div className="fixed bottom-6 left-6 flex items-center gap-1 p-1 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <div className="flex items-center gap-0.5">
        <button
          onClick={onZoomOut}
          className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all"
          title="Zoom Out"
        >
          <Minus size={16} />
        </button>

        <button
          onClick={onReset}
          className="px-2 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-100 rounded-xl transition-all min-w-[50px]"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={onZoomIn}
          className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all"
          title="Zoom In"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-slate-200/60 mx-1" />

      <button
        onClick={onReset}
        className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all"
        title="Fit to Screen"
      >
        <Maximize size={16} />
      </button>
    </div>
  );
};
