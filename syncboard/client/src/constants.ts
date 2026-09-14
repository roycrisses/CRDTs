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

export const FONT_SIZES = [14, 18, 24, 32, 48, 64];

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
export const ROOM_NAME_MAX_LENGTH = 50;

export interface StatusBadge {
  id: string;
  label: string;
  bg: string;
  text: string;
}

export const STATUS_BADGES: StatusBadge[] = [
  { id: 'todo', label: 'TO DO', bg: '#e2e8f0', text: '#334155' },
  { id: 'in_progress', label: 'IN PROGRESS', bg: '#fef3c7', text: '#92400e' },
  { id: 'in_review', label: 'IN REVIEW', bg: '#dbeafe', text: '#1e40af' },
  { id: 'approved', label: 'APPROVED', bg: '#dcfce7', text: '#166534' },
  { id: 'urgent', label: 'URGENT 🚨', bg: '#fee2e2', text: '#991b1b' },
];

export interface TemplateElement {
  type: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'arrow';
  xOffset: number;
  yOffset: number;
  width: number;
  height: number;
  content?: string;
  fill: string;
}

export interface BoardTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Agile' | 'Brainstorming' | 'Strategy' | 'Design';
  elements: TemplateElement[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'kanban',
    title: 'Kanban Board',
    description: 'Track workflow with To Do, In Progress, and Done columns',
    category: 'Agile',
    elements: [
      // To Do Column
      { type: 'rectangle', xOffset: -320, yOffset: -220, width: 200, height: 420, fill: '#f1f5f9' },
      { type: 'text', xOffset: -300, yOffset: -200, width: 160, height: 30, content: '📋 TO DO', fill: '#334155' },
      { type: 'sticky', xOffset: -300, yOffset: -150, width: 160, height: 160, content: 'User authentication feature', fill: '#fef3c7' },
      { type: 'sticky', xOffset: -300, yOffset: 20, width: 160, height: 160, content: 'Setup CI/CD Pipeline', fill: '#dbeafe' },

      // In Progress Column
      { type: 'rectangle', xOffset: -100, yOffset: -220, width: 200, height: 420, fill: '#eff6ff' },
      { type: 'text', xOffset: -80, yOffset: -200, width: 160, height: 30, content: '🚀 IN PROGRESS', fill: '#1d4ed8' },
      { type: 'sticky', xOffset: -80, yOffset: -150, width: 160, height: 160, content: 'Collaborative canvas rendering', fill: '#dcfce7' },

      // Done Column
      { type: 'rectangle', xOffset: 120, yOffset: -220, width: 200, height: 420, fill: '#f0fdf4' },
      { type: 'text', xOffset: 140, yOffset: -200, width: 160, height: 30, content: '✅ DONE', fill: '#15803d' },
      { type: 'sticky', xOffset: 140, yOffset: -150, width: 160, height: 160, content: 'Project setup & Yjs integration', fill: '#f3e8ff' },
    ],
  },
  {
    id: 'retrospective',
    title: 'Sprint Retrospective',
    description: 'Reflect on what went well, what needs work, and action items',
    category: 'Agile',
    elements: [
      // Went Well
      { type: 'rectangle', xOffset: -320, yOffset: -200, width: 200, height: 380, fill: '#f0fdf4' },
      { type: 'text', xOffset: -300, yOffset: -180, width: 160, height: 30, content: '🎉 What Went Well', fill: '#166534' },
      { type: 'sticky', xOffset: -300, yOffset: -130, width: 160, height: 160, content: 'Fast real-time cursor sync!', fill: '#dcfce7' },

      // Could Be Better
      { type: 'rectangle', xOffset: -100, yOffset: -200, width: 200, height: 380, fill: '#fff1f2' },
      { type: 'text', xOffset: -80, yOffset: -180, width: 160, height: 30, content: '💡 Could Improve', fill: '#9f1239' },
      { type: 'sticky', xOffset: -80, yOffset: -130, width: 160, height: 160, content: 'Add more template options', fill: '#fee2e2' },

      // Action Items
      { type: 'rectangle', xOffset: 120, yOffset: -200, width: 200, height: 380, fill: '#fefce8' },
      { type: 'text', xOffset: 140, yOffset: -180, width: 160, height: 30, content: '🎯 Action Items', fill: '#854d0e' },
      { type: 'sticky', xOffset: 140, yOffset: -130, width: 160, height: 160, content: 'Build FigJam / Miro template engine', fill: '#fef3c7' },
    ],
  },
  {
    id: 'mindmap',
    title: 'Mind Map',
    description: 'Brainstorm core concepts around a central topic',
    category: 'Brainstorming',
    elements: [
      { type: 'circle', xOffset: -60, yOffset: -40, width: 120, height: 120, fill: '#6366f1' },
      { type: 'text', xOffset: -40, yOffset: -10, width: 100, height: 30, content: 'Core Idea', fill: '#ffffff' },

      // Sub-nodes
      { type: 'sticky', xOffset: -260, yOffset: -160, width: 140, height: 140, content: 'Feature A: Realtime', fill: '#dbeafe' },
      { type: 'sticky', xOffset: 120, yOffset: -160, width: 140, height: 140, content: 'Feature B: Export', fill: '#fef3c7' },
      { type: 'sticky', xOffset: -260, yOffset: 80, width: 140, height: 140, content: 'Feature C: UI Polish', fill: '#dcfce7' },
      { type: 'sticky', xOffset: 120, yOffset: 80, width: 140, height: 140, content: 'Feature D: Security', fill: '#f3e8ff' },
    ],
  },
  {
    id: 'swot',
    title: 'SWOT Analysis',
    description: 'Evaluate Strengths, Weaknesses, Opportunities, and Threats',
    category: 'Strategy',
    elements: [
      // Strengths
      { type: 'rectangle', xOffset: -220, yOffset: -200, width: 200, height: 180, fill: '#dcfce7' },
      { type: 'text', xOffset: -200, yOffset: -180, width: 160, height: 24, content: '💪 Strengths', fill: '#14532d' },

      // Weaknesses
      { type: 'rectangle', xOffset: 20, yOffset: -200, width: 200, height: 180, fill: '#fee2e2' },
      { type: 'text', xOffset: 40, yOffset: -180, width: 160, height: 24, content: '⚠️ Weaknesses', fill: '#7f1d1d' },

      // Opportunities
      { type: 'rectangle', xOffset: -220, yOffset: 10, width: 200, height: 180, fill: '#dbeafe' },
      { type: 'text', xOffset: -200, yOffset: 30, width: 160, height: 24, content: '🚀 Opportunities', fill: '#1e3a8a' },

      // Threats
      { type: 'rectangle', xOffset: 20, yOffset: 10, width: 200, height: 180, fill: '#fef3c7' },
      { type: 'text', xOffset: 40, yOffset: 30, width: 160, height: 24, content: '⚡ Threats', fill: '#713f12' },
    ],
  },
];
