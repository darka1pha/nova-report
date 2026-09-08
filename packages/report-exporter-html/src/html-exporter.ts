import type {
  RenderedDocument,
  RenderedPage,
  LayoutElement,
  LayoutTextElement,
  LayoutShapeElement,
  LayoutImageElement,
  LayoutBarcodeElement,
  LayoutQRCodeElement,
  LayoutTableElementInstance,
  ResolvedBorders
} from '@report/core';
import type { ReportExporter, ExportOptions } from '@report/exporter';
import { registerExporter } from '@report/exporter';

export class HtmlExporter implements ReportExporter {
  public readonly format = 'html';

  async export(renderedDoc: RenderedDocument, options?: ExportOptions): Promise<Uint8Array> {
    const htmlString = this.generateHtml(renderedDoc, options);
    return new TextEncoder().encode(htmlString);
  }

  public generateHtml(renderedDoc: RenderedDocument, _options?: ExportOptions): string {
    const pagesHtml = renderedDoc.pages.map(page => this.renderPage(page)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(renderedDoc.reportName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #525659;
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
    }
    .report-page {
      position: relative;
      background-color: #ffffff;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      margin-bottom: 24px;
      overflow: hidden;
    }
    .report-element {
      position: absolute;
      overflow: hidden;
    }
    table.report-table {
      border-collapse: collapse;
      table-layout: fixed;
    }
    @media print {
      body {
        background-color: transparent;
        padding: 0;
      }
      .report-page {
        box-shadow: none;
        margin: 0;
        page-break-after: always;
        break-after: page;
      }
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
  }

  private renderPage(page: RenderedPage): string {
    const elementsHtml = page.elements.map(el => this.renderElement(el)).join('\n');
    return `<div class="report-page" style="width: ${page.widthPt}pt; height: ${page.heightPt}pt; direction: ${page.direction};">
  ${elementsHtml}
</div>`;
  }

  private renderElement(element: LayoutElement): string {
    switch (element.type) {
      case 'text':
        return this.renderTextElement(element as LayoutTextElement);
      case 'shape':
        return this.renderShapeElement(element as LayoutShapeElement);
      case 'image':
        return this.renderImageElement(element as LayoutImageElement);
      case 'barcode':
        return this.renderBarcodeElement(element as LayoutBarcodeElement);
      case 'qrcode':
        return this.renderQRCodeElement(element as LayoutQRCodeElement);
      case 'table':
        return this.renderTableElement(element as LayoutTableElementInstance);
      default:
        return '';
    }
  }

  private renderTextElement(el: LayoutTextElement): string {
    const borderStyle = bordersToCss(el.borders);
    const style = el.style || {};
    const textAlign = style.textAlign || 'left';
    const verticalAlign = style.verticalAlign || 'top';
    const displayAlign = verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';

    return `<div class="report-element" style="
      left: ${el.xPt}pt;
      top: ${el.yPt}pt;
      width: ${el.widthPt}pt;
      height: ${el.heightPt}pt;
      font-family: ${style.fontFamily || 'inherit'};
      font-size: ${el.fontSizePt}pt;
      font-weight: ${style.fontWeight || 'normal'};
      font-style: ${style.fontStyle || 'normal'};
      color: ${style.color || '#000000'};
      background-color: ${style.backgroundColor || 'transparent'};
      text-align: ${textAlign};
      direction: ${el.direction || 'ltr'};
      display: flex;
      align-items: ${displayAlign};
      justify-content: ${textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start'};
      padding-top: ${style.padding?.top || 0}pt;
      padding-right: ${style.padding?.right || 0}pt;
      padding-bottom: ${style.padding?.bottom || 0}pt;
      padding-left: ${style.padding?.left || 0}pt;
      ${borderStyle}
      ${el.rotation ? `transform: rotate(${el.rotation}deg);` : ''}
    ">${escapeHtml(el.text).replace(/\n/g, '<br/>')}</div>`;
  }

  private renderShapeElement(el: LayoutShapeElement): string {
    if (el.shapeType === 'circle' || el.shapeType === 'ellipse') {
      return `<div class="report-element" style="
        left: ${el.xPt}pt;
        top: ${el.yPt}pt;
        width: ${el.widthPt}pt;
        height: ${el.heightPt}pt;
        border-radius: 50%;
        background-color: ${el.fillColor || 'transparent'};
        border: ${el.strokeWidthPt}pt solid ${el.strokeColor || 'transparent'};
      "></div>`;
    }

    if (el.shapeType === 'line') {
      return `<div class="report-element" style="
        left: ${el.xPt}pt;
        top: ${el.yPt}pt;
        width: ${el.widthPt}pt;
        height: ${Math.max(1, el.strokeWidthPt)}pt;
        background-color: ${el.strokeColor || '#000000'};
      "></div>`;
    }

    // Rectangle / Rounded rectangle
    return `<div class="report-element" style="
      left: ${el.xPt}pt;
      top: ${el.yPt}pt;
      width: ${el.widthPt}pt;
      height: ${el.heightPt}pt;
      border-radius: ${el.borderRadiusPt}pt;
      background-color: ${el.fillColor || 'transparent'};
      border: ${el.strokeWidthPt}pt solid ${el.strokeColor || 'transparent'};
      ${bordersToCss(el.borders)}
    "></div>`;
  }

  private renderImageElement(el: LayoutImageElement): string {
    return `<div class="report-element" style="
      left: ${el.xPt}pt;
      top: ${el.yPt}pt;
      width: ${el.widthPt}pt;
      height: ${el.heightPt}pt;
      ${bordersToCss(el.borders)}
    ">
      <img src="${el.src}" alt="" style="
        width: 100%;
        height: 100%;
        object-fit: ${el.fit};
      "/>
    </div>`;
  }

  private renderBarcodeElement(el: LayoutBarcodeElement): string {
    return `<div class="report-element" style="
      left: ${el.xPt}pt;
      top: ${el.yPt}pt;
      width: ${el.widthPt}pt;
      height: ${el.heightPt}pt;
      background-color: ${el.backgroundColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: monospace;
      font-size: 8pt;
      color: ${el.barColor};
      border: 1px solid #d1d5db;
    ">
      <div style="font-weight: bold; letter-spacing: 2px;">||| | |||| | | |||</div>
      ${el.includeText ? `<div>${escapeHtml(el.value)}</div>` : ''}
    </div>`;
  }

  private renderQRCodeElement(el: LayoutQRCodeElement): string {
    return `<div class="report-element" style="
      left: ${el.xPt}pt;
      top: ${el.yPt}pt;
      width: ${el.widthPt}pt;
      height: ${el.heightPt}pt;
      background-color: ${el.lightColor};
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #d1d5db;
    ">
      <svg width="80%" height="80%" viewBox="0 0 25 25">
        <path fill="${el.darkColor}" d="M0 0h7v7H0zm2 2h3v3H2zm7-2h2v2H9zm4 0h7v7h-7zm2 2h3v3h-3zM0 9h2v2H0zm4 0h3v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zm-16 4h7v7H0zm2 2h3v3H2zm7-2h4v2H9zm6 0h2v4h-2zm-6 3h2v3H9zm4 0h2v3h-2zm-4 3h7v2H9z"/>
      </svg>
    </div>`;
  }

  private renderTableElement(el: LayoutTableElementInstance): string {
    const table = el.table;
    const allRows = [...table.headerRows, ...table.bodyRows, ...table.footerRows];

    const rowsHtml = allRows
      .map(row => {
        const cellsHtml = row.cells
          .map((cell: any) => {
            const cellBorder = bordersToCss(cell.borders);
            const style = cell.style || {};
            const textAlign = style.textAlign || 'left';
            return `<td colspan="${cell.colSpan || 1}" rowspan="${cell.rowSpan || 1}" style="
              width: ${cell.widthPt}pt;
              height: ${cell.heightPt}pt;
              font-family: ${style.fontFamily || 'inherit'};
              font-size: ${style.fontSize || 10}pt;
              font-weight: ${style.fontWeight || 'normal'};
              color: ${style.color || '#000000'};
              background-color: ${style.backgroundColor || 'transparent'};
              text-align: ${textAlign};
              direction: ${cell.direction || 'ltr'};
              padding: ${style.padding?.top || 2}pt ${style.padding?.right || 4}pt ${style.padding?.bottom || 2}pt ${style.padding?.left || 4}pt;
              vertical-align: ${style.verticalAlign || 'middle'};
              ${cellBorder}
            ">${escapeHtml(cell.text).replace(/\n/g, '<br/>')}</td>`;
          })
          .join('');

        return `<tr style="height: ${row.heightPt}pt;">${cellsHtml}</tr>`;
      })
      .join('\n');

    return `<div class="report-element" style="
      left: ${el.xPt}pt;
      top: ${el.yPt}pt;
      width: ${el.widthPt}pt;
      height: ${el.heightPt}pt;
    ">
      <table class="report-table" style="width: ${el.widthPt}pt;">
        ${rowsHtml}
      </table>
    </div>`;
  }
}

function bordersToCss(borders?: ResolvedBorders): string {
  if (!borders) return '';
  let css = '';
  if (borders.top) css += `border-top: ${borders.top.widthPt}pt ${borders.top.style} ${borders.top.color};`;
  if (borders.right) css += `border-right: ${borders.right.widthPt}pt ${borders.right.style} ${borders.right.color};`;
  if (borders.bottom) css += `border-bottom: ${borders.bottom.widthPt}pt ${borders.bottom.style} ${borders.bottom.color};`;
  if (borders.left) css += `border-left: ${borders.left.widthPt}pt ${borders.left.style} ${borders.left.color};`;
  return css;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const htmlExporter = new HtmlExporter();
registerExporter(htmlExporter);
