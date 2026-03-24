'use client';

import React, { useRef } from 'react';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
  onImageUpload: (imageData: string) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
  rotation: number;
  onRotationChange: (rotation: number) => void;
  hasImage: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  scale,
  onScaleChange,
  rotation,
  onRotationChange,
  hasImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetImages = [
    buildCatSvg('#111827', '#f59e0b', '#c4a157'),
    buildCatSvg('#1f2937', '#fbbf24', '#60a5fa'),
    buildCatSvg('#0f172a', '#f8fafc', '#22c55e'),
    buildCatSvg('#1e293b', '#fde68a', '#a78bfa'),
    buildCatSvg('#f8fafc', '#0ea5e9', '#facc15'),
    buildCatSvg('#ffffff', '#22c55e', '#fb7185'),
    buildCatSvg('#f1f5f9', '#16a34a', '#f59e0b'),
    buildCatSvg('#f8fafc', '#16a34a', '#22c55e'),
    buildCatSvg('#f9fafb', '#22c55e', '#38bdf8'),
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      onImageUpload(imageData);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={styles.imageUploader}>
      <div className={styles.galleryGrid}>
        <button
          type="button"
          className={`${styles.tile} ${styles.uploadTile}`}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload your own image"
        >
          <span className={styles.paperclip}>📎</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />

        {presetImages.map((preset, index) => (
          <button
            key={index}
            type="button"
            className={styles.tile}
            onClick={() => onImageUpload(preset)}
            aria-label={`Use preset image ${index + 1}`}
          >
            <img src={preset} alt={`Preset ${index + 1}`} className={styles.tileImage} />
          </button>
        ))}
      </div>

      {hasImage && (
        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label htmlFor="scale-slider">Scale: {(scale * 100).toFixed(0)}%</label>
            <input
              id="scale-slider"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={scale}
              onChange={(e) => onScaleChange(Number(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="rotation-slider">Rotation: {rotation}°</label>
            <input
              id="rotation-slider"
              type="range"
              min="0"
              max="360"
              step="15"
              value={rotation}
              onChange={(e) => onRotationChange(Number(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>
      )}
    </div>
  );
};

function buildCatSvg(
  furColor: string,
  eyeColor: string,
  pendantColor: string,
): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <rect width="300" height="300" fill="#020617"/>
  <circle cx="150" cy="162" r="90" fill="${furColor}"/>
  <polygon points="92,110 122,48 150,110" fill="${furColor}"/>
  <polygon points="208,110 178,48 150,110" fill="${furColor}"/>
  <circle cx="118" cy="165" r="12" fill="${eyeColor}"/>
  <circle cx="182" cy="165" r="12" fill="${eyeColor}"/>
  <circle cx="118" cy="165" r="5" fill="#111827"/>
  <circle cx="182" cy="165" r="5" fill="#111827"/>
  <polygon points="150,180 142,190 158,190" fill="#f8fafc"/>
  <path d="M130 202 Q150 214 170 202" fill="none" stroke="#f8fafc" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="150" cy="238" rx="38" ry="22" fill="none" stroke="#d1d5db" stroke-width="8"/>
  <circle cx="150" cy="250" r="8" fill="${pendantColor}"/>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default ImageUploader;