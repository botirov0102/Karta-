/**
 * CARD RENDERER UTILS
 * Handles canvas drawing for high-resolution card exports and premium previews.
 */
import { CardState, BackState, SUITS_INFO, RANKS_INFO } from './types';

const imageCache = new Map<string, HTMLImageElement>();

/**
 * Loads an image from a URL or base64 and caches it.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Enable CORS requests for remote web images to prevent canvas tainted exceptions
    if (src && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onerror = () => {
      reject(new Error(`Rasm yuklashda xatolik yuz berdi`));
    };
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.src = src;
  });
}

/**
 * Draws a rounded rectangle helper.
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draw decorative geometric patterns on card backs.
 */
function drawPatternBack(ctx: CanvasRenderingContext2D, w: number, h: number) {
  // Deep royal velvet background
  ctx.fillStyle = '#1e293b'; // slate-800
  ctx.fillRect(0, 0, w, h);

  // Decorative border
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#e2e8f0'; // slate-200
  drawRoundedRect(ctx, 16, 16, w - 32, h - 32, 28);
  ctx.stroke();

  // Thin inner gold border
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f59e0b'; // amber-500
  drawRoundedRect(ctx, 32, 32, w - 64, h - 64, 20);
  ctx.stroke();

  // Geometric grid pattern
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)'; // faint amber

  const cols = 12;
  const rows = 18;
  const spacingX = w / cols;
  const spacingY = h / rows;

  // Diamond grill pattern
  for (let i = -cols; i <= cols; i++) {
    ctx.beginPath();
    ctx.moveTo(i * spacingX - w, -h);
    ctx.lineTo(i * spacingX + w, h);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(i * spacingX + w, -h);
    ctx.lineTo(i * spacingX - w, h);
    ctx.stroke();
  }
  ctx.restore();

  // Central ornate mandala
  ctx.save();
  ctx.translate(w / 2, h / 2);
  
  // Outer circle-burst
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 75, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 16; i++) {
    ctx.rotate(Math.PI / 8);
    ctx.beginPath();
    ctx.moveTo(0, -75);
    ctx.lineTo(0, -90);
    ctx.stroke();
  }

  // Inner diamond star
  ctx.fillStyle = '#f59e0b';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(15, 0);
    ctx.lineTo(0, 60);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Centered circular crest
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();

  // Center star
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  for (let j = 0; j < 8; j++) {
    ctx.rotate(Math.PI / 4);
    ctx.lineTo(0, -28);
    ctx.lineTo(7, -10);
  }
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the front-side default placeholder image.
 */
function drawFrontPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number, suit: string, suitHexColor: string) {
  // Soft, smooth gray-beige gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#fcfcfd');
  grad.addColorStop(1, '#f3f4f6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Light watermark grids
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.02)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 40; x < w; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 40; y < h; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Central giant, elegant watermarked symbol
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.fillStyle = suitHexColor;
  ctx.globalAlpha = 0.08; // Very subtle watermark
  ctx.font = '330px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(suit, 0, 0);
  ctx.restore();

  // Elegant inner borders
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  drawRoundedRect(ctx, 45, 45, w - 90, h - 90, 16);
  ctx.stroke();

  // Subtle crosshair in the middle to make it look like a customized frame
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Horizontal ticks
  ctx.moveTo(w / 2 - 30, h / 2);
  ctx.lineTo(w / 2 + 30, h / 2);
  // Vertical ticks
  ctx.moveTo(w / 2, h / 2 - 30);
  ctx.lineTo(w / 2, h / 2 + 30);
  ctx.stroke();

  // Instruct text to click and upload
  ctx.fillStyle = '#6b7280';
  ctx.font = '500 21px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Rasm qo\'yish uchun bosing', w / 2, h / 2 + 150);
}

/**
 * Draws the card front onto a given 2D Canvas Context.
 * Dimensions are assumed to be 550x850 pixels.
 */
