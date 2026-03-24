'use client';

import React, { useRef } from 'react';
import styles from './ImageUploader.module.css';
import image1 from '../assets/Images/image1.webp';
import image2 from '../assets/Images/image2.webp';
import image3 from '../assets/Images/image3.webp';
import image4 from '../assets/Images/image4.webp';
import image5 from '../assets/Images/image5.webp';
import image6 from '../assets/Images/image6.webp';
import image7 from '../assets/Images/image7.webp';
import image8 from '../assets/Images/image8.webp';
import image9 from '../assets/Images/image9.webp';

interface ImageUploaderProps {
  onImageUpload: (imageData: string) => void;
  isDark: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  isDark,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const presetImages = [
    image1.src,
    image2.src,
    image3.src,
    image4.src,
    image5.src,
    image6.src,
    image7.src,
    image8.src,
    image9.src,
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target?.result as string;
      const normalizedImage = await trimTransparentMargins(imageData);
      onImageUpload(normalizedImage);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`${styles.imageUploader} ${isDark ? styles.dark : styles.light}`}>
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
            onClick={async () => {
              const normalizedImage = await trimTransparentMargins(preset);
              onImageUpload(normalizedImage);
            }}
            aria-label={`Use preset image ${index + 1}`}
          >
            <img src={preset} alt={`Preset ${index + 1}`} className={styles.tileImage} />
          </button>
        ))}
      </div>
    </div>
  );
};

async function trimTransparentMargins(imageData: string): Promise<string> {
  const image = await loadImage(imageData);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) return imageData;

  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return imageData;
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedContext = croppedCanvas.getContext('2d');
  if (!croppedContext) return imageData;

  croppedContext.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
  return croppedCanvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = src;
  });
}

export default ImageUploader;