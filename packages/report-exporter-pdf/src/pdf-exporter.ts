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
  LayoutChartElement,
  ResolvedBorders
} from '@report/core';
import {
  encodeBarcode,
  generateQRCodeMatrix,
  qrcodeToRects
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
            Author: options?.author || 'NovaReport Engine'
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
      case 'chart':
        this.renderChartElement(doc, element as LayoutChartElement);
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
    const bgColor = el.backgroundColor || '#ffffff';
    const barColor = el.barColor || '#000000';

    doc.rect(el.xPt, el.yPt, el.widthPt, el.heightPt).fill(bgColor);

    try {
      const barcode = encodeBarcode(el.format, el.value);
      const totalModules = barcode.totalModules;
      if (totalModules > 0) {
        const textHeight = el.includeText ? Math.min(10, el.heightPt * 0.22) : 0;
        const barHeight = el.heightPt - textHeight - 2;
        const moduleWidth = el.widthPt / totalModules;

        let inBar = false;
        let barStart = 0;

        doc.fillColor(barColor);
        for (let i = 0; i < totalModules; i++) {
          if (barcode.modules[i]) {
            if (!inBar) {
              inBar = true;
              barStart = i;
            }
          } else {
            if (inBar) {
              const barW = (i - barStart) * moduleWidth;
              const barX = el.xPt + barStart * moduleWidth;
              doc.rect(barX, el.yPt + 1, barW, barHeight).fill(barColor);
              inBar = false;
            }
          }
        }

        if (inBar) {
          const barW = (totalModules - barStart) * moduleWidth;
          const barX = el.xPt + barStart * moduleWidth;
          doc.rect(barX, el.yPt + 1, barW, barHeight).fill(barColor);
        }

        if (el.includeText) {
          doc.font('Helvetica').fontSize(Math.max(6, textHeight * 0.9)).fillColor(barColor);
          doc.text(barcode.value, el.xPt, el.yPt + barHeight + 2, {
            width: el.widthPt,
            align: 'center'
          });
        }
      }
    } catch {
      // Fallback
      doc.font('Helvetica').fontSize(8).fillColor(barColor).text(el.value, el.xPt, el.yPt + el.heightPt / 2, {
        width: el.widthPt,
        align: 'center'
      });
    }

    this.drawBorders(doc, el.xPt, el.yPt, el.widthPt, el.heightPt, el.borders);
    doc.restore();
  }

  private renderQRCodeElement(doc: any, el: LayoutQRCodeElement) {
    doc.save();
    const lightColor = el.lightColor || '#ffffff';
    const darkColor = el.darkColor || '#000000';

    doc.rect(el.xPt, el.yPt, el.widthPt, el.heightPt).fill(lightColor);

    try {
      const matrix = generateQRCodeMatrix(el.value, (el.errorCorrectionLevel || 'M') as any);
      const rects = qrcodeToRects(matrix, el.xPt, el.yPt, el.widthPt, el.heightPt, 1);
      doc.fillColor(darkColor);
      for (const r of rects) {
        doc.rect(r.x, r.y, r.width, r.height).fill(darkColor);
      }
    } catch {
      doc.font('Helvetica').fontSize(8).fillColor(darkColor).text(el.value, el.xPt, el.yPt + el.heightPt / 2, {
        width: el.widthPt,
        align: 'center'
      });
    }

    this.drawBorders(doc, el.xPt, el.yPt, el.widthPt, el.heightPt, el.borders);
    doc.restore();
  }

  private renderChartElement(doc: any, el: LayoutChartElement) {
    doc.save();
    const chart = el.chart;

    // Background and border
    doc.rect(el.xPt, el.yPt, el.widthPt, el.heightPt).fill('#ffffff');

    // Title
    if (chart.title) {
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b');
      doc.text(chart.title, el.xPt, el.yPt + 5, {
        width: el.widthPt,
        align: 'center'
      });
    }

    const plotX = el.xPt + chart.plotArea.x;

    if (chart.chartType === 'bar') {
      // Y-axis gridlines
      for (const tick of chart.yTicks || []) {
        const ty = el.yPt + tick.y;
        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .moveTo(plotX, ty)
          .lineTo(plotX + chart.plotArea.width, ty)
          .stroke();

        doc.font('Helvetica').fontSize(6.5).fillColor('#64748b');
        doc.text(tick.label, el.xPt, ty - 3, {
          width: chart.plotArea.x - 3,
          align: 'right'
        });
      }

      // X-axis line
      const axisY = el.yPt + chart.plotArea.y + chart.plotArea.height;
      doc
        .strokeColor('#94a3b8')
        .lineWidth(0.75)
        .moveTo(plotX, axisY)
        .lineTo(plotX + chart.plotArea.width, axisY)
        .stroke();

      // Bars
      for (const bar of chart.bars || []) {
        doc.rect(el.xPt + bar.x, el.yPt + bar.y, bar.width, bar.height).fill(bar.color);

        doc.font('Helvetica-Bold').fontSize(6).fillColor('#334155');
        doc.text(String(bar.value), el.xPt + bar.x - 4, el.yPt + bar.y - 7, {
          width: bar.width + 8,
          align: 'center'
        });
      }

      // X-labels
      for (const xl of chart.xLabels || []) {
        doc.font('Helvetica').fontSize(6.5).fillColor('#475569');
        doc.text(xl.label, el.xPt + xl.x - 15, axisY + 3, {
          width: 30,
          align: 'center'
        });
      }
    } else if (chart.chartType === 'line') {
      // Y-axis gridlines
      for (const tick of chart.yTicks || []) {
        const ty = el.yPt + tick.y;
        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .moveTo(plotX, ty)
          .lineTo(plotX + chart.plotArea.width, ty)
          .stroke();

        doc.font('Helvetica').fontSize(6.5).fillColor('#64748b');
        doc.text(tick.label, el.xPt, ty - 3, {
          width: chart.plotArea.x - 3,
          align: 'right'
        });
      }

      const axisY = el.yPt + chart.plotArea.y + chart.plotArea.height;
      doc
        .strokeColor('#94a3b8')
        .lineWidth(0.75)
        .moveTo(plotX, axisY)
        .lineTo(plotX + chart.plotArea.width, axisY)
        .stroke();

      // Draw line path
      const points = chart.linePoints || [];
      if (points.length > 1) {
        doc.strokeColor(chart.colors[0] || '#2563eb').lineWidth(1.5);
        doc.moveTo(el.xPt + points[0]!.x, el.yPt + points[0]!.y);
        for (let i = 1; i < points.length; i++) {
          doc.lineTo(el.xPt + points[i]!.x, el.yPt + points[i]!.y);
        }
        doc.stroke();
      }

      // Draw points
      for (const pt of points) {
        doc.circle(el.xPt + pt.x, el.yPt + pt.y, 2.5).fillAndStroke('#ffffff', pt.color);
        doc.font('Helvetica-Bold').fontSize(6).fillColor('#334155');
        doc.text(String(pt.value), el.xPt + pt.x - 10, el.yPt + pt.y - 8, {
          width: 20,
          align: 'center'
        });
      }

      for (const xl of chart.xLabels || []) {
        doc.font('Helvetica').fontSize(6.5).fillColor('#475569');
        doc.text(xl.label, el.xPt + xl.x - 15, axisY + 3, {
          width: 30,
          align: 'center'
        });
      }
    } else if (chart.chartType === 'pie' || chart.chartType === 'donut') {
      const cx = el.xPt + el.widthPt / 2;
      const cy = el.yPt + (chart.title ? 18 : 6) + chart.plotArea.height / 2;
      const radius = Math.min(chart.plotArea.width, chart.plotArea.height) / 2 - 4;

      for (const slice of chart.pieSlices || []) {
        // Draw slice wedge with polygon segments
        const step = 0.05;
        const totalAngle = slice.endAngle - slice.startAngle;
        if (totalAngle > 0.01) {
          doc.save();
          doc.moveTo(cx, cy);
          for (let a = slice.startAngle; a <= slice.endAngle + 0.01; a += step) {
            const angle = Math.min(a, slice.endAngle);
            doc.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
          }
          doc.closePath();
          doc.fillColor(slice.color).fill();
          doc.restore();
        }
      }

      // If donut, punch hole
      if (chart.chartType === 'donut') {
        doc.circle(cx, cy, radius * 0.55).fill('#ffffff');
      }
    }

    // Legend at bottom
    if (chart.legend && chart.legend.length > 0) {
      const legendY = el.yPt + el.heightPt - 8;
      const totalItems = chart.legend.length;
      const itemWidth = Math.min(60, el.widthPt / totalItems);
      const startX = el.xPt + (el.widthPt - itemWidth * totalItems) / 2;

      chart.legend.forEach((item, idx) => {
        const ix = startX + idx * itemWidth;
        doc.rect(ix, legendY - 5, 5, 5).fill(item.color);
        doc.font('Helvetica').fontSize(6).fillColor('#475569');
        doc.text(item.label, ix + 7, legendY - 5, {
          width: itemWidth - 8,
          lineBreak: false
        });
      });
    }

    this.drawBorders(doc, el.xPt, el.yPt, el.widthPt, el.heightPt, el.borders);
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
