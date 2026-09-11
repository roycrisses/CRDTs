import React from 'react';
import { Plus, Minus, Maximize, Grid, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  snapToGrid?: boolean;
  onToggleSnapToGrid?: () => void;
  onOpenShortcuts?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onReset,
  snapToGrid,
  onToggleSnapToGrid,
  onOpenShortcuts,
}) => {
  return (
    <div className="fixed bottom-6 left-20 flex items-center gap-1 p-1 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      <button
        onClick={onZoomOut}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Zoom Out"
      >
        <Minus size={18} />
      </button>
      <button
        onClick={onReset}
        className="px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors min-w-[55px]"
        title="Reset Zoom / Fit to Screen"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Zoom In"
      >
        <Plus size={18} />
      </button>

      <div className="w-px h-4 bg-slate-200 mx-0.5" />

      <button
        onClick={onReset}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
        title="Fit to Screen"
      >
        <Maximize size={18} />
      </button>

      {onToggleSnapToGrid && (
        <>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            onClick={onToggleSnapToGrid}
            className={cn(
              'p-2 rounded-xl transition-colors',
              snapToGrid
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-slate-600 hover:bg-slate-100'
            )}
            title={snapToGrid ? 'Disable Snap to Grid' : 'Enable Snap to Grid'}
          >
            <Grid size={18} />
          </button>
        </>
      )}

      {onOpenShortcuts && (
        <button
          onClick={onOpenShortcuts}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          title="Keyboard Shortcuts (?)"
        >
          <HelpCircle size={18} />
        </button>
      )}
    </div>
  );
};
