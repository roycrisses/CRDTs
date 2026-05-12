import React from 'react';
import { Plus, Minus, Maximize } from 'lucide-react';

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
    <div className="fixed bottom-6 left-6 flex items-center gap-2 p-1.5 bg-white rounded-xl shadow-lg border border-slate-200 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>
      <button
        onClick={onResetZoom}
        className="px-3 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-sm font-bold min-w-[64px] flex items-center justify-center gap-1.5"
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
      <div className="w-px h-6 bg-slate-100 mx-1" />
      <button
        onClick={onResetZoom}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        title="Reset View"
      >
        <Maximize size={18} />
      </button>
    </div>
  );
};
