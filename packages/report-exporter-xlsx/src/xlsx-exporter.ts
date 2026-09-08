import ExcelJS from 'exceljs';
import type { RenderedDocument } from '@report/core';
import type { ReportExporter, ExportOptions } from '@report/exporter';
import { registerExporter } from '@report/exporter';
import type { LayoutTableElementInstance, LayoutTextElement } from '@report/core';

export class XlsxExporter implements ReportExporter {
  public readonly format = 'xlsx';

  async export(renderedDoc: RenderedDocument, _options?: ExportOptions): Promise<Uint8Array> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'NextReport Engine';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(renderedDoc.reportName.substring(0, 31) || 'Report');

    let currentRowIdx = 1;

    for (const page of renderedDoc.pages) {
      const sortedElements = [...page.elements].sort((a, b) => a.yPt - b.yPt);

      for (const el of sortedElements) {
        if (el.type === 'text') {
          const textEl = el as LayoutTextElement;
          const style = textEl.style || {};
          const row = sheet.getRow(currentRowIdx);
          const cell = row.getCell(1);

          cell.value = textEl.text;
          cell.font = {
            name: style.fontFamily || 'Arial',
            size: style.fontSize || 11,
            bold: style.fontWeight === 'bold' || Number(style.fontWeight) >= 700,
            italic: style.fontStyle === 'italic',
            color: style.color ? { argb: 'FF' + style.color.replace('#', '') } : undefined
          };

          if (style.backgroundColor && style.backgroundColor !== 'transparent') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF' + style.backgroundColor.replace('#', '') }
            };
          }

          cell.alignment = {
            horizontal: style.textAlign === 'right' || textEl.direction === 'rtl' ? 'right' : style.textAlign === 'center' ? 'center' : 'left',
            vertical: 'middle'
          };

          currentRowIdx++;
        } else if (el.type === 'table') {
          const tableEl = el as LayoutTableElementInstance;
          const table = tableEl.table;
          const allRows = [...table.headerRows, ...table.bodyRows, ...table.footerRows];

          for (const tRow of allRows) {
            const excelRow = sheet.getRow(currentRowIdx);
            let colIdx = 1;

            for (const tCell of tRow.cells) {
              const style = tCell.style || {};
              const cell = excelRow.getCell(colIdx);
              const numVal = Number(tCell.text);

              if (tCell.text && !isNaN(numVal) && !tCell.text.startsWith('0') && tCell.text.trim().length > 0) {
                cell.value = numVal;
              } else {
                cell.value = tCell.text;
              }

              cell.font = {
                name: style.fontFamily || 'Arial',
                size: style.fontSize || 10,
                bold: style.fontWeight === 'bold' || tRow.isHeader || Number(style.fontWeight) >= 700,
                italic: style.fontStyle === 'italic',
                color: style.color ? { argb: 'FF' + style.color.replace('#', '') } : undefined
              };

              if (style.backgroundColor && style.backgroundColor !== 'transparent') {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: 'FF' + style.backgroundColor.replace('#', '') }
                };
              }

              cell.border = {
                top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
              };

              cell.alignment = {
                horizontal: style.textAlign === 'right' || tCell.direction === 'rtl' ? 'right' : style.textAlign === 'center' ? 'center' : 'left',
                vertical: 'middle'
              };

              colIdx += tCell.colSpan || 1;
            }

            currentRowIdx++;
          }

          currentRowIdx++; // blank line after table
        }
      }
    }

    // Auto-fit column widths
    sheet.columns.forEach(column => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: true }, cell => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = Math.min(len + 4, 40);
      });
      column.width = maxLen;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Uint8Array(buffer as ArrayBuffer);
  }
}

const xlsxExporter = new XlsxExporter();
registerExporter(xlsxExporter);
