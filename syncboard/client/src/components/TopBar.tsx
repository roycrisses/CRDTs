import React from 'react';
import { Share2, Users } from 'lucide-react';

interface TopBarProps {
  status: string;
  userCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({ status, userCount }) => {
  return (
    <div className="fixed top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-50">
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-xl shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 hidden sm:block">SyncBoard</h1>
        </div>
        <div className="h-4 w-[1px] bg-zinc-200 dark:border-zinc-800 mx-1" />
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 capitalize">{status}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-2 rounded-xl shadow-lg">
          <Users className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{userCount}</span>
        </div>
        <button className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-semibold">Share</span>
        </button>
      </div>
    </div>
  );
};
