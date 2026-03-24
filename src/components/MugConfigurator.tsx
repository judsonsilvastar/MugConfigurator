'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Canvas3D from './Canvas3D';
import ImageUploader from './ImageUploader';
import DesignPreview from './DesignPreview';
import styles from './MugConfigurator.module.css';

interface MugDesign {
  cupColor: string;
  textContent: string;
  hasTextObject: boolean;
  textPosX: number;
  textPosY: number;
  textScaleX: number;
  textScaleY: number;
  textRotation: number;
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
  imageObjects: Array<{
    id: string;
    src: string;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }>;
}

const MugConfigurator: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [cupDesignTextureUrl, setCupDesignTextureUrl] = useState<string | null>(null);
  const [design, setDesign] = useState<MugDesign>({
    cupColor: '#ffffff',
    textContent: '',
    hasTextObject: false,
    textPosX: 50,
    textPosY: 50,
    textScaleX: 1,
    textScaleY: 1,
    textRotation: 0,
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
    imageObjects: [],
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

  const handleImageUpload = (imageData: string) => {
    setDesign((prev) => ({
      ...prev,
      uploadedImage: imageData,
      imageObjects: [
        ...prev.imageObjects,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          src: imageData,
          x: 50,
          y: 50,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
      ],
    }));
  };

  const handleImageTransformChange = (transform: {
    id: string;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
  }) => {
    setDesign((prev) => ({
      ...prev,
      imageObjects: prev.imageObjects.map((imageObject) =>
        imageObject.id === transform.id
          ? {
              ...imageObject,
              x: transform.x ?? imageObject.x,
              y: transform.y ?? imageObject.y,
              scaleX: transform.scaleX ?? imageObject.scaleX,
              scaleY: transform.scaleY ?? imageObject.scaleY,
              rotation: transform.rotation ?? imageObject.rotation,
            }
          : imageObject
      ),
      imageScale:
        transform.id === prev.imageObjects[prev.imageObjects.length - 1]?.id
          ? ((transform.scaleX ?? prev.imageObjects[prev.imageObjects.length - 1]?.scaleX ?? 1) +
              (transform.scaleY ?? prev.imageObjects[prev.imageObjects.length - 1]?.scaleY ?? 1)) /
            2
          : prev.imageScale,
      imageRotation:
        transform.id === prev.imageObjects[prev.imageObjects.length - 1]?.id
          ? (transform.rotation ?? prev.imageRotation)
          : prev.imageRotation,
    }));
  };

  const handleClearAllObjects = () => {
    setDesign((prev) => ({
      ...prev,
      imageObjects: [],
      uploadedImage: null,
    }));
  };

  const handleRemoveImageObject = (id: string) => {
    setDesign((prev) => {
      const nextObjects = prev.imageObjects.filter((imageObject) => imageObject.id !== id);
      return {
        ...prev,
        imageObjects: nextObjects,
        uploadedImage: nextObjects.length > 0 ? nextObjects[nextObjects.length - 1].src : null,
      };
    });
  };

  const handleMoveImageObject = (id: string, direction: 'up' | 'down') => {
    setDesign((prev) => {
      const currentIndex = prev.imageObjects.findIndex((imageObject) => imageObject.id === id);
      if (currentIndex < 0) return prev;

      const targetIndex = direction === 'up' ? currentIndex + 1 : currentIndex - 1;
      if (targetIndex < 0 || targetIndex >= prev.imageObjects.length) return prev;

      const nextObjects = [...prev.imageObjects];
      const [selected] = nextObjects.splice(currentIndex, 1);
      nextObjects.splice(targetIndex, 0, selected);
      return {
        ...prev,
        imageObjects: nextObjects,
      };
    });
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleDesignTextureChange = useCallback((dataUrl: string) => {
    setCupDesignTextureUrl(dataUrl);
  }, []);

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : styles.light}`}>
      <header className={styles.header}>
        <h1>☕ Cup Configurator</h1>
        <div className={styles.headerActions}>
          <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? '☀' : '◔'}
          </button>
          <button className={styles.iconButton} type="button" aria-label="Display mode">
            ⌗
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.leftPanel}>
          <div className={styles.canvas3DWrapper}>
            <Canvas3D design={design} designTextureUrl={cupDesignTextureUrl} />
          </div>
        </section>

        <button
          type="button"
          className={`${styles.sidebarToggle} ${isSidebarOpen ? styles.sidebarToggleOpen : styles.sidebarToggleClosed}`}
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-label={isSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          <span className={styles.sidebarToggleDots} aria-hidden="true">⋮⋮</span>
        </button>

        <section className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
          <div className={styles.designCanvasWrapper}>
            <DesignPreview
              {...({
                design,
                onTextChange: handleTextChange,
                onTextTransformChange: () => {},
                onImageTransformChange: handleImageTransformChange,
                onClearAllObjects: handleClearAllObjects,
                onRemoveImageObject: handleRemoveImageObject,
                onMoveImageObject: handleMoveImageObject,
                onDesignTextureChange: handleDesignTextureChange,
              } as any)}
            />
          </div>
          <div className={styles.objectPanel}>
            <div className={styles.objectPanelContent}>
              <ImageUploader onImageUpload={handleImageUpload} isDark={isDark} />
            </div>
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