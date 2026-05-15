import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-1 p-1 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>

      <button
        onClick={onResetZoom}
        className="px-2 min-w-[60px] text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors py-1"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>

      <button
        onClick={onZoomIn}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-1" />

      <button
        onClick={onResetZoom}
        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        title="Reset View"
      >
        <RotateCcw size={16} />
      </button>
    </div>
  );
};
