import PDFDocument from 'pdfkit';
import type { RenderedDocument, RenderedPage } from '@report/core';
import type { ReportExporter, ExportOptions } from '@report/exporter';
import { registerExporter } from '@report/exporter';
import type {
  LayoutElement,
  LayoutTextElement,
  LayoutShapeElement,
  LayoutImageElement,
  LayoutBarcodeElement,
  LayoutQRCodeElement,
  LayoutTableElementInstance,
  ResolvedBorders
} from '@report/core';

export class PdfExporter implements ReportExporter {
  public readonly format = 'pdf';

  async export(renderedDoc: RenderedDocument, options?: ExportOptions): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      try {
        const firstPage = renderedDoc.pages[0];
        const width = firstPage ? firstPage.widthPt : 595.28; // A4 default
        const height = firstPage ? firstPage.heightPt : 841.89;

        const doc = new PDFDocument({
          size: [width, height],
          margin: 0,
          autoFirstPage: false,
          info: {
            Title: options?.title || renderedDoc.reportName,
            Author: options?.author || 'NextReport Engine'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          resolve(new Uint8Array(result));
        });
        doc.on('error', err => reject(err));

        for (const page of renderedDoc.pages) {
          doc.addPage({
            size: [page.widthPt, page.heightPt],
            margin: 0
          });

          this.renderPage(doc, page);
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  private renderPage(doc: any, page: RenderedPage) {
    for (const element of page.elements) {
      this.renderElement(doc, element);
    }
  }

  private renderElement(doc: any, element: LayoutElement) {
    switch (element.type) {
      case 'text':
        this.renderTextElement(doc, element as LayoutTextElement);
        break;
      case 'shape':
        this.renderShapeElement(doc, element as LayoutShapeElement);
        break;
      case 'image':
        this.renderImageElement(doc, element as LayoutImageElement);
        break;
      case 'barcode':
        this.renderBarcodeElement(doc, element as LayoutBarcodeElement);
        break;
      case 'qrcode':
        this.renderQRCodeElement(doc, element as LayoutQRCodeElement);
        break;
      case 'table':
        this.renderTableElement(doc, element as LayoutTableElementInstance);
        break;
    }
  }

  private renderTextElement(doc: any, el: LayoutTextElement) {
    doc.save();

    const style = el.style || {};
    const fontSize = el.fontSizePt || 10;
    const isBold = style.fontWeight === 'bold' || Number(style.fontWeight) >= 700;
    const isItalic = style.fontStyle === 'italic';

    // Standard PDF fonts mapping
    let fontName = 'Helvetica';
    if (isBold && isItalic) fontName = 'Helvetica-BoldOblique';
    else if (isBold) fontName = 'Helvetica-Bold';
    else if (isItalic) fontName = 'Helvetica-Oblique';

    // Background fill if any
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      doc.rect(el.xPt, el.yPt, el.widthPt, el.heightPt).fill(style.backgroundColor);
    }

    // Borders
    this.drawBorders(doc, el.xPt, el.yPt, el.widthPt, el.heightPt, el.borders);

    // Text content
    doc.font(fontName).fontSize(fontSize).fillColor(style.color || '#000000');

    const paddingLeft = style.padding?.left || 0;
    const paddingTop = style.padding?.top || 0;
    const paddingRight = style.padding?.right || 0;
    const paddingBottom = style.padding?.bottom || 0;

    const textWidth = Math.max(10, el.widthPt - paddingLeft - paddingRight);
    const align = style.textAlign || (el.direction === 'rtl' ? 'right' : 'left');

    const textY =
      style.verticalAlign === 'middle'
        ? el.yPt + (el.heightPt - fontSize * 1.2) / 2
        : style.verticalAlign === 'bottom'
        ? el.yPt + el.heightPt - fontSize * 1.2 - paddingBottom
        : el.yPt + paddingTop;

    doc.text(el.text, el.xPt + paddingLeft, textY, {
      width: textWidth,
      align: align === 'justify' ? 'justify' : align,
      lineBreak: true
    });

    doc.restore();
  }

  private renderShapeElement(doc: any, el: LayoutShapeElement) {
    doc.save();

    const hasFill = el.fillColor && el.fillColor !== 'transparent';
    const hasStroke = el.strokeColor && el.strokeWidthPt > 0;

    if (el.shapeType === 'circle' || el.shapeType === 'ellipse') {
      const radiusX = el.widthPt / 2;
      const radiusY = el.heightPt / 2;
      const centerX = el.xPt + radiusX;
      const centerY = el.yPt + radiusY;

      doc.ellipse(centerX, centerY, radiusX, radiusY);
      if (hasFill && hasStroke) {
        doc.lineWidth(el.strokeWidthPt).fillAndStroke(el.fillColor, el.strokeColor);
      } else if (hasFill) {
        doc.fill(el.fillColor);
      } else if (hasStroke) {
        doc.lineWidth(el.strokeWidthPt).stroke(el.strokeColor);
      }
    } else if (el.shapeType === 'line') {
      doc
        .moveTo(el.xPt, el.yPt)
        .lineTo(el.xPt + el.widthPt, el.yPt + el.heightPt)
        .lineWidth(Math.max(0.5, el.strokeWidthPt))
        .stroke(el.strokeColor || '#000000');
    } else {
      // Rectangle / Rounded rectangle
      if (el.borderRadiusPt > 0) {
        doc.roundedRect(el.xPt, el.yPt, el.widthPt, el.heightPt, el.borderRadiusPt);
      } else {
        doc.rect(el.xPt, el.yPt, el.widthPt, el.heightPt);
      }

      if (hasFill && hasStroke) {
        doc.lineWidth(el.strokeWidthPt).fillAndStroke(el.fillColor, el.strokeColor);
      } else if (hasFill) {
        doc.fill(el.fillColor);
      } else if (hasStroke) {
        doc.lineWidth(el.strokeWidthPt).stroke(el.strokeColor);
      }

      this.drawBorders(doc, el.xPt, el.yPt, el.widthPt, el.heightPt, el.borders);
    }

    doc.restore();
  }

  private renderImageElement(doc: any, el: LayoutImageElement) {
    if (!el.src) return;
    doc.save();

    try {
      if (el.src.startsWith('data:image')) {
        const base64Data = el.src.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          doc.image(buffer, el.xPt, el.yPt, {
            width: el.widthPt,
            height: el.heightPt,
            fit: [el.widthPt, el.heightPt],
            align: 'center',
            valign: 'center'
          });
        }
      }
    } catch (e) {
      console.warn('Could not render image in PDF:', e);
    }

    this.drawBorders(doc, el.xPt, el.yPt, el.widthPt, el.heightPt, el.borders);
    doc.restore();
  }

  private renderBarcodeElement(doc: any, el: LayoutBarcodeElement) {
    doc.save();
    doc.rect(el.xPt, el.yPt, el.widthPt, el.heightPt).fill(el.backgroundColor || '#ffffff');
    doc.font('Helvetica-Bold').fontSize(el.heightPt * 0.4).fillColor(el.barColor || '#000000');
    doc.text('||| | |||| | ||', el.xPt, el.yPt + el.heightPt * 0.1, {
      width: el.widthPt,
      align: 'center'
    });
    if (el.includeText) {
      doc.font('Helvetica').fontSize(el.heightPt * 0.25).fillColor(el.barColor || '#000000');
      doc.text(el.value, el.xPt, el.yPt + el.heightPt * 0.6, {
        width: el.widthPt,
        align: 'center'
      });
    }
    doc.restore();
  }

  private renderQRCodeElement(doc: any, el: LayoutQRCodeElement) {
    doc.save();
    doc.rect(el.xPt, el.yPt, el.widthPt, el.heightPt).fill(el.lightColor || '#ffffff');
    // Draw QR outer squares
    const s = Math.min(el.widthPt, el.heightPt);
    const dark = el.darkColor || '#000000';
    doc.rect(el.xPt + s * 0.1, el.yPt + s * 0.1, s * 0.25, s * 0.25).fill(dark);
    doc.rect(el.xPt + s * 0.65, el.yPt + s * 0.1, s * 0.25, s * 0.25).fill(dark);
    doc.rect(el.xPt + s * 0.1, el.yPt + s * 0.65, s * 0.25, s * 0.25).fill(dark);
    doc.rect(el.xPt + s * 0.4, el.yPt + s * 0.4, s * 0.2, s * 0.2).fill(dark);
    doc.restore();
  }

  private renderTableElement(doc: any, el: LayoutTableElementInstance) {
    doc.save();
    const table = el.table;
    const allRows = [...table.headerRows, ...table.bodyRows, ...table.footerRows];

    for (const row of allRows) {
      for (const cell of row.cells) {
        const style = cell.style || {};
        const cellX = cell.xPt;
        const cellY = cell.yPt;
        const cellW = cell.widthPt;
        const cellH = cell.heightPt;

        // Background
        if (style.backgroundColor && style.backgroundColor !== 'transparent') {
          doc.rect(cellX, cellY, cellW, cellH).fill(style.backgroundColor);
        }

        // Cell Borders
        this.drawBorders(doc, cellX, cellY, cellW, cellH, cell.borders);

        // Cell Text
        const fontSize = style.fontSize || 9;
        const isBold = style.fontWeight === 'bold' || row.isHeader || Number(style.fontWeight) >= 700;
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(fontSize)
          .fillColor(style.color || '#000000');

        const padLeft = style.padding?.left ?? 4;
        const padRight = style.padding?.right ?? 4;
        const align = style.textAlign || (cell.direction === 'rtl' ? 'right' : 'left');

        const textY = cellY + (cellH - fontSize * 1.2) / 2;
        doc.text(cell.text, cellX + padLeft, textY, {
          width: Math.max(10, cellW - padLeft - padRight),
          align: align === 'justify' ? 'justify' : align
        });
      }
    }

    doc.restore();
  }

  private drawBorders(doc: any, x: number, y: number, w: number, h: number, borders?: ResolvedBorders) {
    if (!borders) return;

    if (borders.top) {
      doc.moveTo(x, y)
        .lineTo(x + w, y)
        .lineWidth(borders.top.widthPt)
        .stroke(borders.top.color);
    }
    if (borders.right) {
      doc.moveTo(x + w, y)
        .lineTo(x + w, y + h)
        .lineWidth(borders.right.widthPt)
        .stroke(borders.right.color);
    }
    if (borders.bottom) {
      doc.moveTo(x, y + h)
        .lineTo(x + w, y + h)
        .lineWidth(borders.bottom.widthPt)
        .stroke(borders.bottom.color);
    }
    if (borders.left) {
      doc.moveTo(x, y)
        .lineTo(x, y + h)
        .lineWidth(borders.left.widthPt)
        .stroke(borders.left.color);
    }
  }
}

const pdfExporter = new PdfExporter();
registerExporter(pdfExporter);
