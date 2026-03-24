export interface RasterCupDesign {
  imageObjects: Array<{
    id: string;
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
  }>;
  hasTextObject: boolean;
  textContent: string;
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
}

function loadImageElement(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (img.complete) {
      resolve();
      return;
    }
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split('\n');
  const lines: string[] = [];

  for (let p = 0; p < paragraphs.length; p += 1) {
    const para = paragraphs[p];
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    else if (paragraphs[p] === '') lines.push('');
    if (p < paragraphs.length - 1 && lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
  }

  return lines.length > 0 ? lines : [''];
}

export async function rasterizeCupDesign(surface: HTMLElement, design: RasterCupDesign): Promise<string> {
  const rect = surface.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas.toDataURL('image/png');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  for (const imageObject of design.imageObjects) {
    const wrap = surface.querySelector(`[data-image-id="${imageObject.id}"]`) as HTMLElement | null;
    if (!wrap) continue;
    const img = wrap.querySelector('img') as HTMLImageElement | null;
    if (!img) continue;
    await loadImageElement(img);

    const cx = (imageObject.x / 100) * w;
    const cy = (imageObject.y / 100) * h;
    const bw = Math.max(1, wrap.offsetWidth);
    const bh = Math.max(1, wrap.offsetHeight);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((imageObject.rotation * Math.PI) / 180);
    ctx.scale(imageObject.scaleX, imageObject.scaleY);
    ctx.drawImage(img, -bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }

  if (design.hasTextObject) {
    const textRoot = surface.querySelector('[data-cup-design-text]') as HTMLElement | null;
    if (textRoot) {
      const cx = (design.textPosX / 100) * w;
      const cy = (design.textPosY / 100) * h;
      const padX = 10;
      const padY = 8;
      const raw = (design.textContent || '').trim();
      const content = raw || 'Sample Text Object';

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((design.textRotation * Math.PI) / 180);
      ctx.scale(design.textScaleX, design.textScaleY);

      const innerW = Math.max(1, textRoot.offsetWidth - padX * 2);
      const fontStyle = `${design.isItalic ? 'italic ' : ''}${design.isBold ? 'bold ' : ''}${design.textSize}px ${design.fontFamily}`;
      ctx.font = fontStyle;
      ctx.textBaseline = 'top';

      const lines = wrapCanvasText(ctx, content, innerW);
      const lh = design.textSize * design.lineHeight;
      let maxLineW = 0;
      for (const line of lines) {
        if (line === '') continue;
        maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
      }
      const blockW = Math.min(textRoot.offsetWidth, maxLineW + padX * 2);
      const blockH = Math.max(textRoot.offsetHeight, lines.filter((l) => l !== '').length * lh + padY * 2);

      if (design.textBackgroundColor && design.textBackgroundColor !== 'transparent') {
        ctx.fillStyle = design.textBackgroundColor;
        ctx.fillRect(-blockW / 2, -blockH / 2, blockW, blockH);
      }

      ctx.fillStyle = design.textColor;
      let startY = -blockH / 2 + padY;
      const underlineY = (line: string, lineX: number) => {
        if (!design.isUnderline || !line) return;
        const tw = ctx.measureText(line).width;
        ctx.beginPath();
        ctx.strokeStyle = design.textColor;
        ctx.lineWidth = Math.max(1, design.textSize / 12);
        const uy = startY + design.textSize * 0.95;
        ctx.moveTo(lineX, uy);
        ctx.lineTo(lineX + tw, uy);
        ctx.stroke();
      };

      for (const line of lines) {
        if (line === '') {
          startY += lh * 0.35;
          continue;
        }
        let lineX = 0;
        const measured = ctx.measureText(line).width;
        if (design.textAlign === 'left') {
          lineX = -blockW / 2 + padX;
        } else if (design.textAlign === 'right') {
          lineX = blockW / 2 - padX - measured;
        } else {
          lineX = -measured / 2;
        }
        ctx.fillText(line, lineX, startY);
        underlineY(line, lineX);
        startY += lh;
      }

      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}
