import React, { useState } from 'react';
import {
  MousePointer2,
  Square,
  Circle as CircleIcon,
  Type,
  StickyNote,
  Pencil,
  Trash2,
  Hand,
  ArrowRight,
  Triangle,
  Sparkles,
  Highlighter,
  Grid,
} from 'lucide-react';
import { cn } from '../lib/utils';

export type Tool =
  | 'select'
  | 'pencil'
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'sticky'
  | 'hand'
  | 'arrow'
  | 'triangle'
  | 'diamond'
  | 'laser'
  | 'highlighter'
  | 'stamp'
  | 'grid';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onClear: () => void;
  snapToGrid: boolean;
  setSnapToGrid: (val: boolean) => void;
  selectedStamp: string;
  setSelectedStamp: (val: string) => void;
}

const STAMPS = ['👍', '❤️', '🔥', '😮', '❓', '💡'];

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTool,
  setActiveTool,
  onClear,
  snapToGrid,
  setSnapToGrid,
  selectedStamp,
  setSelectedStamp,
}) => {
  const [showStamps, setShowStamps] = useState(false);

  // Custom Diamond Icon Component using SVG path
  const DiamondIcon = ({ size = 22, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2L2 12l10 10 10-10z" />
    </svg>
  );

  const tools = [
    { id: 'select', icon: MousePointer2, label: 'Select (V)' },
    { id: 'hand', icon: Hand, label: 'Hand (H)' },
    { id: 'pencil', icon: Pencil, label: 'Pencil (P)' },
    { id: 'highlighter', icon: Highlighter, label: 'Highlighter (I)' },
    { id: 'laser', icon: Sparkles, label: 'Laser Pointer (L)' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow (A)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'circle', icon: CircleIcon, label: 'Circle (O)' },
    { id: 'triangle', icon: Triangle, label: 'Triangle (Y)' },
    { id: 'diamond', icon: DiamondIcon, label: 'Diamond (D)' },
    { id: 'text', icon: Type, label: 'Text (T)' },
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note (S)' },
  ] as const;

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 p-2 bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => {
            setActiveTool(tool.id);
            setShowStamps(false);
          }}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
            activeTool === tool.id
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
          )}
          title={tool.label}
        >
          <tool.icon size={20} strokeWidth={activeTool === tool.id ? 2.5 : 2} />
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
            {tool.label}
          </span>
        </button>
      ))}

      {/* Stamp selector tool */}
      <div className="relative">
        <button
          onClick={() => {
            setActiveTool('stamp');
            setShowStamps(!showStamps);
          }}
          className={cn(
            "p-3 w-full rounded-xl transition-all duration-200 group relative flex items-center justify-center cursor-pointer",
            activeTool === 'stamp'
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
          )}
          title="Stamps"
        >
          <span className="text-lg leading-none">{selectedStamp}</span>
          <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
            Stamp Tool
          </span>
        </button>
        {showStamps && (
          <div className="absolute top-0 left-14 flex gap-1.5 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 animate-in fade-in slide-in-from-left-2 duration-150">
            {STAMPS.map((stamp) => (
              <button
                key={stamp}
                onClick={() => {
                  setSelectedStamp(stamp);
                  setActiveTool('stamp');
                  setShowStamps(false);
                }}
                className={cn(
                  "p-1.5 text-lg rounded-lg hover:bg-slate-100 transition-colors cursor-pointer",
                  selectedStamp === stamp && activeTool === 'stamp' ? "bg-indigo-50 border border-indigo-200" : ""
                )}
              >
                {stamp}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-slate-200/50 my-1 mx-2" />

      {/* Snap to Grid Toggle */}
      <button
        onClick={() => setSnapToGrid(!snapToGrid)}
        className={cn(
          "p-3 rounded-xl transition-all duration-200 group relative cursor-pointer",
          snapToGrid
            ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
        )}
        title="Snap to Grid"
      >
        <Grid size={20} />
        <span className="absolute left-14 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
          Snap to Grid ({snapToGrid ? 'ON' : 'OFF'})
        </span>
      </button>

      {/* Clear board tool */}
      <button
        onClick={onClear}
        className="p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-all duration-200 group relative cursor-pointer"
        title="Clear Board"
      >
        <Trash2 size={20} />
        <span className="absolute left-14 px-2 py-1 bg-rose-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
          Clear Board
        </span>
      </button>
    </div>
  );
};
