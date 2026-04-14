import React from 'react';

interface PropertyPanelProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  isVisible: boolean;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ selectedColor, onColorChange, isVisible }) => {
  const colors = [
    '#ffffff', '#f3f4f6', '#e5e7eb', '#9ca3af', '#4b5563', '#1f2937', // Grays
    '#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', // Colors
    '#fee2e2', '#ffedd5', '#fef3c7', '#d1fae5', '#dbeafe', '#e0e7ff', '#ede9fe', '#fce7f3'  // Pastels
  ];

  if (!isVisible) return null;

  return (
    <div className="property-panel">
      <div className="property-section">
        <label>Color</label>
        <div className="color-grid">
          {colors.map((color) => (
            <button
              key={color}
              className={`color-swatch ${selectedColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
