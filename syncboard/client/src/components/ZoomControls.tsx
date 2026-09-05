import React from 'react';
import { Plus, Minus, Maximize, Grid } from 'lucide-react';
import { cn } from '../lib/utils';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  snapToGrid = false,
  onToggleSnapToGrid,
}) => {
  return (
    <div className="fixed bottom-6 left-6 flex items-center gap-1 p-1.5 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Zoom Out (-)"
      >
        <Minus size={18} />
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-w-[56px] text-center"
        title="Reset Zoom (100%)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Zoom In (+)"
      >
        <Plus size={18} />
      </button>
      <div className="w-px h-5 bg-slate-200 mx-1" />
      <button
        onClick={onReset}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Fit Content / Reset View"
      >
        <Maximize size={18} />
      </button>
      {onToggleSnapToGrid && (
        <>
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button
            onClick={onToggleSnapToGrid}
            className={cn(
              "p-2 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold",
              snapToGrid
                ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                : "text-slate-500 hover:bg-slate-100"
            )}
            title={snapToGrid ? "Snap to Grid: ON" : "Snap to Grid: OFF"}
          >
            <Grid size={18} />
          </button>
        </>
      )}
    </div>
  );
};
