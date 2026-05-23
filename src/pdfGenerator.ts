/**
 * PDF GENERATOR
 * Generates high-quality print-ready playing card layouts in PDF format.
 * Matches user requirements: 8.5cm x 5.5cm card dimensions, 3x3 grid on A4.
 */
import { jsPDF } from 'jspdf';
import { CardState, BackState } from './types';
import { renderCardFrontToDataUrl, renderCardBackToDataUrl } from './cardRenderer';

// Dimensions in millimeters for precision
const CARD_WIDTH_MM = 55;   // 5.5 cm
const CARD_HEIGHT_MM = 85;  // 8.5 cm
const CARD_GAP_MM = 10;     // 1.0 cm (cut distance)
const PAGE_WIDTH_MM = 210;  // A4 Width
const PAGE_HEIGHT_MM = 297; // A4 Height

// Calculated Margins for Perfect Centering:
// 3 cols * 55 + 2 gaps * 10 = 185 mm. Remaining = 25 mm. Left/Right margin = 12.5 mm
// 3 rows * 85 + 2 gaps * 10 = 275 mm. Remaining = 22 mm. Top/Bottom margin = 11.0 mm
const LEFT_MARGIN_MM = 12.5;
const TOP_MARGIN_MM = 11.0;

/**
 * Generates a 4-page PDF containing the front-side designs of the entire 36-card deck.
 */
export async function generateFrontPdf(
  deck: CardState[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const totalCards = deck.length;
  const imagePromises = deck.map(async (card, idx) => {
    const dataUrl = await renderCardFrontToDataUrl(card);
    if (onProgress) {
      onProgress(idx + 1, totalCards);
    }
    return dataUrl;
  });

  const base64Images = await Promise.all(imagePromises);

  // Initialize jsPDF A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Generate 4 pages (9 cards each = 36 cards total)
  for (let page = 0; page < 4; page++) {
    if (page > 0) {
      doc.addPage('a4', 'portrait');
    }

    const pageStartIndex = page * 9;

    // Draw A4 boundaries watermarks/guides
    // Let's add cutting guidelines around the 3x3 layout
    doc.setDrawColor(200, 200, 200); // Light gray #C8C8C8
    doc.setLineWidth(0.15); // Thin cutting line

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cardIndex = pageStartIndex + (row * 3 + col);
        if (cardIndex >= totalCards) continue;

        const x = LEFT_MARGIN_MM + col * (CARD_WIDTH_MM + CARD_GAP_MM);
        const y = TOP_MARGIN_MM + row * (CARD_HEIGHT_MM + CARD_GAP_MM);

        // 1. Add Card Image
        doc.addImage(
          base64Images[cardIndex],
          'PNG',
          x,
          y,
          CARD_WIDTH_MM,
          CARD_HEIGHT_MM,
          `front_${cardIndex}`,
          'MEDIUM'
        );

        // 2. Draw outer dashed cutting guide rectangle (approx 1mm extra border or exact boundary)
        doc.setLineDashPattern([1, 1], 0);
        // Draw exact outer bounds rectangle for precision cutting
        doc.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      }
    }

    // Add brief page indicator in the margin
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Tayyorlangan vishka: ${page + 1}-sahifa (Front) | A4 O'lcham | 8.5x5.5 sm`, LEFT_MARGIN_MM, PAGE_HEIGHT_MM - 4);
  }

  return doc.output('blob');
}

/**
 * Generates a 4-page PDF containing the back-side design for the entire 36-card deck.
 */
export async function generateBackPdf(
  back: BackState,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (onProgress) {
    onProgress(1, 4);
  }
  
  // Render back image once (all 36 card backs are identical)
  const backDataUrl = await renderCardBackToDataUrl(back);

  if (onProgress) {
    onProgress(4, 4);
  }

  // Initialize jsPDF A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Create 4 pages of A4 (each page contains 3x3 back cards)
  for (let page = 0; page < 4; page++) {
    if (page > 0) {
      doc.addPage('a4', 'portrait');
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.15);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = LEFT_MARGIN_MM + col * (CARD_WIDTH_MM + CARD_GAP_MM);
        const y = TOP_MARGIN_MM + row * (CARD_HEIGHT_MM + CARD_GAP_MM);

        // Adds same back design
        doc.addImage(
          backDataUrl,
          'PNG',
          x,
          y,
          CARD_WIDTH_MM,
          CARD_HEIGHT_MM,
          'back_cover',
          'MEDIUM'
        );

        // Cutting guides rect
        doc.setLineDashPattern([1, 1], 0);
        doc.rect(x, y, CARD_WIDTH_MM, CARD_HEIGHT_MM);
      }
    }

    // Add brief page indicator in the margin
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Tayyorlangan vishka: ${page + 1}-sahifa (Back/Orqa) | A4 O'lcham | 8.5x5.5 sm`, LEFT_MARGIN_MM, PAGE_HEIGHT_MM - 4);
  }

  return doc.output('blob');
}
