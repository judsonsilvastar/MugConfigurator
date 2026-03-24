'use client';

import React from 'react';
import styles from './TextCustomizer.module.css';
import ColorPicker from './ColorPicker';

interface TextCustomizerProps {
  text: string;
  textColor: string;
  textSize: number;
  onTextChange: (text: string) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
}

const TextCustomizer: React.FC<TextCustomizerProps> = ({
  text,
  textColor,
  textSize,
  onTextChange,
  onColorChange,
  onSizeChange,
}) => {
  return (
    <div className={styles.textCustomizer}>
      <div className={styles.inputGroup}>
        <label htmlFor="text-input">Text Content</label>
        <input
          id="text-input"
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          maxLength={50}
          placeholder="Enter your text"
          className={styles.textInput}
        />
        <span className={styles.charCount}>{text.length}/50</span>
      </div>

      <div className={styles.inputGroup}>
        <label>Text Color</label>
        <ColorPicker color={textColor} onChange={onColorChange} label="Select text color" />
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="size-slider">Text Size: {textSize}px</label>
        <input
          id="size-slider"
          type="range"
          min="12"
          max="72"
          value={textSize}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className={styles.sizeSlider}
        />
      </div>

      <div className={styles.preview}>
        <p style={{ color: textColor, fontSize: `${textSize}px` }}>{text}</p>
      </div>
    </div>
  );
};

export default TextCustomizer;
