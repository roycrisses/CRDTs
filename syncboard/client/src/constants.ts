export interface StampItem {
  id: string;
  emoji: string;
  label: string;
}

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
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

export const TEMPLATES: BoardTemplate[] = [
  {
    id: 'kanban',
    name: 'Kanban Board',
    description: 'Track progress with To Do, In Progress, and Done columns.',
    category: 'Agile',
  },
  {
    id: 'retrospective',
    name: 'Sprint Retrospective',
    description: 'Reflect on what went well, what to improve, and action items.',
    category: 'Agile',
  },
  {
    id: 'mindmap',
    name: 'Mind Map',
    description: 'Brainstorm concepts and connect satellite ideas.',
    category: 'Brainstorming',
  },
  {
    id: 'swot',
    name: 'SWOT Analysis',
    description: 'Analyze Strengths, Weaknesses, Opportunities, and Threats.',
    category: 'Strategy',
  },
];

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
export const ROOM_NAME_MAX_LENGTH = 50;

export interface TemplateElement {
  id: string;
  type:
    | 'rectangle'
    | 'circle'
    | 'triangle'
    | 'diamond'
    | 'text'
    | 'sticky'
    | 'path'
    | 'arrow'
    | 'stamp'
    | 'image'
    | 'frame';
  position: { x: number; y: number };
  size: { width: number; height: number; radius?: number };
  content?: string;
  style: { fill: string; stroke?: string; strokeWidth?: number; fontFamily?: string };
  scaleX?: number;
  scaleY?: number;
  zIndex?: number;
  imageUrl?: string;
}

export function getTemplateElements(templateId: string, centerX: number, centerY: number): TemplateElement[] {
  const items: TemplateElement[] = [];

  if (templateId === 'kanban') {
    const colWidth = 260;
    const startX = centerX - colWidth * 1.5;
    const startY = centerY - 200;

    // Frame containers
    items.push(
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX, y: startY },
        size: { width: 240, height: 440 },
        content: '📋 TO DO',
        style: { fill: 'rgba(239, 68, 68, 0.05)', stroke: '#ef4444', strokeWidth: 2 },
      },
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX + colWidth, y: startY },
        size: { width: 240, height: 440 },
        content: '⚡ IN PROGRESS',
        style: { fill: 'rgba(245, 158, 11, 0.05)', stroke: '#f59e0b', strokeWidth: 2 },
      },
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX + colWidth * 2, y: startY },
        size: { width: 240, height: 440 },
        content: '✅ DONE',
        style: { fill: 'rgba(16, 185, 129, 0.05)', stroke: '#10b981', strokeWidth: 2 },
      }
    );

    // Sticky Notes
    items.push(
      {
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: startX + 20, y: startY + 70 },
        size: { width: 160, height: 160 },
        content: 'Design UI Layout & Wireframes',
        style: { fill: '#fee2e2' },
      },
      {
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: startX + 20, y: startY + 250 },
        size: { width: 160, height: 160 },
        content: 'Add Keyboard Shortcuts Modal',
        style: { fill: '#fee2e2' },
      },
      {
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: startX + colWidth + 20, y: startY + 70 },
        size: { width: 160, height: 160 },
        content: 'Realtime Yjs Sync Integration',
        style: { fill: '#fef3c7' },
      },
      {
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: startX + colWidth * 2 + 20, y: startY + 70 },
        size: { width: 160, height: 160 },
        content: 'Setup Canvas App Sandbox Environment',
        style: { fill: '#dcfce7' },
      }
    );
  } else if (templateId === 'retrospective') {
    const colWidth = 260;
    const startX = centerX - colWidth * 1.5;
    const startY = centerY - 200;

    items.push(
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX, y: startY },
        size: { width: 240, height: 440 },
        content: '🎉 WHAT WENT WELL',
        style: { fill: 'rgba(16, 185, 129, 0.05)', stroke: '#10b981', strokeWidth: 2 },
      },
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX + colWidth, y: startY },
        size: { width: 240, height: 440 },
        content: '💡 WHAT TO IMPROVE',
        style: { fill: 'rgba(245, 158, 11, 0.05)', stroke: '#f59e0b', strokeWidth: 2 },
      },
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX + colWidth * 2, y: startY },
        size: { width: 240, height: 440 },
        content: '🚀 ACTION ITEMS',
        style: { fill: 'rgba(99, 102, 241, 0.05)', stroke: '#6366f1', strokeWidth: 2 },
      }
    );

    items.push(
      {
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: startX + 20, y: startY + 70 },
        size: { width: 160, height: 160 },
        content: 'Smooth collaborative cursor streaming!',
        style: { fill: '#dcfce7' },
      },
      {
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: startX + colWidth + 20, y: startY + 70 },
        size: { width: 160, height: 160 },
        content: 'Better snapping and alignment tools',
        style: { fill: '#fef3c7' },
      },
      {
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: startX + colWidth * 2 + 20, y: startY + 70 },
        size: { width: 160, height: 160 },
        content: 'Implement JSON board import/export',
        style: { fill: '#dbeafe' },
      }
    );
  } else if (templateId === 'mindmap') {
    const mainX = centerX - 80;
    const mainY = centerY - 40;

    // Center Node
    items.push({
      id: crypto.randomUUID(),
      type: 'rectangle',
      position: { x: mainX, y: mainY },
      size: { width: 160, height: 80 },
      content: 'Core Idea',
      style: { fill: '#6366f1', stroke: '#4338ca', strokeWidth: 2 },
    });

    // Satellites
    const satellites = [
      { text: 'User Experience', x: mainX - 220, y: mainY - 120, fill: '#ec4899' },
      { text: 'Performance', x: mainX + 220, y: mainY - 120, fill: '#3b82f6' },
      { text: 'Realtime Sync', x: mainX - 220, y: mainY + 120, fill: '#10b981' },
      { text: 'Security', x: mainX + 220, y: mainY + 120, fill: '#8b5cf6' },
    ];

    satellites.forEach((sat) => {
      items.push({
        id: crypto.randomUUID(),
        type: 'sticky',
        position: { x: sat.x, y: sat.y },
        size: { width: 140, height: 140 },
        content: sat.text,
        style: { fill: sat.fill },
      });
    });
  } else if (templateId === 'swot') {
    const size = 260;
    const startX = centerX - size - 10;
    const startY = centerY - size - 10;

    items.push(
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX, y: startY },
        size: { width: size, height: size },
        content: '💪 STRENGTHS',
        style: { fill: 'rgba(16, 185, 129, 0.05)', stroke: '#10b981', strokeWidth: 2 },
      },
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX + size + 20, y: startY },
        size: { width: size, height: size },
        content: '⚠️ WEAKNESSES',
        style: { fill: 'rgba(239, 68, 68, 0.05)', stroke: '#ef4444', strokeWidth: 2 },
      },
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX, y: startY + size + 20 },
        size: { width: size, height: size },
        content: '🌟 OPPORTUNITIES',
        style: { fill: 'rgba(245, 158, 11, 0.05)', stroke: '#f59e0b', strokeWidth: 2 },
      },
      {
        id: crypto.randomUUID(),
        type: 'frame',
        position: { x: startX + size + 20, y: startY + size + 20 },
        size: { width: size, height: size },
        content: '🛡️ THREATS',
        style: { fill: 'rgba(99, 102, 241, 0.05)', stroke: '#6366f1', strokeWidth: 2 },
      }
    );
  }

  return items;
}
