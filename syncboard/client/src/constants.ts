export interface StampItem {
  id: string;
  emoji: string;
  label: string;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Agile' | 'Brainstorming' | 'Strategy' | 'Diagramming';
  previewColor: string;
}

export interface ShortcutItem {
  key: string;
  action: string;
  category: 'Tools' | 'Canvas' | 'Actions';
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
  { id: 'question', emoji: '❓', label: 'Question' },
  { id: 'warning', emoji: '⚠️', label: 'Warning' },
  { id: 'eyes', emoji: '👀', label: 'Looking' },
  { id: '100', emoji: '💯', label: '100%' },
];

export const BADGES = [
  { id: 'todo', label: 'TO DO', bg: '#e0e7ff', color: '#3730a3' },
  { id: 'in_progress', label: 'IN PROGRESS', bg: '#fef3c7', color: '#92400e' },
  { id: 'done', label: 'DONE', bg: '#dcfce7', color: '#166534' },
  { id: 'blocked', label: 'BLOCKED', bg: '#fee2e2', color: '#991b1b' },
  { id: 'review', label: 'IN REVIEW', bg: '#f3e8ff', color: '#6b21a8' },
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
  '#06b6d4',
  '#84cc16',
  '#d97706',
];

export const STICKY_COLORS = [
  '#fef3c7',
  '#dcfce7',
  '#dbeafe',
  '#f3e8ff',
  '#fee2e2',
  '#ffedd5',
  '#f1f5f9',
];

export const FONTS = [
  { name: 'Inter (Sans)', value: 'Inter, sans-serif' },
  { name: 'Comic (Handwritten)', value: 'Comic Sans MS, cursive, sans-serif' },
  { name: 'Mono (Code)', value: 'ui-monospace, Consolas, monospace' },
  { name: 'Serif (Classic)', value: 'Georgia, serif' },
];

export const FONT_SIZES = [
  { label: 'S', value: 16 },
  { label: 'M', value: 24 },
  { label: 'L', value: 36 },
  { label: 'XL', value: 48 },
];

export const STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
];

export const STROKE_STYLES = [
  { id: 'solid', label: 'Solid', dash: [] },
  { id: 'dashed', label: 'Dashed', dash: [8, 8] },
  { id: 'dotted', label: 'Dotted', dash: [3, 3] },
];

export const TEMPLATES: BoardTemplate[] = [
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: '3-column workflow board (To Do, In Progress, Done) with pre-filled sticky cards.',
    category: 'Agile',
    previewColor: '#6366f1',
  },
  {
    id: 'retrospective',
    name: 'Sprint Retrospective',
    description: 'What Went Well, What Can Improve, and Action Items for agile teams.',
    category: 'Agile',
    previewColor: '#10b981',
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Central concept frame surrounded by connected ideas and topic branches.',
    category: 'Brainstorming',
    previewColor: '#f59e0b',
  },
  {
    id: 'swot',
    name: 'SWOT Analysis',
    description: 'Strategic matrix analyzing Strengths, Weaknesses, Opportunities, and Threats.',
    category: 'Strategy',
    previewColor: '#8b5cf6',
  },
];

export const SHORTCUTS: ShortcutItem[] = [
  { key: 'V', action: 'Select Tool', category: 'Tools' },
  { key: 'H', action: 'Hand / Pan Tool', category: 'Tools' },
  { key: 'P', action: 'Pencil / Draw Tool', category: 'Tools' },
  { key: 'I', action: 'Highlighter Tool', category: 'Tools' },
  { key: 'L', action: 'Laser Pointer Tool', category: 'Tools' },
  { key: 'A', action: 'Arrow / Connector Tool', category: 'Tools' },
  { key: 'F', action: 'Frame Container Tool', category: 'Tools' },
  { key: 'R', action: 'Rectangle Tool', category: 'Tools' },
  { key: 'O', action: 'Circle Tool', category: 'Tools' },
  { key: 'T', action: 'Text Box Tool', category: 'Tools' },
  { key: 'S', action: 'Sticky Note Tool', category: 'Tools' },
  { key: 'Cmd / Ctrl + D', action: 'Duplicate Selected Object', category: 'Actions' },
  { key: 'Delete / Backspace', action: 'Delete Selected Object', category: 'Actions' },
  { key: 'Cmd / Ctrl + Z', action: 'Undo Last Action', category: 'Actions' },
  { key: 'Cmd / Ctrl + Shift + Z / Ctrl + Y', action: 'Redo Action', category: 'Actions' },
  { key: 'Mouse Wheel', action: 'Zoom Canvas In / Out', category: 'Canvas' },
  { key: 'Space + Drag', action: 'Pan Canvas', category: 'Canvas' },
  { key: '?', action: 'Open Shortcuts Helper', category: 'Canvas' },
];

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
export const ROOM_NAME_MAX_LENGTH = 50;
