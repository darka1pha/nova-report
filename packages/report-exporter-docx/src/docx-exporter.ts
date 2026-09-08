import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType
} from 'docx';
import type { RenderedDocument, LayoutTextElement, LayoutTableElementInstance } from '@report/core';
import type { ReportExporter, ExportOptions } from '@report/exporter';
import { registerExporter } from '@report/exporter';

export class DocxExporter implements ReportExporter {
  public readonly format = 'docx';

  async export(renderedDoc: RenderedDocument, options?: ExportOptions): Promise<Uint8Array> {
    const sections = renderedDoc.pages.map((page, pIdx) => {
      const children: (Paragraph | Table)[] = [];

      // Sort elements by Y coordinate
      const sortedElements = [...page.elements].sort((a, b) => a.yPt - b.yPt);

      for (const el of sortedElements) {
        if (el.type === 'text') {
          const textEl = el as LayoutTextElement;
          const style = textEl.style || {};
          const isBold = style.fontWeight === 'bold' || Number(style.fontWeight) >= 700;
          const isItalic = style.fontStyle === 'italic';

          let alignment: any = AlignmentType.LEFT;
          if (style.textAlign === 'center') alignment = AlignmentType.CENTER;
          if (style.textAlign === 'right' || textEl.direction === 'rtl') alignment = AlignmentType.RIGHT;

          children.push(
            new Paragraph({
              alignment,
              children: [
                new TextRun({
                  text: textEl.text,
                  bold: isBold,
                  italics: isItalic,
                  size: (textEl.fontSizePt || 10) * 2, // docx uses half-points
                  font: style.fontFamily || 'Calibri',
                  color: (style.color || '#000000').replace('#', '')
                })
              ],
              spacing: { after: 120 }
            })
          );
        } else if (el.type === 'table') {
          const tableEl = el as LayoutTableElementInstance;
          const table = tableEl.table;
          const allRows = [...table.headerRows, ...table.bodyRows, ...table.footerRows];

          const docxRows = allRows.map(row => {
            const docxCells = row.cells.map((cell: any) => {
              const style = cell.style || {};
              const isBold = style.fontWeight === 'bold' || row.isHeader || Number(style.fontWeight) >= 700;

              return new TableCell({
                width: {
                  size: Math.round(cell.widthPt * 20), // dxa unit
                  type: WidthType.DXA
                },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: cell.text,
                        bold: isBold,
                        size: (style.fontSize || 9) * 2,
                        color: (style.color || '#000000').replace('#', '')
                      })
                    ]
                  })
                ],
                shading: style.backgroundColor && style.backgroundColor !== 'transparent'
                  ? { fill: style.backgroundColor.replace('#', '') }
                  : undefined
              });
            });

            return new TableRow({
              children: docxCells
            });
          });

          children.push(
            new Table({
              rows: docxRows,
              width: {
                size: Math.round(table.widthPt * 20),
                type: WidthType.DXA
              }
            })
          );
        }
      }

      return {
        properties: {
          page: {
            pageNumbers: { start: pIdx + 1 },
            margin: {
              top: Math.round(page.marginsPt.top * 20),
              right: Math.round(page.marginsPt.right * 20),
              bottom: Math.round(page.marginsPt.bottom * 20),
              left: Math.round(page.marginsPt.left * 20)
            }
          }
        },
        children
      };
    });

    const doc = new Document({
      title: options?.title || renderedDoc.reportName,
      sections
    });

    const buffer = await Packer.toBuffer(doc);
    return new Uint8Array(buffer);
  }
}

const docxExporter = new DocxExporter();
registerExporter(docxExporter);