export async function drawCardFront(
  ctx: CanvasRenderingContext2D,
  card: CardState,
  w = 550,
  h = 850,
  showIndicators = true
): Promise<void> {
  const suitInfo = SUITS_INFO[card.suit];
  const rankInfo = RANKS_INFO[card.rank];

  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Create clipping mask to keep edges beautifully rounded
  drawRoundedRect(ctx, 0, 0, w, h, 36);
  ctx.clip();

  // 1. Render Artwork Context
  if (card.imageSrc) {
    try {
      const img = await loadImage(card.imageSrc);
      
      // Black background for padding areas
      ctx.fillStyle = '#0f172a'; // slate-900
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 + card.xOffset, h / 2 + card.yOffset);
      
      // Calculate drawing dimensions
      const zoomScale = card.zoom / 100;
      let drawW = img.width;
      let drawH = img.height;

      if (card.fit === 'cover' || card.fit === 'contain') {
        const ratioX = w / img.width;
        const ratioY = h / img.height;
        const baseScale = card.fit === 'cover' 
          ? Math.max(ratioX, ratioY) 
          : Math.min(ratioX, ratioY);
        
        drawW = img.width * baseScale * zoomScale;
        drawH = img.height * baseScale * zoomScale;
      } else {
        // 'fill' stretch mode directly matching card aspect ratio
        drawW = w * zoomScale;
        drawH = h * zoomScale;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } catch (err) {
      console.error(err);
      // Fallback on canvas error load
      drawFrontPlaceholder(ctx, w, h, suitInfo.char, suitInfo.hexColor);
    }
  } else {
    // If no custom image, render beautiful modern placeholder
    drawFrontPlaceholder(ctx, w, h, suitInfo.char, suitInfo.hexColor);
  }

  // Ensure card border is drawn on top of the image
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  drawRoundedRect(ctx, 1.5, 1.5, w - 3, h - 3, 35);
  ctx.stroke();

  ctx.restore(); // Stop clipping

  // 2. DRAW UNTOUCHABLE CORNER INDEX SYMBOLS (FAYDO: CHEKKASIDAGI BELGILAR)
  // These stay perfectly on top and unalterable.
  // We'll draw an elegant white protective pill/layer behind them so they are readable in any busy image.
  
  if (showIndicators) {
    const drawCornerIndicator = (coordX: number, coordY: number, rotate: boolean) => {
      ctx.save();
      ctx.translate(coordX, coordY);
      if (rotate) {
        ctx.rotate(Math.PI);
      }

      // Modern glowing glass-pill background
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = '#ffffff';
      // Small pill capsule of width 74px, height 128px
      drawRoundedRect(ctx, -37, -64, 74, 128, 18);
      ctx.fill();

      // Subtle edge border around the pill capsule
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, -37, -64, 74, 128, 18);
      ctx.stroke();

      // Text Render (Value Rank)
      ctx.fillStyle = suitInfo.hexColor;
      ctx.textAlign = 'center';
      
      // Adjust size for "10" which contains 2 digits
      const rankText = rankInfo.char;
      ctx.font = `600 ${rankText === '10' ? '34px' : '40px'} sans-serif`;
      ctx.fillText(rankText, 0, -18);

      // Suit Icon Below rank
      ctx.font = '38px serif';
      ctx.fillText(suitInfo.char, 0, 26);

      ctx.restore();
    };

    // Top-Left Index (center at x=64, y=90)
    drawCornerIndicator(64, 90, false);

    // Bottom-Right Index (center at w-64, h-90, rotated 180 degrees)
    drawCornerIndicator(w - 64, h - 90, true);
  }
}

/**
 * Draws the back aspect of the card on canvas.
 */
export async function drawCardBack(
  ctx: CanvasRenderingContext2D,
  back: BackState,
  w = 550,
  h = 850
): Promise<void> {
  ctx.clearRect(0, 0, w, h);
  ctx.save();

  // Mask clip
  drawRoundedRect(ctx, 0, 0, w, h, 36);
  ctx.clip();

  if (back.imageSrc) {
    try {
      const img = await loadImage(back.imageSrc);
      
      // Background for boundaries
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(w / 2 + back.xOffset, h / 2 + back.yOffset);
      
      const zoomScale = back.zoom / 100;
      let drawW = img.width;
      let drawH = img.height;

      if (back.fit === 'cover' || back.fit === 'contain') {
        const ratioX = w / img.width;
        const ratioY = h / img.height;
        const baseScale = back.fit === 'cover' 
          ? Math.max(ratioX, ratioY) 
          : Math.min(ratioX, ratioY);
        
        drawW = img.width * baseScale * zoomScale;
        drawH = img.height * baseScale * zoomScale;
      } else {
        drawW = w * zoomScale;
        drawH = h * zoomScale;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Outer border overlay
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      drawRoundedRect(ctx, 2, 2, w - 4, h - 4, 34);
      ctx.stroke();

      // Premium inner border
      ctx.lineWidth = 12;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      drawRoundedRect(ctx, 16, 16, w - 32, h - 32, 24);
      ctx.stroke();

    } catch (err) {
      console.error(err);
      drawPatternBack(ctx, w, h);
    }
  } else {
    // Beautiful default luxury back pattern
    drawPatternBack(ctx, w, h);
  }

  // Draw thin crisp boundary
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  drawRoundedRect(ctx, 1.5, 1.5, w - 3, h - 3, 35);
  ctx.stroke();

  ctx.restore();
}

/**
 * Helper to render card to canvas offline and export as data URL.
 */
export async function renderCardFrontToDataUrl(card: CardState, w = 550, h = 850, showIndicators = true): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create offscreen 2D context');
  await drawCardFront(ctx, card, w, h, showIndicators);
  return canvas.toDataURL('image/png', 0.92);
}

/**
 * Helper to render card back to canvas offline and export as data URL.
 */
export async function renderCardBackToDataUrl(back: BackState, w = 550, h = 850): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create offscreen 2D context');
  await drawCardBack(ctx, back, w, h);
  return canvas.toDataURL('image/png', 0.92);
}
