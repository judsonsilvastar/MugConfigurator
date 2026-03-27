import React, { useEffect, useRef, useState } from 'react';
import { isCupDesignSurfaceEmpty, rasterizeCupDesign } from '@/lib/rasterizeCupDesign';
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

interface DesignPreviewProps {
  design: MugDesign;
  onTextChange: (text: string) => void;
  onTextTransformChange: (transform: { x?: number; y?: number; scaleX?: number; scaleY?: number; rotation?: number }) => void;
  onImageTransformChange: (transform: { id: string; x?: number; y?: number; scaleX?: number; scaleY?: number; rotation?: number }) => void;
  onClearAllObjects: () => void;
  onRemoveImageObject: (id: string) => void;
  onMoveImageObject: (id: string, direction: 'up' | 'down') => void;
  onDesignTextureChange?: (dataUrl: string | null) => void;
}

type ObjectKey = 'text' | 'image';
type TransformMode = 'move' | 'resize' | 'rotate';
type ResizeHandle =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

const DesignPreview: React.FC<DesignPreviewProps> = ({
  design,
  onTextChange,
  onTextTransformChange,
  onImageTransformChange,
  onClearAllObjects,
  onRemoveImageObject,
  onMoveImageObject,
  onDesignTextureChange,
}) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<{
    active: boolean;
    object: ObjectKey;
    mode: TransformMode;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
    startScaleX: number;
    startScaleY: number;
    startRotation: number;
    centerX: number;
    centerY: number;
    startAngle: number;
    baseWidth: number;
    baseHeight: number;
    imageId?: string;
    handle?: ResizeHandle;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedObject, setSelectedObject] = useState<{ type: ObjectKey; id?: string } | null>(null);
  const [showActions, setShowActions] = useState(true);
  const textHandleStyle = {
    '--inv-scale-x': `${1 / Math.max(design.textScaleX, 0.001)}`,
    '--inv-scale-y': `${1 / Math.max(design.textScaleY, 0.001)}`,
  } as React.CSSProperties;

  useEffect(() => {
    if (!design.hasTextObject || !textRef.current) return;
    const nextText = design.textContent || 'Sample Text Object';
    if (!isEditing && textRef.current.textContent !== nextText) {
      textRef.current.textContent = nextText;
    }
  }, [design.hasTextObject, design.textContent, isEditing]);

  useEffect(() => {
    if (!design.hasTextObject || !textRef.current) return;
    if (document.activeElement === textRef.current) return;
    textRef.current.focus();
  }, [design.hasTextObject]);

  const rotatePoint = (x: number, y: number, degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  };

  const unrotatePoint = (x: number, y: number, degrees: number) => {
    return rotatePoint(x, y, -degrees);
  };

  const startTransform = (
    event: React.MouseEvent,
    object: ObjectKey,
    mode: TransformMode,
    options?: { handle?: ResizeHandle; imageId?: string; element?: HTMLElement | null }
  ) => {
    if (!surfaceRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    setIsEditing(false);
    const rect = surfaceRef.current.getBoundingClientRect();
    const imageObject =
      object === 'image' ? design.imageObjects.find((entry) => entry.id === options?.imageId) : null;
    if (object === 'image' && !imageObject) return;
    const startX = object === 'text' ? design.textPosX : (imageObject?.x ?? 50);
    const startY = object === 'text' ? design.textPosY : (imageObject?.y ?? 50);
    const startScaleX = object === 'text' ? design.textScaleX : (imageObject?.scaleX ?? 1);
    const startScaleY = object === 'text' ? design.textScaleY : (imageObject?.scaleY ?? 1);
    const startRotation = object === 'text' ? design.textRotation : (imageObject?.rotation ?? 0);
    const element = object === 'text' ? (textRef.current?.parentElement as HTMLElement | null) : options?.element ?? null;
    const baseWidth = Math.max(20, element?.offsetWidth ?? 180);
    const baseHeight = Math.max(20, element?.offsetHeight ?? 80);
    const centerX = rect.left + (startX / 100) * rect.width;
    const centerY = rect.top + (startY / 100) * rect.height;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    interactionRef.current = {
      active: true,
      object,
      mode,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startX,
      startY,
      startScaleX,
      startScaleY,
      startRotation,
      centerX,
      centerY,
      startAngle: Math.atan2(dy, dx),
      baseWidth,
      baseHeight,
      imageId: options?.imageId,
      handle: options?.handle,
    };
    setSelectedObject(object === 'image' ? { type: 'image', id: options?.imageId } : { type: 'text' });
  };

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!interactionRef.current || !interactionRef.current.active || !surfaceRef.current) return;

      const current = interactionRef.current;
      const rect = surfaceRef.current.getBoundingClientRect();
      const applyTextTransform = onTextTransformChange;

      if (current.mode === 'move') {
        const deltaX = event.clientX - current.startMouseX;
        const deltaY = event.clientY - current.startMouseY;
        const nextX = current.startX + (deltaX / rect.width) * 100;
        const nextY = current.startY + (deltaY / rect.height) * 100;
        if (current.object === 'text') {
          applyTextTransform({
            x: Math.max(5, Math.min(95, nextX)),
            y: Math.max(8, Math.min(92, nextY)),
          });
        } else if (current.imageId) {
          onImageTransformChange({
            id: current.imageId,
            x: Math.max(5, Math.min(95, nextX)),
            y: Math.max(8, Math.min(92, nextY)),
          });
        }
        return;
      }

      if (current.mode === 'resize') {
        const pointerDx = event.clientX - current.centerX;
        const pointerDy = event.clientY - current.centerY;
        const pointerLocal = unrotatePoint(pointerDx, pointerDy, current.startRotation);

        const halfW0 = (current.baseWidth * current.startScaleX) / 2;
        const halfH0 = (current.baseHeight * current.startScaleY) / 2;
        const handle = current.handle ?? 'bottom-right';

        let edgeX: number | null = null;
        let edgeY: number | null = null;
        let anchorX = 0;
        let anchorY = 0;

        if (handle.includes('left')) {
          edgeX = pointerLocal.x;
          anchorX = halfW0;
        } else if (handle.includes('right')) {
          edgeX = pointerLocal.x;
          anchorX = -halfW0;
        }

        if (handle.includes('top')) {
          edgeY = pointerLocal.y;
          anchorY = halfH0;
        } else if (handle.includes('bottom')) {
          edgeY = pointerLocal.y;
          anchorY = -halfH0;
        }

        let newHalfW = halfW0;
        let newHalfH = halfH0;
        let centerLocalX = 0;
        let centerLocalY = 0;
        const hasHorizontalHandle = edgeX !== null;
        const hasVerticalHandle = edgeY !== null;
        const isCornerHandle = hasHorizontalHandle && hasVerticalHandle;
        const horizontalSign = handle.includes('right') ? 1 : handle.includes('left') ? -1 : 0;
        const verticalSign = handle.includes('bottom') ? 1 : handle.includes('top') ? -1 : 0;

        if (edgeX !== null) {
          newHalfW = Math.max(10, Math.abs(anchorX - edgeX) / 2);
          centerLocalX = (edgeX + anchorX) / 2;
        }

        if (edgeY !== null) {
          newHalfH = Math.max(10, Math.abs(anchorY - edgeY) / 2);
          centerLocalY = (edgeY + anchorY) / 2;
        }

        // Corner drag keeps aspect ratio; edge-middle handles stay single-axis.
        if (isCornerHandle) {
          const ratioX = newHalfW / Math.max(halfW0, 1);
          const ratioY = newHalfH / Math.max(halfH0, 1);
          const uniformRatio = Math.max(ratioX, ratioY);
          newHalfW = Math.max(10, halfW0 * uniformRatio);
          newHalfH = Math.max(10, halfH0 * uniformRatio);
          centerLocalX = horizontalSign * (newHalfW - halfW0);
          centerLocalY = verticalSign * (newHalfH - halfH0);
        }

        const scaleX = Math.max(0.2, Math.min(8, newHalfW / (current.baseWidth / 2)));
        const scaleY = Math.max(0.2, Math.min(8, newHalfH / (current.baseHeight / 2)));

        const centerShiftGlobal = rotatePoint(centerLocalX, centerLocalY, current.startRotation);
        const nextX = current.startX + (centerShiftGlobal.x / rect.width) * 100;
        const nextY = current.startY + (centerShiftGlobal.y / rect.height) * 100;

        if (current.object === 'text') {
          applyTextTransform({
            x: Math.max(5, Math.min(95, nextX)),
            y: Math.max(8, Math.min(92, nextY)),
            scaleX,
            scaleY,
          });
        } else if (current.imageId) {
          onImageTransformChange({
            id: current.imageId,
            x: Math.max(5, Math.min(95, nextX)),
            y: Math.max(8, Math.min(92, nextY)),
            scaleX,
            scaleY,
          });
        }
        return;
      }

      const angle = Math.atan2(event.clientY - current.centerY, event.clientX - current.centerX);
      const deltaDegrees = (angle - current.startAngle) * (180 / Math.PI);
      if (current.object === 'text') {
        applyTextTransform({ rotation: current.startRotation + deltaDegrees });
      } else if (current.imageId) {
        onImageTransformChange({ id: current.imageId, rotation: current.startRotation + deltaDegrees });
      }
    };

    const onMouseUp = () => {
      if (interactionRef.current) {
        interactionRef.current.active = false;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onImageTransformChange, onTextTransformChange]);

  useEffect(() => {
    if (!onDesignTextureChange || !surfaceRef.current) return;
    const surface = surfaceRef.current;
    const t = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isCupDesignSurfaceEmpty(design)) {
            onDesignTextureChange(null);
            return;
          }
          void rasterizeCupDesign(surface, design).then(onDesignTextureChange);
        });
      });
    }, 90);
    return () => clearTimeout(t);
  }, [design, onDesignTextureChange]);

  const handleRemoveSelected = () => {
    if (selectedObject?.type === 'image' && selectedObject.id) {
      onRemoveImageObject(selectedObject.id);
      setSelectedObject(null);
    }
  };

  const handleMoveSelected = (direction: 'up' | 'down') => {
    if (selectedObject?.type === 'image' && selectedObject.id) {
      onMoveImageObject(selectedObject.id, direction);
    }
  };

  const saveCanvasAsImage = async () => {
    if (!surfaceRef.current) return;
    const dataUrl = await rasterizeCupDesign(surfaceRef.current, design);
    const download = document.createElement('a');
    download.href = dataUrl;
    download.download = `cup-canvas-${Date.now()}.png`;
    download.click();
  };

  return (
    <div className={styles.designCanvas}>
      <div
        className={styles.canvasActions}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.canvasActionButton}
          data-tooltip={showActions ? 'Hide actions' : 'Show actions'}
          onClick={(event) => {
            event.stopPropagation();
            setShowActions((prev) => !prev);
          }}
          aria-label={showActions ? 'Hide actions' : 'Show actions'}
        >
          ◉
        </button>
        {showActions && (
          <>
            <button
              type="button"
              className={styles.canvasActionButton}
              data-tooltip="Remove all objects"
              onClick={(event) => {
                event.stopPropagation();
                onClearAllObjects();
                setSelectedObject(null);
              }}
              aria-label="Remove all objects"
            >
              ✕
            </button>
            <button
              type="button"
              className={styles.canvasActionButton}
              data-tooltip="Remove selected object"
              onClick={(event) => {
                event.stopPropagation();
                handleRemoveSelected();
              }}
              aria-label="Remove selected object"
              disabled={!(selectedObject?.type === 'image' && selectedObject.id)}
            >
              ⊠
            </button>
            <button
              type="button"
              className={styles.canvasActionButton}
              data-tooltip="Move selected down"
              onClick={(event) => {
                event.stopPropagation();
                handleMoveSelected('down');
              }}
              aria-label="Move selected down"
              disabled={!(selectedObject?.type === 'image' && selectedObject.id)}
            >
              ↓
            </button>
            <button
              type="button"
              className={styles.canvasActionButton}
              data-tooltip="Move selected up"
              onClick={(event) => {
                event.stopPropagation();
                handleMoveSelected('up');
              }}
              aria-label="Move selected up"
              disabled={!(selectedObject?.type === 'image' && selectedObject.id)}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.canvasActionButton}
              data-tooltip="Save canvas as image"
              onClick={(event) => {
                event.stopPropagation();
                saveCanvasAsImage();
              }}
              aria-label="Save canvas as image"
            >
              ⭳
            </button>
          </>
        )}
      </div>
      <div
        ref={surfaceRef}
        className={styles.designCanvasSurface}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedObject(null);
          }
        }}
      >
      <canvas id="designCanvas" />
      {design.imageObjects.map((imageObject) => {
        const imageHandleStyle = {
          '--inv-scale-x': `${1 / Math.max(imageObject.scaleX, 0.001)}`,
          '--inv-scale-y': `${1 / Math.max(imageObject.scaleY, 0.001)}`,
        } as React.CSSProperties;
        const isSelected = selectedObject?.type === 'image' && selectedObject.id === imageObject.id;
        return (
          <div
            key={imageObject.id}
            data-image-id={imageObject.id}
            className={`${styles.canvasObject} ${styles.canvasImageWrapper} ${isSelected ? styles.canvasObjectSelected : ''}`}
            style={{
              left: `${imageObject.x}%`,
              top: `${imageObject.y}%`,
              transform: `translate(-50%, -50%) rotate(${imageObject.rotation}deg) scale(${imageObject.scaleX}, ${imageObject.scaleY})`,
            }}
            onMouseDown={(event) => {
              const currentElement = event.currentTarget as HTMLElement;
              setSelectedObject({ type: 'image', id: imageObject.id });
              startTransform(event, 'image', 'move', { imageId: imageObject.id, element: currentElement });
            }}
          >
            {isSelected && (
            <>
              <button className={styles.rotateHandle} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'rotate', { imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Rotate image" />
              <button className={`${styles.resizeHandle} ${styles.resizeTopLeft}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'top-left', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
              <button className={`${styles.resizeHandle} ${styles.resizeTopCenter}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'top-center', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
              <button className={`${styles.resizeHandle} ${styles.resizeTopRight}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'top-right', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
              <button className={`${styles.resizeHandle} ${styles.resizeMiddleLeft}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'middle-left', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
              <button className={`${styles.resizeHandle} ${styles.resizeMiddleRight}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'middle-right', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
              <button className={`${styles.resizeHandle} ${styles.resizeBottomLeft}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'bottom-left', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
              <button className={`${styles.resizeHandle} ${styles.resizeBottomCenter}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'bottom-center', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
              <button className={`${styles.resizeHandle} ${styles.resizeBottomRight}`} style={imageHandleStyle} onMouseDown={(event) => startTransform(event, 'image', 'resize', { handle: 'bottom-right', imageId: imageObject.id, element: event.currentTarget.parentElement as HTMLElement | null })} aria-label="Resize image" />
            </>
            )}
            <img src={imageObject.src} alt="Design element" className={styles.canvasImageObject} />
          </div>
        );
      })}
      {design.hasTextObject && (
        <div
          data-cup-design-text
          className={`${styles.canvasObject} ${styles.canvasTextObject} ${selectedObject?.type === 'text' ? styles.canvasObjectSelected : ''}`}
          style={{
            left: `${design.textPosX}%`,
            top: `${design.textPosY}%`,
            transform: `translate(-50%, -50%) rotate(${design.textRotation}deg) scale(${design.textScaleX}, ${design.textScaleY})`,
          }}
          onMouseDown={(event) => {
            setSelectedObject({ type: 'text' });
            startTransform(event, 'text', 'move');
          }}
        >
          {selectedObject?.type === 'text' && (
            <>
              <button className={styles.rotateHandle} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'rotate')} aria-label="Rotate text" />
              <button className={`${styles.resizeHandle} ${styles.resizeTopLeft}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'top-left' })} aria-label="Resize text" />
              <button className={`${styles.resizeHandle} ${styles.resizeTopCenter}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'top-center' })} aria-label="Resize text" />
              <button className={`${styles.resizeHandle} ${styles.resizeTopRight}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'top-right' })} aria-label="Resize text" />
              <button className={`${styles.resizeHandle} ${styles.resizeMiddleLeft}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'middle-left' })} aria-label="Resize text" />
              <button className={`${styles.resizeHandle} ${styles.resizeMiddleRight}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'middle-right' })} aria-label="Resize text" />
              <button className={`${styles.resizeHandle} ${styles.resizeBottomLeft}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'bottom-left' })} aria-label="Resize text" />
              <button className={`${styles.resizeHandle} ${styles.resizeBottomCenter}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'bottom-center' })} aria-label="Resize text" />
              <button className={`${styles.resizeHandle} ${styles.resizeBottomRight}`} style={textHandleStyle} onMouseDown={(event) => startTransform(event, 'text', 'resize', { handle: 'bottom-right' })} aria-label="Resize text" />
            </>
          )}
          <div
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            className={styles.canvasTextEditable}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            onMouseDown={(event) => {
              setSelectedObject({ type: 'text' });
              event.stopPropagation();
            }}
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
          />
        </div>
      )}
      </div>
    </div>
  );
};

export default DesignPreview;