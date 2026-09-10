import type { TableElement, Unit, TextDirection } from '@report/schema';
import { unitToPt } from '@report/schema';
import { interpolateTemplate } from '@report/expression';
import { resolvePathValue, type ReportDataContext } from '@report/data';
import { resolveBorders, type ResolvedBorders } from './borders.js';
import { measureAndWrapText } from './metrics.js';

export interface LayoutTableCell {
  id: string;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  text: string;
  lines: string[];
  style: any;
  borders: ResolvedBorders;
  colSpan: number;
  rowSpan: number;
  direction?: TextDirection;
}

export interface LayoutTableRow {
  id: string;
  yPt: number;
  heightPt: number;
  cells: LayoutTableCell[];
  isHeader?: boolean;
  isFooter?: boolean;
  itemData?: any;
}

export interface LayoutTable {
  id: string;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  headerRows: LayoutTableRow[];
  bodyRows: LayoutTableRow[];
  footerRows: LayoutTableRow[];
  repeatHeaderOnEveryPage: boolean;
  keepTogether: boolean;
}

export function layoutTable(
  table: TableElement,
  unit: Unit,
  context: ReportDataContext,
  pageDirection: TextDirection = 'ltr'
): LayoutTable {
  const tableXPt = unitToPt(table.x, unit);
  const tableYPt = unitToPt(table.y, unit);
  const isRtl = (table.style?.direction || pageDirection) === 'rtl';

  // Calculate column widths in pt
  const colWidthsPt = table.columns.map(c => unitToPt(c.width, unit));
  const totalCols = colWidthsPt.length;

  // 1. Resolve header rows
  let currentYPt = 0;
  const layoutHeaderRows: LayoutTableRow[] = [];

  for (const row of table.headerRows || []) {
    const rowHeightPt = unitToPt(row.height, unit);
    const cells: LayoutTableCell[] = [];
    let colIndex = 0;

    for (let cIdx = 0; cIdx < row.cells.length && colIndex < totalCols; cIdx++) {
      const cell = row.cells[cIdx]!;
      const colSpan = Math.min(cell.colSpan || 1, totalCols - colIndex);

      // Compute cell width summing spanned columns
      let cellWidthPt = 0;
      for (let s = 0; s < colSpan; s++) {
        cellWidthPt += colWidthsPt[colIndex + s] || 0;
      }

      // Compute cell X relative to table origin
      let cellXPt = 0;
      if (!isRtl) {
        for (let s = 0; s < colIndex; s++) {
          cellXPt += colWidthsPt[s] || 0;
        }
      } else {
        // In RTL, col 0 is on the far right
        for (let s = colIndex + colSpan; s < totalCols; s++) {
          cellXPt += colWidthsPt[s] || 0;
        }
      }

      const rawText = cell.text || '';
      const text = interpolateTemplate(rawText, { ...context.data, ...context.parameters, ...context.variables });
      const cellStyle = { ...table.style, ...cell.style };
      const fontSizePt = cellStyle.fontSize || 10;
      const borders = resolveBorders(cellStyle.borders, unit);

      const wrapped = measureAndWrapText(String(text ?? ''), {
        fontSizePt,
        fontFamily: cellStyle.fontFamily,
        fontWeight: cellStyle.fontWeight,
        maxWidthPt: cellWidthPt - (unitToPt(cellStyle.padding?.left || 2, unit) + unitToPt(cellStyle.padding?.right || 2, unit))
      });

      cells.push({
        id: cell.id,
        xPt: cellXPt,
        yPt: currentYPt,
        widthPt: cellWidthPt,
        heightPt: rowHeightPt,
        text: String(text ?? ''),
        lines: wrapped.lines,
        style: cellStyle,
        borders,
        colSpan,
        rowSpan: cell.rowSpan || 1,
        direction: cellStyle.direction || (isRtl ? 'rtl' : 'ltr')
      });

      colIndex += colSpan;
    }

    layoutHeaderRows.push({
      id: row.id,
      yPt: currentYPt,
      heightPt: rowHeightPt,
      cells,
      isHeader: true
    });

    currentYPt += rowHeightPt;
  }

  // 2. Resolve body rows (repeating for bound data items or literal rows)
  const layoutBodyRows: LayoutTableRow[] = [];
  let items: any[] = [{}];

  if (table.dataSource) {
    const rawVal = resolvePathValue(context.data, table.dataSource);
    if (Array.isArray(rawVal)) {
      items = rawVal;
    } else if (rawVal !== undefined && rawVal !== null) {
      items = [rawVal];
    } else {
      items = [];
    }
  } else if (context.data) {
    // If table has no explicit dataSource, check if context.data is directly an array
    // or has standard array aliases (data, items, rows)
    if (Array.isArray(context.data)) {
      items = context.data;
    } else if (Array.isArray(context.data.items)) {
      items = context.data.items;
    } else if (Array.isArray(context.data.data)) {
      items = context.data.data;
    } else if (Array.isArray(context.data.rows)) {
      items = context.data.rows;
    }
  }

  for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
    const item = items[itemIdx];
    const itemContext = {
      ...(typeof context.data === 'object' && context.data !== null && !Array.isArray(context.data) ? context.data : {}),
      ...context.parameters,
      ...context.variables,
      ...(typeof item === 'object' && item !== null ? item : {}),
      item,
      row: item,
      index: itemIdx,
      _index: itemIdx,
      data: context.data
    };

    for (const templateRow of table.bodyRows || []) {
      const rowHeightPt = unitToPt(templateRow.height, unit);
      const cells: LayoutTableCell[] = [];
      let colIndex = 0;

      for (let cIdx = 0; cIdx < templateRow.cells.length && colIndex < totalCols; cIdx++) {
        const cell = templateRow.cells[cIdx]!;
        const colSpan = Math.min(cell.colSpan || 1, totalCols - colIndex);

        let cellWidthPt = 0;
        for (let s = 0; s < colSpan; s++) {
          cellWidthPt += colWidthsPt[colIndex + s] || 0;
        }

        let cellXPt = 0;
        if (!isRtl) {
          for (let s = 0; s < colIndex; s++) {
            cellXPt += colWidthsPt[s] || 0;
          }
        } else {
          for (let s = colIndex + colSpan; s < totalCols; s++) {
            cellXPt += colWidthsPt[s] || 0;
          }
        }

        const rawText = cell.text || '';
        const evaluatedText = interpolateTemplate(rawText, itemContext);
        const cellStyle = { ...table.style, ...cell.style };
        const fontSizePt = cellStyle.fontSize || 10;
        const borders = resolveBorders(cellStyle.borders, unit);

        const wrapped = measureAndWrapText(String(evaluatedText ?? ''), {
          fontSizePt,
          fontFamily: cellStyle.fontFamily,
          fontWeight: cellStyle.fontWeight,
          maxWidthPt: cellWidthPt - (unitToPt(cellStyle.padding?.left || 2, unit) + unitToPt(cellStyle.padding?.right || 2, unit))
        });

        cells.push({
          id: `${cell.id}_${itemIdx}`,
          xPt: cellXPt,
          yPt: currentYPt,
          widthPt: cellWidthPt,
          heightPt: rowHeightPt,
          text: String(evaluatedText ?? ''),
          lines: wrapped.lines,
          style: cellStyle,
          borders,
          colSpan,
          rowSpan: cell.rowSpan || 1,
          direction: cellStyle.direction || (isRtl ? 'rtl' : 'ltr')
        });

        colIndex += colSpan;
      }

      layoutBodyRows.push({
        id: `${templateRow.id}_${itemIdx}`,
        yPt: currentYPt,
        heightPt: rowHeightPt,
        cells,
        isHeader: false,
        itemData: item
      });

      currentYPt += rowHeightPt;
    }
  }

  // 3. Resolve footer rows
  const layoutFooterRows: LayoutTableRow[] = [];
  for (const row of table.footerRows || []) {
    const rowHeightPt = unitToPt(row.height, unit);
    const cells: LayoutTableCell[] = [];
    let colIndex = 0;

    for (let cIdx = 0; cIdx < row.cells.length && colIndex < totalCols; cIdx++) {
      const cell = row.cells[cIdx]!;
      const colSpan = Math.min(cell.colSpan || 1, totalCols - colIndex);

      let cellWidthPt = 0;
      for (let s = 0; s < colSpan; s++) {
        cellWidthPt += colWidthsPt[colIndex + s] || 0;
      }

      let cellXPt = 0;
      if (!isRtl) {
        for (let s = 0; s < colIndex; s++) {
          cellXPt += colWidthsPt[s] || 0;
        }
      } else {
        for (let s = colIndex + colSpan; s < totalCols; s++) {
          cellXPt += colWidthsPt[s] || 0;
        }
      }

      const rawText = cell.text || '';
      const evaluatedText = interpolateTemplate(rawText, {
        ...context.data,
        ...context.parameters,
        ...context.variables,
        [table.dataSource || 'items']: items
      });
      const cellStyle = { ...table.style, ...cell.style };
      const fontSizePt = cellStyle.fontSize || 10;
      const borders = resolveBorders(cellStyle.borders, unit);

      const wrapped = measureAndWrapText(String(evaluatedText ?? ''), {
        fontSizePt,
        fontFamily: cellStyle.fontFamily,
        fontWeight: cellStyle.fontWeight,
        maxWidthPt: cellWidthPt - (unitToPt(cellStyle.padding?.left || 2, unit) + unitToPt(cellStyle.padding?.right || 2, unit))
      });

      cells.push({
        id: row.id + '_' + cell.id,
        xPt: cellXPt,
        yPt: currentYPt,
        widthPt: cellWidthPt,
        heightPt: rowHeightPt,
        text: String(evaluatedText ?? ''),
        lines: wrapped.lines,
        style: cellStyle,
        borders,
        colSpan,
        rowSpan: cell.rowSpan || 1,
        direction: cellStyle.direction || (isRtl ? 'rtl' : 'ltr')
      });

      colIndex += colSpan;
    }

    layoutFooterRows.push({
      id: row.id,
      yPt: currentYPt,
      heightPt: rowHeightPt,
      cells,
      isFooter: true
    });

    currentYPt += rowHeightPt;
  }

  const totalWidthPt = colWidthsPt.reduce((a, b) => a + b, 0);

  return {
    id: table.id,
    xPt: tableXPt,
    yPt: tableYPt,
    widthPt: totalWidthPt,
    heightPt: currentYPt,
    headerRows: layoutHeaderRows,
    bodyRows: layoutBodyRows,
    footerRows: layoutFooterRows,
    repeatHeaderOnEveryPage: table.repeatHeaderOnEveryPage ?? true,
    keepTogether: table.keepTogether ?? false
  };
}
