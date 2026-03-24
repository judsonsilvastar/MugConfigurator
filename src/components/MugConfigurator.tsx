'use client';

import React, { useState, useEffect } from 'react';
import Canvas3D from './Canvas3D';
import ColorPicker from './ColorPicker';
import TextCustomizer from './TextCustomizer';
import ImageUploader from './ImageUploader';
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

const MugConfigurator: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [design, setDesign] = useState<MugDesign>({
    cupColor: '#ffffff',
    textContent: 'My Mug',
    textColor: '#000000',
    textSize: 32,
    uploadedImage: null,
    imageScale: 1,
    imageRotation: 0,
  });

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  const handleColorChange = (color: string) => {
    setDesign({ ...design, cupColor: color });
  };

  const handleTextChange = (text: string) => {
    setDesign({ ...design, textContent: text });
  };

  const handleTextColorChange = (color: string) => {
    setDesign({ ...design, textColor: color });
  };

  const handleTextSizeChange = (size: number) => {
    setDesign({ ...design, textSize: size });
  };

  const handleImageUpload = (imageData: string) => {
    setDesign({ ...design, uploadedImage: imageData });
  };

  const handleImageScaleChange = (scale: number) => {
    setDesign({ ...design, imageScale: scale });
  };

  const handleImageRotationChange = (rotation: number) => {
    setDesign({ ...design, imageRotation: rotation });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const resetDesign = () => {
    setDesign({
      cupColor: '#ffffff',
      textContent: 'My Mug',
      textColor: '#000000',
      textSize: 32,
      uploadedImage: null,
      imageScale: 1,
      imageRotation: 0,
    });
  };

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : styles.light}`}>
      <header className={styles.header}>
        <h1>Cup Configurator</h1>
        <button className={styles.themeToggle} onClick={toggleTheme}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>

      <main className={styles.main}>
        <section className={styles.previewSection}>
          <div className={styles.canvasWrapper}>
            <Canvas3D design={design} />
          </div>
        </section>

        <section className={styles.controlsSection}>
          <div className={styles.controlsPanel}>
            <h2>Customize Your Cup</h2>

            <div className={styles.controlGroup}>
              <h3>Cup Color</h3>
              <ColorPicker
                color={design.cupColor}
                onChange={handleColorChange}
                label="Select cup color"
              />
            </div>

            <div className={styles.controlGroup}>
              <h3>Text</h3>
              <TextCustomizer
                text={design.textContent}
                textColor={design.textColor}
                textSize={design.textSize}
                onTextChange={handleTextChange}
                onColorChange={handleTextColorChange}
                onSizeChange={handleTextSizeChange}
              />
            </div>

            <div className={styles.controlGroup}>
              <h3>Image</h3>
              <ImageUploader
                onImageUpload={handleImageUpload}
                scale={design.imageScale}
                onScaleChange={handleImageScaleChange}
                rotation={design.imageRotation}
                onRotationChange={handleImageRotationChange}
                hasImage={!!design.uploadedImage}
              />
            </div>

            <button className={styles.resetButton} onClick={resetDesign}>
              Reset Design
            </button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>&copy; 2024 Cup Configurator. Design your perfect cup.</p>
      </footer>
    </div>
  );
};

export default MugConfigurator;