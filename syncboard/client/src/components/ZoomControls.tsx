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
    <div className="fixed bottom-6 left-6 flex items-center gap-2 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>

      <div className="px-2 min-w-[60px] text-center text-sm font-bold text-slate-700">
        {Math.round(zoom * 100)}%
      </div>

      <button
        onClick={onZoomIn}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>

      <div className="w-px h-6 bg-slate-200 mx-1" />

      <button
        onClick={onReset}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Reset Zoom"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};
