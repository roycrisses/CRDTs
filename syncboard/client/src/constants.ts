export interface StampItem {
  id: string;
  emoji: string;
  label: string;
}

export interface StatusBadgeItem {
  id: string;
  label: string;
  color: string;
  textColor: string;
}

export interface BoardTemplate {
  id: string;
  title: string;
  description: string;
  category: 'agile' | 'retro' | 'ideation' | 'strategy';
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

export const STATUS_BADGES: StatusBadgeItem[] = [
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6', textColor: '#ffffff' },
  { id: 'approved', label: 'Approved', color: '#10b981', textColor: '#ffffff' },
  { id: 'review', label: 'Needs Review', color: '#f59e0b', textColor: '#ffffff' },
  { id: 'blocked', label: 'Blocked', color: '#ef4444', textColor: '#ffffff' },
  { id: 'urgent', label: 'Urgent', color: '#8b5cf6', textColor: '#ffffff' },
  { id: 'idea', label: 'Draft Idea', color: '#64748b', textColor: '#ffffff' },
];

export const TEMPLATES: BoardTemplate[] = [
  {
    id: 'kanban',
    title: 'Kanban Board',
    description: 'Structure work items into To Do, In Progress, and Done columns.',
    category: 'agile',
  },
  {
    id: 'retro',
    title: 'Sprint Retrospective',
    description: 'Reflect with What Went Well, What To Improve, and Action Items.',
    category: 'retro',
  },
  {
    id: 'mindmap',
    title: 'Brainstorming & Mind Map',
    description: 'Central concept surrounded by branching idea nodes.',
    category: 'ideation',
  },
  {
    id: 'swot',
    title: 'SWOT Analysis Matrix',
    description: 'Analyze Strengths, Weaknesses, Opportunities, and Threats.',
    category: 'strategy',
  },
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
