'use client';

import React, { useState, useEffect } from 'react';
import Canvas3D from './Canvas3D';
import TextCustomizer from './TextCustomizer';
import ImageUploader from './ImageUploader';
import DesignPreview from './DesignPreview';
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

const MugConfigurator: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [activePanel, setActivePanel] = useState<'menu' | 'text' | 'images'>('menu');
  const [design, setDesign] = useState<MugDesign>({
    cupColor: '#ffffff',
    textContent: '',
    hasTextObject: false,
    textAlign: 'left',
    isBold: false,
    isItalic: false,
    isUnderline: false,
    textColor: '#000000',
    textBackgroundColor: 'transparent',
    textSize: 32,
    lineHeight: 1.2,
    fontFamily: 'Lato, sans-serif',
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

  const handleAddTextObject = () => {
    setDesign((prev) => ({
      ...prev,
      hasTextObject: true,
      textContent: prev.textContent || 'Sample Text Object',
    }));
  };

  const handleDeleteTextObject = () => {
    setDesign((prev) => ({
      ...prev,
      hasTextObject: false,
      textContent: '',
    }));
  };

  const handleTextColorChange = (color: string) => {
    setDesign({ ...design, textColor: color });
  };

  const handleTextSizeChange = (size: number) => {
    setDesign({ ...design, textSize: size });
  };

  const handleTextAlignChange = (align: 'left' | 'center' | 'right') => {
    setDesign({ ...design, textAlign: align });
  };

  const handleTextStyleChange = (style: 'bold' | 'italic' | 'underline') => {
    if (style === 'bold') {
      setDesign({ ...design, isBold: !design.isBold });
      return;
    }
    if (style === 'italic') {
      setDesign({ ...design, isItalic: !design.isItalic });
      return;
    }
    setDesign({ ...design, isUnderline: !design.isUnderline });
  };

  const handleTextBackgroundColorChange = (color: string) => {
    setDesign({ ...design, textBackgroundColor: color });
  };

  const handleLineHeightChange = (value: number) => {
    setDesign({ ...design, lineHeight: value });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    setDesign({ ...design, fontFamily });
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

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : styles.light}`}>
      <header className={styles.header}>
        <h1>Cup Configurator</h1>
        <button className={styles.themeToggle} onClick={toggleTheme}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </header>

      <main className={styles.main}>
        {/* Left: 3D Preview */}
        <section className={styles.leftPanel}>
          <div className={styles.canvas3DWrapper}>
            <Canvas3D design={design} />
          </div>
        </section>

        {/* Right: Design Canvas and Controls */}
        <section className={styles.rightPanel}>
          {/* Top-Right: Design Canvas */}
          <div className={styles.designCanvasWrapper}>
            <DesignPreview
              design={design}
              onTextChange={handleTextChange}
            />
          </div>

          {/* Bottom-Right: Object Adding Panel */}
          <div className={`${styles.objectPanel} ${activePanel === 'menu' ? styles.objectPanelMenu : ''}`}>
            {activePanel === 'menu' ? (
              <>
                <h2>Add Elements</h2>
                <div className={styles.panelButtons}>
                  <button
                    type="button"
                    className={styles.panelButton}
                    onClick={() => setActivePanel('text')}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={styles.panelButton}
                    onClick={() => setActivePanel('images')}
                  >
                    Images
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.panelDetail}>
                <div className={styles.panelDetailHeader}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => setActivePanel('menu')}
                    aria-label="Back to panel selection"
                  >
                    ← Back
                  </button>
                  <h3>{activePanel === 'text' ? 'Text' : 'Images'}</h3>
                </div>
                <div className={styles.panelDetailBody}>
                  {activePanel === 'text' ? (
                    <TextCustomizer
                      text={design.textContent}
                      hasTextObject={design.hasTextObject}
                      textAlign={design.textAlign}
                      isBold={design.isBold}
                      isItalic={design.isItalic}
                      isUnderline={design.isUnderline}
                      textColor={design.textColor}
                      textBackgroundColor={design.textBackgroundColor}
                      textSize={design.textSize}
                      lineHeight={design.lineHeight}
                      fontFamily={design.fontFamily}
                      onAddText={handleAddTextObject}
                      onDeleteText={handleDeleteTextObject}
                      onTextAlignChange={handleTextAlignChange}
                      onTextStyleChange={handleTextStyleChange}
                      onColorChange={handleTextColorChange}
                      onBackgroundColorChange={handleTextBackgroundColorChange}
                      onSizeChange={handleTextSizeChange}
                      onLineHeightChange={handleLineHeightChange}
                      onFontFamilyChange={handleFontFamilyChange}
                    />
                  ) : (
                    <ImageUploader
                      onImageUpload={handleImageUpload}
                      scale={design.imageScale}
                      onScaleChange={handleImageScaleChange}
                      rotation={design.imageRotation}
                      onRotationChange={handleImageRotationChange}
                      hasImage={!!design.uploadedImage}
                    />
                  )}
                </div>
              </div>
            )}
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