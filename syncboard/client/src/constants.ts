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
  { id: 'question', emoji: '❓', label: 'Question' },
  { id: 'target', emoji: '🎯', label: 'Target' },
  { id: 'lightning', emoji: '⚡', label: 'Lightning' },
  { id: 'chat', emoji: '💬', label: 'Comment' },
];

export interface BadgePreset {
  id: string;
  text: string;
  color: string;
}

export const STATUS_BADGES: BadgePreset[] = [
  { id: 'in_progress', text: 'IN PROGRESS', color: '#3b82f6' },
  { id: 'approved', text: 'APPROVED', color: '#10b981' },
  { id: 'need_review', text: 'NEED REVIEW', color: '#f59e0b' },
  { id: 'blocked', text: 'BLOCKED', color: '#ef4444' },
  { id: 'done', text: 'DONE', color: '#8b5cf6' },
  { id: 'draft', text: 'DRAFT', color: '#64748b' },
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

export interface TemplateElement {
  type:
    | 'rectangle'
    | 'circle'
    | 'triangle'
    | 'diamond'
    | 'text'
    | 'sticky'
    | 'arrow'
    | 'frame'
    | 'badge';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: {
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    fontFamily?: string;
  };
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  elements: TemplateElement[];
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: '3-column workflow board for task tracking',
    icon: 'Columns3',
    elements: [
      // Frames
      {
        type: 'frame',
        position: { x: -500, y: -250 },
        size: { width: 300, height: 500 },
        content: 'To Do 📋',
        style: { fill: '#f8fafc', stroke: '#e2e8f0', strokeWidth: 2 },
      },
      {
        type: 'frame',
        position: { x: -160, y: -250 },
        size: { width: 300, height: 500 },
        content: 'In Progress ⚡',
        style: { fill: '#f0f9ff', stroke: '#bae6fd', strokeWidth: 2 },
      },
      {
        type: 'frame',
        position: { x: 180, y: -250 },
        size: { width: 300, height: 500 },
        content: 'Done 🎉',
        style: { fill: '#f0fdf4', stroke: '#bbf7d0', strokeWidth: 2 },
      },
      // Sticky Notes in To Do
      {
        type: 'sticky',
        position: { x: -470, y: -180 },
        size: { width: 160, height: 160 },
        content: 'Design UI Wireframes',
        style: { fill: '#fef3c7' },
      },
      {
        type: 'sticky',
        position: { x: -470, y: 10 },
        size: { width: 160, height: 160 },
        content: 'Setup Analytics API',
        style: { fill: '#fee2e2' },
      },
      // Sticky Note in In Progress
      {
        type: 'sticky',
        position: { x: -130, y: -180 },
        size: { width: 160, height: 160 },
        content: 'Real-time WebSockets Sync',
        style: { fill: '#dbeafe' },
      },
      {
        type: 'badge',
        position: { x: -130, y: -10 },
        size: { width: 120, height: 32 },
        content: 'IN PROGRESS',
        style: { fill: '#3b82f6' },
      },
      // Sticky Note in Done
      {
        type: 'sticky',
        position: { x: 210, y: -180 },
        size: { width: 160, height: 160 },
        content: 'Project Kickoff Meeting',
        style: { fill: '#dcfce7' },
      },
      {
        type: 'badge',
        position: { x: 210, y: -10 },
        size: { width: 100, height: 32 },
        content: 'DONE',
        style: { fill: '#10b981' },
      },
    ],
  },
  {
    id: 'retrospective',
    name: 'Sprint Retrospective',
    description: 'Reflect on what went well and what to improve',
    icon: 'RotateCcw',
    elements: [
      {
        type: 'frame',
        position: { x: -500, y: -250 },
        size: { width: 300, height: 500 },
        content: 'What Went Well 🎉',
        style: { fill: '#f0fdf4', stroke: '#86efac', strokeWidth: 2 },
      },
      {
        type: 'frame',
        position: { x: -160, y: -250 },
        size: { width: 300, height: 500 },
        content: 'What To Improve 💡',
        style: { fill: '#fefce8', stroke: '#fde047', strokeWidth: 2 },
      },
      {
        type: 'frame',
        position: { x: 180, y: -250 },
        size: { width: 300, height: 500 },
        content: 'Action Items 🚀',
        style: { fill: '#fef2f2', stroke: '#fca5a5', strokeWidth: 2 },
      },
      {
        type: 'sticky',
        position: { x: -470, y: -180 },
        size: { width: 160, height: 160 },
        content: 'Great team collaboration!',
        style: { fill: '#dcfce7' },
      },
      {
        type: 'sticky',
        position: { x: -130, y: -180 },
        size: { width: 160, height: 160 },
        content: 'CI/CD pipeline was slow',
        style: { fill: '#fef3c7' },
      },
      {
        type: 'sticky',
        position: { x: 210, y: -180 },
        size: { width: 160, height: 160 },
        content: 'Automate build checks',
        style: { fill: '#fee2e2' },
      },
    ],
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Brainstorm ideas around a central concept',
    icon: 'GitFork',
    elements: [
      {
        type: 'rectangle',
        position: { x: -100, y: -40 },
        size: { width: 200, height: 80 },
        content: 'Central Project',
        style: { fill: '#6366f1', stroke: '#4f46e5', strokeWidth: 2 },
      },
      {
        type: 'sticky',
        position: { x: -380, y: -200 },
        size: { width: 150, height: 120 },
        content: 'Feature A: Real-time Cursors',
        style: { fill: '#dbeafe' },
      },
      {
        type: 'sticky',
        position: { x: 220, y: -200 },
        size: { width: 150, height: 120 },
        content: 'Feature B: Custom Stamps',
        style: { fill: '#f3e8ff' },
      },
      {
        type: 'sticky',
        position: { x: -380, y: 120 },
        size: { width: 150, height: 120 },
        content: 'Feature C: PNG Export',
        style: { fill: '#dcfce7' },
      },
      {
        type: 'sticky',
        position: { x: 220, y: 120 },
        size: { width: 150, height: 120 },
        content: 'Feature D: Snap to Grid',
        style: { fill: '#fef3c7' },
      },
      {
        type: 'arrow',
        position: { x: -180, y: -100 },
        size: { width: 100, height: 50 },
        style: { fill: '#6366f1' },
      },
      {
        type: 'arrow',
        position: { x: 100, y: -100 },
        size: { width: 100, height: 50 },
        style: { fill: '#6366f1' },
      },
    ],
  },
  {
    id: 'swot',
    name: 'SWOT Analysis',
    description: 'Evaluate Strengths, Weaknesses, Opportunities, Threats',
    icon: 'Grid2X2',
    elements: [
      {
        type: 'frame',
        position: { x: -380, y: -260 },
        size: { width: 340, height: 240 },
        content: 'Strengths 💪',
        style: { fill: '#f0fdf4', stroke: '#86efac', strokeWidth: 2 },
      },
      {
        type: 'frame',
        position: { x: 20, y: -260 },
        size: { width: 340, height: 240 },
        content: 'Weaknesses ⚠️',
        style: { fill: '#fca5a5', stroke: '#ef4444', strokeWidth: 2 },
      },
      {
        type: 'frame',
        position: { x: -380, y: 20 },
        size: { width: 340, height: 240 },
        content: 'Opportunities 🌟',
        style: { fill: '#f0f9ff', stroke: '#bae6fd', strokeWidth: 2 },
      },
      {
        type: 'frame',
        position: { x: 20, y: 20 },
        size: { width: 340, height: 240 },
        content: 'Threats 🛡️',
        style: { fill: '#fefce8', stroke: '#fde047', strokeWidth: 2 },
      },
    ],
  },
];

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
export const ROOM_NAME_MAX_LENGTH = 50;
