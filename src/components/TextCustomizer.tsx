'use client';

import React from 'react';
import styles from './TextCustomizer.module.css';

interface TextCustomizerProps {
  text: string;
  hasTextObject: boolean;
  textAlign: 'left' | 'center' | 'right';
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  textColor: string;
  textBackgroundColor: string;
  textSize: number;
  lineHeight: number;
  fontFamily: string;
  onAddText: () => void;
  onDeleteText: () => void;
  onTextAlignChange: (align: 'left' | 'center' | 'right') => void;
  onTextStyleChange: (style: 'bold' | 'italic' | 'underline') => void;
  onColorChange: (color: string) => void;
  onBackgroundColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onLineHeightChange: (value: number) => void;
  onFontFamilyChange: (fontFamily: string) => void;
}

const TextCustomizer: React.FC<TextCustomizerProps> = ({
  hasTextObject,
  textAlign,
  isBold,
  isItalic,
  isUnderline,
  textColor,
  textBackgroundColor,
  textSize,
  lineHeight,
  fontFamily,
  onAddText,
  onDeleteText,
  onTextAlignChange,
  onTextStyleChange,
  onColorChange,
  onBackgroundColorChange,
  onSizeChange,
  onLineHeightChange,
  onFontFamilyChange,
}) => {
  const textColorPresets = ['#bfc3c8', '#ff0000', '#e3875b', '#f5e65a', '#07d37a', '#2c89da', '#8d45b9', '#111111'];
  const backgroundPresets = ['transparent', '#2ec4b6', '#26a69a', '#35c56f', '#2ab060', '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#425d7e', '#27384d', '#f1c40f', '#f39c12', '#e74c3c'];
  const fontOptions = ['Lato, sans-serif', 'Arial, sans-serif', '"Times New Roman", serif', '"Courier New", monospace', 'Georgia, serif', 'Verdana, sans-serif'];

  const [textColorHex, setTextColorHex] = React.useState(textColor);
  const [backgroundHex, setBackgroundHex] = React.useState(textBackgroundColor === 'transparent' ? '#000000' : textBackgroundColor);

  React.useEffect(() => {
    setTextColorHex(textColor);
  }, [textColor]);

  React.useEffect(() => {
    if (textBackgroundColor !== 'transparent') {
      setBackgroundHex(textBackgroundColor);
    }
  }, [textBackgroundColor]);

  return (
    <div className={styles.textCustomizer}>
      <div className={styles.layoutGrid}>
        <div className={styles.leftColumn}>
          <div className={styles.actionsRow}>
            <button type="button" className={styles.actionButton} onClick={onAddText}>
              Add Text
            </button>
            <button type="button" className={styles.actionButton} onClick={onDeleteText}>
              Delete Selected
            </button>
          </div>

          <div className={styles.inputGroup}>
            <label>Text Align & Style</label>
            <div className={styles.inlineControls}>
              <button type="button" className={`${styles.iconButton} ${textAlign === 'left' ? styles.iconButtonActive : ''}`} onClick={() => onTextAlignChange('left')}>≡</button>
              <button type="button" className={`${styles.iconButton} ${textAlign === 'center' ? styles.iconButtonActive : ''}`} onClick={() => onTextAlignChange('center')}>≣</button>
              <button type="button" className={`${styles.iconButton} ${textAlign === 'right' ? styles.iconButtonActive : ''}`} onClick={() => onTextAlignChange('right')}>☰</button>
              <button type="button" className={`${styles.iconButton} ${isBold ? styles.iconButtonActive : ''}`} onClick={() => onTextStyleChange('bold')}>B</button>
              <button type="button" className={`${styles.iconButton} ${isItalic ? styles.iconButtonActive : ''}`} onClick={() => onTextStyleChange('italic')}><em>I</em></button>
              <button type="button" className={`${styles.iconButton} ${isUnderline ? styles.iconButtonActive : ''}`} onClick={() => onTextStyleChange('underline')}><u>U</u></button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="size-slider">Font Size</label>
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

          <div className={styles.inputGroup}>
            <label htmlFor="line-height-slider">Line Height</label>
            <input
              id="line-height-slider"
              type="range"
              min="0.8"
              max="2"
              step="0.1"
              value={lineHeight}
              onChange={(e) => onLineHeightChange(Number(e.target.value))}
              className={styles.sizeSlider}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="font-family">Font Family</label>
            <select
              id="font-family"
              value={fontFamily}
              onChange={(e) => onFontFamilyChange(e.target.value)}
              className={styles.select}
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font.split(',')[0].replace(/"/g, '')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.inputGroup}>
            <label>Text Color</label>
            <div className={styles.colorSwatches}>
              {textColorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorSwatch} ${textColor.toLowerCase() === color.toLowerCase() ? styles.colorSwatchActive : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorChange(color)}
                  aria-label={`Set text color to ${color}`}
                >
                  {textColor.toLowerCase() === color.toLowerCase() ? '✓' : ''}
                </button>
              ))}
            </div>
            <div className={styles.hexRow}>
              <input value={textColorHex} onChange={(e) => setTextColorHex(e.target.value)} className={styles.textInput} placeholder="HEX string e.g. #ffffff" />
              <button
                type="button"
                className={styles.applyButton}
                onClick={() => onColorChange(textColorHex)}
              >
                Apply
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Background Fill</label>
            <div className={styles.colorSwatches}>
              {backgroundPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`${styles.colorSwatch} ${textBackgroundColor.toLowerCase() === color.toLowerCase() ? styles.colorSwatchActive : ''}`}
                  style={{ backgroundColor: color === 'transparent' ? '#000000' : color }}
                  onClick={() => onBackgroundColorChange(color)}
                  aria-label={`Set background color to ${color}`}
                >
                  {textBackgroundColor.toLowerCase() === color.toLowerCase() ? '✓' : ''}
                </button>
              ))}
            </div>
            <div className={styles.hexRow}>
              <input value={backgroundHex} onChange={(e) => setBackgroundHex(e.target.value)} className={styles.textInput} placeholder="HEX string e.g. #ffffff" />
              <button
                type="button"
                className={styles.applyButton}
                onClick={() => onBackgroundColorChange(backgroundHex)}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {!hasTextObject && <p className={styles.helperText}>Click Add Text to create a text object on the canvas.</p>}
    </div>
  );
};

export default TextCustomizer;
