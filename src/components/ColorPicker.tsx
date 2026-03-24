'use client';

import React from 'react';
import styles from './ColorPicker.module.css';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, label }) => {
  const presetColors = [
    '#ffffff',
    '#000000',
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#ffeaa7',
    '#dfe6e9',
    '#74b9ff',
    '#a29bfe',
    '#fd79a8',
    '#fab1a0',
  ];

  return (
    <div className={styles.colorPicker}>
      <div className={styles.inputWrapper}>
        <input
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          title={label}
          className={styles.colorInput}
        />
        <span className={styles.colorValue}>{color}</span>
      </div>
      <div className={styles.presets}>
        {presetColors.map((presetColor) => (
          <button
            key={presetColor}
            className={`${styles.preset} ${color === presetColor ? styles.active : ''}`}
            style={{ backgroundColor: presetColor }}
            onClick={() => onChange(presetColor)}
            title={presetColor}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;
