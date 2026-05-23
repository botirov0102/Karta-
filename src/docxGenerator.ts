/**
 * WORD DOCUMENT GENERATOR (DOCX)
 * Creates the "oldi.docx" (front) and "orqa.docx" (back) playing card grids.
 */
import {
  Document,
  Packer,
  Paragraph,
  ImageRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeightRule,
  PageBreak,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { CardState, BackState } from './types';
import { renderCardFrontToDataUrl, renderCardBackToDataUrl } from './cardRenderer';

/**
 * Converts a data URL (Base64) from HTML5 Canvas to a Uint8Array.
 */
function dataURLToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(';base64,');
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return uInt8Array;
}

/**
 * Generates the front layouts DOCX file (oldi.docx)
 * Arranges 36 cards on 4 pages (3x3 grid per page)
 */
export async function generateFrontDocx(
  deck: CardState[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const totalCards = deck.length;
  const imageBuffers: Uint8Array[] = [];

  // 1. Render all cards to images
  for (let i = 0; i < totalCards; i++) {
    if (onProgress) {
      onProgress(i + 1, totalCards);
    }
    const dataUrl = await renderCardFrontToDataUrl(deck[i]);
    const buffer = dataURLToUint8Array(dataUrl);
    imageBuffers.push(buffer);
  }

  // Define section children containing tables and page breaks
  const documentSectionsChildren: any[] = [];

  // Sizing in dxa (1 cm = 566.929 dxa).
  // Column width: 5.5 cm = 3118 dxa
  // Row height: 8.5 cm = 4819 dxa
  // A4 Page size: Width = 11905 dxa (21 cm), Height = 16838 dxa (29.7 cm)
  // Let's set page margins to fit 3x3 perfectly:
  // Horiz margin: (21 - 16.5) / 2 = 2.25 cm = 1276 dxa
  // Vert margin: (29.7 - 25.5) / 2 = 2.1 cm = 1190 dxa

  const CELL_WIDTH_DXA = 3118;
  const CELL_HEIGHT_DXA = 4819;
  
  // Dimensions for DOCX Image transformation in pixels (96 DPI)
  // 5.5 cm = 2.16 in * 96 pix = 208 px
  // 8.5 cm = 3.34 in * 96 pix = 321 px
  const IMAGE_WIDTH_PX = 208;
  const IMAGE_HEIGHT_PX = 321;

  // We have 4 pages of 9 cards
  for (let page = 0; page < 4; page++) {
    const pageIndexStart = page * 9;
    const tableRows: TableRow[] = [];

    // Create a 3x3 table
    for (let r = 0; r < 3; r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < 3; c++) {
        const itemIdx = pageIndexStart + (r * 3 + c);
        const cardBuffer = imageBuffers[itemIdx];

        cells.push(
          new TableCell({
            width: {
              size: CELL_WIDTH_DXA,
              type: WidthType.DXA,
            },
            // Center aligning the images inside the cell
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 240 },
                children: [
                  new ImageRun({
                    data: cardBuffer,
                    transformation: {
                      width: IMAGE_WIDTH_PX,
                      height: IMAGE_HEIGHT_PX,
                    },
                    type: "png",
                  } as any),
                ],
              }),
            ],
          })
        );
      }

      tableRows.push(
        new TableRow({
          height: {
            value: CELL_HEIGHT_DXA,
            rule: HeightRule.EXACT,
          },
          children: cells,
        })
      );
    }

    const table = new Table({
      rows: tableRows,
      // Thin dashed borders as precise cutting guidelines
      borders: {
        top: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        bottom: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        left: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        right: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        insideHorizontal: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        insideVertical: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
      },
    });

    documentSectionsChildren.push(table);

    // If it is not the last page, insert a Page Break
    if (page < 3) {
      documentSectionsChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Create the word document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11905, // A4 Width
              height: 16838, // A4 Height
            },
            margin: {
              top: 1190, // 2.1 cm top margin
              bottom: 1190, // 2.1 cm bottom
              left: 1276, // 2.25 cm left
              right: 1276, // 2.25 cm right
            },
          },
        },
        children: documentSectionsChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates the back layouts DOCX file (orqa.docx)
 * Arranges 36 cards on 4 pages using the single BackState.
 */
export async function generateBackDocx(
  back: BackState,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  // Render the back side design ONCE. All 36 cards on the back are identical.
  if (onProgress) {
    onProgress(1, 4);
  }
  const dataUrl = await renderCardBackToDataUrl(back);
  const backBuffer = dataURLToUint8Array(dataUrl);

  const documentSectionsChildren: any[] = [];
  
  const CELL_WIDTH_DXA = 3118;
  const CELL_HEIGHT_DXA = 4819;
  const IMAGE_WIDTH_PX = 208;
  const IMAGE_HEIGHT_PX = 321;

  for (let page = 0; page < 4; page++) {
    if (onProgress) {
      onProgress(page + 1, 4);
    }
    const tableRows: TableRow[] = [];

    // Create 3x3 table for backs
    for (let r = 0; r < 3; r++) {
      const cells: TableCell[] = [];
      for (let c = 0; c < 3; c++) {
        cells.push(
          new TableCell({
            width: {
              size: CELL_WIDTH_DXA,
              type: WidthType.DXA,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0, line: 240 },
                children: [
                  new ImageRun({
                    data: backBuffer,
                    transformation: {
                      width: IMAGE_WIDTH_PX,
                      height: IMAGE_HEIGHT_PX,
                    },
                    type: "png",
                  } as any),
                ],
              }),
            ],
          })
        );
      }

      tableRows.push(
        new TableRow({
          height: {
            value: CELL_HEIGHT_DXA,
            rule: HeightRule.EXACT,
          },
          children: cells,
        })
      );
    }

    const table = new Table({
      rows: tableRows,
      // Thin dashed borders as cutting guidelines
      borders: {
        top: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        bottom: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        left: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        right: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        insideHorizontal: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
        insideVertical: { style: BorderStyle.DASHED, size: 4, color: 'CCCCCC' },
      },
    });

    documentSectionsChildren.push(table);

    // If it is not the last page, insert a Page Break
    if (page < 3) {
      documentSectionsChildren.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Complete docx
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11905,
              height: 16838,
            },
            margin: {
              top: 1190,
              bottom: 1190,
              left: 1276,
              right: 1276,
            },
          },
        },
        children: documentSectionsChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
