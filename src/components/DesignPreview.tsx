import React from 'react';
import styles from './MugConfigurator.module.css';

interface MugDesign {
  cupColor: string;
  textContent: string;
  textColor: string;
  textSize: number;
  uploadedImage: string | null;
  imageScale: number;
  imageRotation: number;
}

interface DesignPreviewProps {
  design: MugDesign;
}

const DesignPreview: React.FC<DesignPreviewProps> = ({ design }) => {
  return (
    <div className={styles.designCanvas}>
      <canvas id="designCanvas" />
      {design.uploadedImage && (
        <img src={design.uploadedImage} alt="Design element" />
      )}
      {design.textContent && (
        <div
          style={{
            color: design.textColor,
            fontSize: `${design.textSize}px`,
          }}
        >
          {design.textContent}
        </div>
      )}
    </div>
  );
};

export default DesignPreview;