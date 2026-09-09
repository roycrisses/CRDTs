export interface StampItem {
  id: string;
  emoji: string;
  label: string;
}

export const STAMPS: StampItem[] = [
  { id: 'thumbsup', emoji: '👍', label: 'Thumbs Up' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'idea', emoji: '💡', label: 'Idea' },
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'rocket', emoji: '🚀', label: 'Rocket' },
  { id: 'check', emoji: '✅', label: 'Check' },
];

export const COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ef4444',
  '#64748b',
  '#1e293b',
];

export const STICKY_COLORS = [
  '#fef3c7',
  '#dcfce7',
  '#dbeafe',
  '#f3e8ff',
  '#fee2e2',
];

export const FONTS = [
  { name: 'Inter (Sans)', value: 'Inter, sans-serif' },
  { name: 'Comic (Handwritten)', value: 'Comic Sans MS, cursive, sans-serif' },
  { name: 'Mono (Code)', value: 'ui-monospace, Consolas, monospace' },
  { name: 'Serif (Classic)', value: 'Georgia, serif' },
];

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
export const ROOM_NAME_MAX_LENGTH = 50;
