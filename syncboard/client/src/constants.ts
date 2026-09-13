export interface StampItem {
  id: string;
  emoji: string;
  label: string;
}

export interface StatusBadge {
  id: string;
  label: string;
  color: string;
  textColor: string;
}

export interface BoardTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Agile' | 'Brainstorm' | 'Strategy' | 'Diagram';
  elements: Array<{
    type: 'rectangle' | 'circle' | 'triangle' | 'diamond' | 'text' | 'sticky' | 'arrow';
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    content?: string;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    fontFamily?: string;
  }>;
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

export const STATUS_BADGES: StatusBadge[] = [
  { id: 'approved', label: 'APPROVED', color: '#10b981', textColor: '#ffffff' },
  { id: 'in_progress', label: 'IN PROGRESS', color: '#3b82f6', textColor: '#ffffff' },
  { id: 'done', label: 'DONE', color: '#6366f1', textColor: '#ffffff' },
  { id: 'urgent', label: 'URGENT', color: '#ef4444', textColor: '#ffffff' },
  { id: 'blocked', label: 'BLOCKED', color: '#f59e0b', textColor: '#ffffff' },
];

export const TEMPLATES: BoardTemplate[] = [
  {
    id: 'kanban',
    title: 'Kanban Board',
    description: 'Track workflow with To Do, In Progress, and Done columns.',
    category: 'Agile',
    elements: [
      { type: 'rectangle', offsetX: 0, offsetY: 0, width: 280, height: 450, fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 2 },
      { type: 'text', offsetX: 20, offsetY: 15, width: 240, height: 30, content: '📋 To Do', fill: '#1e293b', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 20, offsetY: 60, width: 240, height: 100, content: 'Research competitor features', fill: '#fef3c7' },
      { type: 'sticky', offsetX: 20, offsetY: 180, width: 240, height: 100, content: 'Design wireframes', fill: '#dbeafe' },

      { type: 'rectangle', offsetX: 310, offsetY: 0, width: 280, height: 450, fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 2 },
      { type: 'text', offsetX: 330, offsetY: 15, width: 240, height: 30, content: '⚡ In Progress', fill: '#1e293b', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 330, offsetY: 60, width: 240, height: 100, content: 'Implement real-time sync', fill: '#f3e8ff' },

      { type: 'rectangle', offsetX: 620, offsetY: 0, width: 280, height: 450, fill: '#f8fafc', stroke: '#cbd5e1', strokeWidth: 2 },
      { type: 'text', offsetX: 640, offsetY: 15, width: 240, height: 30, content: '✅ Done', fill: '#1e293b', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 640, offsetY: 60, width: 240, height: 100, content: 'Setup CI/CD pipeline', fill: '#dcfce7' },
    ],
  },
  {
    id: 'retrospective',
    title: 'Sprint Retrospective',
    description: 'Reflect on what went well, what can improve, and action items.',
    category: 'Agile',
    elements: [
      { type: 'rectangle', offsetX: 0, offsetY: 0, width: 280, height: 420, fill: '#f0fdf4', stroke: '#86efac', strokeWidth: 2 },
      { type: 'text', offsetX: 20, offsetY: 15, width: 240, height: 30, content: '🌟 What Went Well', fill: '#166534', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 20, offsetY: 60, width: 240, height: 100, content: 'Great teamwork on release!', fill: '#dcfce7' },

      { type: 'rectangle', offsetX: 310, offsetY: 0, width: 280, height: 420, fill: '#fef2f2', stroke: '#fca5a5', strokeWidth: 2 },
      { type: 'text', offsetX: 330, offsetY: 15, width: 240, height: 30, content: '🔧 What Can Improve', fill: '#991b1b', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 330, offsetY: 60, width: 240, height: 100, content: 'Faster test runs needed', fill: '#fee2e2' },

      { type: 'rectangle', offsetX: 620, offsetY: 0, width: 280, height: 420, fill: '#eff6ff', stroke: '#93c5fd', strokeWidth: 2 },
      { type: 'text', offsetX: 640, offsetY: 15, width: 240, height: 30, content: '🚀 Action Items', fill: '#1e40af', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 640, offsetY: 60, width: 240, height: 100, content: 'Automate build pipeline', fill: '#dbeafe' },
    ],
  },
  {
    id: 'mindmap',
    title: 'Mind Map',
    description: 'Brainstorm concepts around a central core idea.',
    category: 'Brainstorm',
    elements: [
      { type: 'circle', offsetX: 250, offsetY: 180, width: 140, height: 140, fill: '#6366f1' },
      { type: 'text', offsetX: 270, offsetY: 235, width: 100, height: 30, content: '💡 Main Idea', fill: '#ffffff', fontFamily: 'Inter, sans-serif' },

      { type: 'sticky', offsetX: 20, offsetY: 40, width: 140, height: 90, content: 'Feature A', fill: '#fef3c7' },
      { type: 'arrow', offsetX: 160, offsetY: 90, width: 100, height: 20, fill: '#6366f1' },

      { type: 'sticky', offsetX: 480, offsetY: 40, width: 140, height: 90, content: 'Feature B', fill: '#dbeafe' },
      { type: 'arrow', offsetX: 380, offsetY: 110, width: 100, height: 20, fill: '#6366f1' },

      { type: 'sticky', offsetX: 20, offsetY: 340, width: 140, height: 90, content: 'Feature C', fill: '#f3e8ff' },
      { type: 'arrow', offsetX: 160, offsetY: 370, width: 100, height: 20, fill: '#6366f1' },

      { type: 'sticky', offsetX: 480, offsetY: 340, width: 140, height: 90, content: 'Feature D', fill: '#dcfce7' },
      { type: 'arrow', offsetX: 380, offsetY: 370, width: 100, height: 20, fill: '#6366f1' },
    ],
  },
  {
    id: 'swot',
    title: 'SWOT Analysis',
    description: 'Analyze Strengths, Weaknesses, Opportunities, and Threats.',
    category: 'Strategy',
    elements: [
      { type: 'rectangle', offsetX: 0, offsetY: 0, width: 280, height: 220, fill: '#f0fdf4', stroke: '#86efac', strokeWidth: 2 },
      { type: 'text', offsetX: 20, offsetY: 15, width: 240, height: 30, content: '💪 Strengths', fill: '#166534', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 20, offsetY: 60, width: 240, height: 120, content: 'Strong brand loyalty', fill: '#dcfce7' },

      { type: 'rectangle', offsetX: 300, offsetY: 0, width: 280, height: 220, fill: '#fef2f2', stroke: '#fca5a5', strokeWidth: 2 },
      { type: 'text', offsetX: 320, offsetY: 15, width: 240, height: 30, content: '⚠️ Weaknesses', fill: '#991b1b', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 320, offsetY: 60, width: 240, height: 120, content: 'Limited marketing budget', fill: '#fee2e2' },

      { type: 'rectangle', offsetX: 0, offsetY: 240, width: 280, height: 220, fill: '#eff6ff', stroke: '#93c5fd', strokeWidth: 2 },
      { type: 'text', offsetX: 20, offsetY: 255, width: 240, height: 30, content: '🎯 Opportunities', fill: '#1e40af', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 20, offsetY: 300, width: 240, height: 120, content: 'Expanding global market', fill: '#dbeafe' },

      { type: 'rectangle', offsetX: 300, offsetY: 240, width: 280, height: 220, fill: '#fff7ed', stroke: '#fdba74', strokeWidth: 2 },
      { type: 'text', offsetX: 320, offsetY: 255, width: 240, height: 30, content: '🛡️ Threats', fill: '#c2410c', fontFamily: 'Inter, sans-serif' },
      { type: 'sticky', offsetX: 320, offsetY: 300, width: 240, height: 120, content: 'New market competitors', fill: '#fef3c7' },
    ],
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
