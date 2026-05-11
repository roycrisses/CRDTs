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
  onReset
}) => {
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-1 p-1 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>

      <button
        onClick={onReset}
        className="px-2 min-w-[60px] text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg py-2 transition-colors"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>

      <div className="w-px h-4 bg-slate-100 mx-1" />

      <button
        onClick={onReset}
        className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
        title="Fit to Screen (Reset)"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};
