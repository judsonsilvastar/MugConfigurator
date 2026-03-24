import React, { useEffect, useRef } from 'react';
import styles from './MugConfigurator.module.css';

interface MugDesign {
  cupColor: string;
  textContent: string;
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
  uploadedImage: string | null;
  imageScale: number;
  imageRotation: number;
}

interface DesignPreviewProps {
  design: MugDesign;
  onTextChange: (text: string) => void;
}

const DesignPreview: React.FC<DesignPreviewProps> = ({ design, onTextChange }) => {
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!design.hasTextObject || !textRef.current) return;
    if (document.activeElement === textRef.current) return;
    textRef.current.focus();
  }, [design.hasTextObject]);

  return (
    <div className={styles.designCanvas}>
      <canvas id="designCanvas" />
      {design.uploadedImage && (
        <img src={design.uploadedImage} alt="Design element" />
      )}
      {design.hasTextObject && (
        <div
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          className={styles.canvasTextObject}
          onInput={(event) => onTextChange(event.currentTarget.textContent || '')}
          style={{
            color: design.textColor,
            fontSize: `${design.textSize}px`,
            textAlign: design.textAlign,
            fontWeight: design.isBold ? 700 : 400,
            fontStyle: design.isItalic ? 'italic' : 'normal',
            textDecoration: design.isUnderline ? 'underline' : 'none',
            lineHeight: design.lineHeight,
            fontFamily: design.fontFamily,
            backgroundColor: design.textBackgroundColor,
          }}
        >
          {design.textContent || 'Sample Text Object'}
        </div>
      )}
    </div>
  );
};

export default DesignPreview;