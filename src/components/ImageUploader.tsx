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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add(styles.dragover);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove(styles.dragover);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove(styles.dragover);

    const file = e.dataTransfer.files?.[0];
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
      <div
        className={styles.dropZone}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className={styles.fileInput}
        />
        <div className={styles.dropZoneContent}>
          <span className={styles.icon}>📁</span>
          <p>Drag and drop your image here</p>
          <p className={styles.subtext}>or click to browse</p>
        </div>
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

export default ImageUploader;