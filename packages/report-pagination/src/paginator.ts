import type { ReportDefinition, SectionDefinition } from '@report/schema';
import { unitToPt } from '@report/schema';
import { resolvePathValue, type ReportDataContext } from '@report/data';
import {
  layoutElement,
  toPtInsets,
  type LayoutElement,
  type LayoutTableElementInstance,
  type LayoutTableRow,
  type LayoutTable
} from '@report/layout';
import { interpolateTemplate } from '@report/expression';
import type { RenderedDocument, RenderedPage } from './page-model.js';

export function paginateReport(
  report: ReportDefinition,
  context: ReportDataContext
): RenderedDocument {
  const unit = report.page.unit;
  const isLandscape = report.page.orientation === 'landscape';
  const rawWidth = isLandscape ? Math.max(report.page.width, report.page.height) : report.page.width;
  const rawHeight = isLandscape ? Math.min(report.page.width, report.page.height) : report.page.height;

  const pageWidthPt = unitToPt(rawWidth, unit);
  const pageHeightPt = unitToPt(rawHeight, unit);
  const marginsPt = toPtInsets(report.page.margins, unit);
  const pageDirection = report.page.direction || 'ltr';

  const printableWidthPt = pageWidthPt - (marginsPt.left + marginsPt.right);
  const printableHeightPt = pageHeightPt - (marginsPt.top + marginsPt.bottom);

  // Group sections by role
  const pageHeaderSec = report.sections.find(s => s.type === 'pageHeader');
  const pageFooterSec = report.sections.find(s => s.type === 'pageFooter');
  const reportHeaderSec = report.sections.find(s => s.type === 'reportHeader');
  const reportFooterSec = report.sections.find(s => s.type === 'reportFooter');
  const bodySections = report.sections.filter(
    s => s.type === 'detail' || s.type === 'groupHeader' || s.type === 'groupFooter'
  );

  const pageHeaderHeightPt = pageHeaderSec ? unitToPt(pageHeaderSec.height, unit) : 0;
  const pageFooterHeightPt = pageFooterSec ? unitToPt(pageFooterSec.height, unit) : 0;

  const pages: RenderedPage[] = [];

  function createNewPage(pageNum: number): RenderedPage {
    const pageElements: LayoutElement[] = [];

    // Add Page Header if defined
    if (pageHeaderSec) {
      for (const elem of pageHeaderSec.elements) {
        const laid = layoutElement(elem, unit, context, pageDirection);
        if (laid) {
          pageElements.push({
            ...laid,
            xPt: laid.xPt,
            yPt: marginsPt.top + laid.yPt
          });
        }
      }
    }

    return {
      pageNumber: pageNum,
      totalPages: 1, // updated in pass 2
      widthPt: pageWidthPt,
      heightPt: pageHeightPt,
      marginsPt,
      printableWidthPt,
      printableHeightPt,
      direction: pageDirection,
      elements: pageElements
    };
  }

  let currentPage = createNewPage(1);
  pages.push(currentPage);

  // Body cursor Y relative to printable top + pageHeaderHeight
  let currentBodyYPt = marginsPt.top + pageHeaderHeightPt;
  const bodyMaxYPt = pageHeightPt - marginsPt.bottom - pageFooterHeightPt;

  // Helper to ensure space or advance page
  function ensureVerticalSpace(neededHeightPt: number): void {
    if (currentBodyYPt + neededHeightPt > bodyMaxYPt && currentBodyYPt > (marginsPt.top + pageHeaderHeightPt + 1)) {
      currentPage = createNewPage(pages.length + 1);
      pages.push(currentPage);
      currentBodyYPt = marginsPt.top + pageHeaderHeightPt;
    }
  }

  // 1. Render Report Header (First page only)
  if (reportHeaderSec) {
    const rpHdrHeightPt = unitToPt(reportHeaderSec.height, unit);
    ensureVerticalSpace(rpHdrHeightPt);
    for (const elem of reportHeaderSec.elements) {
      const laid = layoutElement(elem, unit, context, pageDirection);
      if (laid) {
        currentPage.elements.push({
          ...laid,
          xPt: laid.xPt,
          yPt: currentBodyYPt + laid.yPt
        });
      }
    }
    currentBodyYPt += rpHdrHeightPt;
  }

  // 2. Render Body Sections (Detail, GroupHeader, GroupFooter)
  // If report has top-level elements without sections, wrap them into a synthetic detail
  const effectiveSections: SectionDefinition[] =
    bodySections.length > 0
      ? bodySections
      : report.elements && report.elements.length > 0
      ? [{ id: 'sec-synth-detail', type: 'detail', name: 'Detail', height: report.page.height, elements: report.elements }]
      : [];

  for (const section of effectiveSections) {
    if (section.pageBreakBefore && currentBodyYPt > marginsPt.top + pageHeaderHeightPt) {
      currentPage = createNewPage(pages.length + 1);
      pages.push(currentPage);
      currentBodyYPt = marginsPt.top + pageHeaderHeightPt;
    }

    const sectionHeightPt = unitToPt(section.height, unit);
    const tableElements = section.elements.filter(e => e.type === 'table');

    if (tableElements.length === 0) {
      // Check if this section should repeat for each record in an array (e.g. detail band)
      const isRepeatingDetail =
        section.type === 'detail' &&
        (Boolean(section.dataSource) || Boolean(section.repeatForEachRecord));

      if (isRepeatingDetail) {
        let records: any[] | null = null;
        if (section.dataSource) {
          const val = resolvePathValue(context.data, section.dataSource);
          if (Array.isArray(val)) records = val;
        } else if (Array.isArray(context.data)) {
          records = context.data;
        } else if (section.repeatForEachRecord) {
          if (Array.isArray(context.data?.items)) records = context.data.items;
          else if (Array.isArray(context.data?.data)) records = context.data.data;
          else if (Array.isArray(context.data?.rows)) records = context.data.rows;
        }

        if (records && records.length > 0) {
          for (let recordIdx = 0; recordIdx < records.length; recordIdx++) {
            const record = records[recordIdx];
            const recordContext: ReportDataContext = {
              ...context,
              data: {
                ...(typeof context.data === 'object' && context.data !== null && !Array.isArray(context.data) ? context.data : {}),
                ...(typeof record === 'object' && record !== null ? record : {}),
                item: record,
                row: record,
                index: recordIdx,
                _index: recordIdx
              }
            };

            ensureVerticalSpace(Math.min(sectionHeightPt, bodyMaxYPt - (marginsPt.top + pageHeaderHeightPt)));
            const sectionStartYPt = currentBodyYPt;
            let maxElemExtentPt = sectionHeightPt;

            for (const element of section.elements) {
              const laid = layoutElement(element, unit, recordContext, pageDirection);
              if (!laid) continue;

              currentPage.elements.push({
                ...laid,
                xPt: laid.xPt,
                yPt: sectionStartYPt + laid.yPt
              });

              const elemBottom = laid.yPt + laid.heightPt;
              if (elemBottom > maxElemExtentPt) {
                maxElemExtentPt = elemBottom;
              }
            }

            currentBodyYPt = sectionStartYPt + maxElemExtentPt;
          }
          continue;
        } else if (records && records.length === 0) {
          // Empty records array - nothing to render for repeating detail section
          continue;
        }
      }

      // Standard section with absolute positioned non-table elements
      const pagePrintableTopPt = marginsPt.top + pageHeaderHeightPt;
      const pagePrintableHeightPt = Math.max(50, bodyMaxYPt - pagePrintableTopPt);

      // If the section doesn't fit on the current page, but would fit on a fresh new page:
      if (
        sectionHeightPt <= pagePrintableHeightPt &&
        currentBodyYPt + sectionHeightPt > bodyMaxYPt &&
        currentBodyYPt > pagePrintableTopPt + 1
      ) {
        currentPage = createNewPage(pages.length + 1);
        pages.push(currentPage);
        currentBodyYPt = pagePrintableTopPt;
      }

      const startPageIdx = pages.length - 1;
      const sectionStartYPt = currentBodyYPt;
      const spaceOnFirstPagePt = Math.max(0, bodyMaxYPt - sectionStartYPt);

      // Sort elements by designer Y coordinate so they are processed in top-down order
      const sortedElements = [...section.elements].sort((a, b) => a.y - b.y);

      for (const element of sortedElements) {
        const laid = layoutElement(element, unit, context, pageDirection);
        if (!laid) continue;

        const elemTopYPt = laid.yPt;
        const elemHeightPt = laid.heightPt;

        // Check if element fits on the starting page
        if (elemTopYPt + elemHeightPt <= spaceOnFirstPagePt) {
          // Fits on first page
          pages[startPageIdx]!.elements.push({
            ...laid,
            xPt: laid.xPt,
            yPt: sectionStartYPt + elemTopYPt
          });
        } else {
          // Overflow onto Page 2 or subsequent pages
          const remainingOffsetPt = elemTopYPt - spaceOnFirstPagePt;
          const clampedOffsetPt = Math.max(0, remainingOffsetPt);
          const pagesBeyond = 1 + Math.floor(clampedOffsetPt / pagePrintableHeightPt);
          const offsetOnTargetPagePt = clampedOffsetPt % pagePrintableHeightPt;

          const targetPageIdx = startPageIdx + pagesBeyond;
          while (pages.length <= targetPageIdx) {
            currentPage = createNewPage(pages.length + 1);
            pages.push(currentPage);
          }

          const targetPage = pages[targetPageIdx]!;
          targetPage.elements.push({
            ...laid,
            xPt: laid.xPt,
            yPt: pagePrintableTopPt + offsetOnTargetPagePt
          });
        }
      }

      // Update currentPage and currentBodyYPt to the last page and its maximum element bottom
      currentPage = pages[pages.length - 1]!;
      if (pages.length - 1 === startPageIdx) {
        let maxBottomPt = sectionHeightPt;
        for (const elem of sortedElements) {
          const laid = layoutElement(elem, unit, context, pageDirection);
          if (laid) {
            const b = laid.yPt + laid.heightPt;
            if (b > maxBottomPt) maxBottomPt = b;
          }
        }
        currentBodyYPt = sectionStartYPt + maxBottomPt;
      } else {
        let maxBottomPt = pagePrintableTopPt;
        for (const elem of sortedElements) {
          const laid = layoutElement(elem, unit, context, pageDirection);
          if (laid) {
            const b = laid.yPt + laid.heightPt;
            if (b > maxBottomPt) maxBottomPt = b;
          }
        }
        currentBodyYPt = maxBottomPt + 5;
      }
    } else {
      // Section contains table(s) and potentially other elements
      const sectionStartPageIdx = pages.length - 1;
      const pagePrintableTopPt = marginsPt.top + pageHeaderHeightPt;
      const sectionStartYPt = currentBodyYPt;
      const nonTableElements = section.elements.filter(e => e.type !== 'table');

      // Separate non-table elements into pre-table and post-table based on designer Y coordinate
      const firstTable = tableElements[0]!;
      const tableTopMm = firstTable.y;
      const tableHeightMm = firstTable.height || 25;
      const tableBottomMm = tableTopMm + tableHeightMm;

      // Elements placed before or alongside the table in the designer
      const preTableElements = nonTableElements.filter(e => e.y < tableBottomMm);
      // Elements placed strictly below the table in the designer
      const postTableElements = nonTableElements.filter(e => e.y >= tableBottomMm);

      let maxPreTableExtentPt = 0;

      // 1. Layout elements positioned before or alongside tables (exact designer coordinates)
      for (const element of preTableElements) {
        const laid = layoutElement(element, unit, context, pageDirection);
        if (!laid) continue;

        currentPage.elements.push({
          ...laid,
          xPt: laid.xPt,
          yPt: sectionStartYPt + laid.yPt
        });

        const b = laid.yPt + laid.heightPt;
        if (b > maxPreTableExtentPt) {
          maxPreTableExtentPt = b;
        }
      }

      // 2. Layout and paginate tables
      for (const tableElement of tableElements) {
        const laid = layoutElement(tableElement, unit, context, pageDirection) as LayoutTableElementInstance;
        if (!laid) continue;

        const table = laid.table;
        const headerRowsHeightPt = table.headerRows.reduce((a, b) => a + b.heightPt, 0);
        const footerRowsHeightPt = table.footerRows.reduce((a, b) => a + b.heightPt, 0);

        // Advance cursor to table start based on table's designer Y offset
        if (laid.yPt > 0) {
          currentBodyYPt = sectionStartYPt + laid.yPt;
        }

        let bodyRowIdx = 0;
        const totalBodyRows = table.bodyRows.length;

        while (bodyRowIdx < totalBodyRows || totalBodyRows === 0) {
          const isFirstChunk = bodyRowIdx === 0;
          const includeHeaders = isFirstChunk || table.repeatHeaderOnEveryPage;
          const chunkHeaderHeight = includeHeaders ? headerRowsHeightPt : 0;

          // Check if we have at least room for header + 1 row
          const firstRowHeight = totalBodyRows > 0 ? table.bodyRows[bodyRowIdx]?.heightPt || 20 : 20;
          ensureVerticalSpace(chunkHeaderHeight + firstRowHeight);

          const startTableY = currentBodyYPt;
          let tableChunkY = currentBodyYPt;

          // Add header rows to current page
          const chunkHeaderRows: LayoutTableRow[] = [];
          if (includeHeaders) {
            for (const hRow of table.headerRows) {
              const rowY = tableChunkY;
              const remappedCells = hRow.cells.map(c => ({
                ...c,
                xPt: laid.xPt + c.xPt,
                yPt: rowY
              }));
              chunkHeaderRows.push({
                ...hRow,
                yPt: rowY,
                cells: remappedCells
              });
              tableChunkY += hRow.heightPt;
            }
          }

          // Add body rows that fit on this page
          const chunkBodyRows: LayoutTableRow[] = [];
          while (bodyRowIdx < totalBodyRows) {
            const bRow = table.bodyRows[bodyRowIdx]!;
            const isLastRow = bodyRowIdx === totalBodyRows - 1;
            const extraFooterNeeded = isLastRow ? footerRowsHeightPt : 0;

            if (tableChunkY + bRow.heightPt + extraFooterNeeded > bodyMaxYPt && chunkBodyRows.length > 0) {
              // Row does not fit, break page
              break;
            }

            const rowY = tableChunkY;
            const remappedCells = bRow.cells.map(c => ({
              ...c,
              xPt: laid.xPt + c.xPt,
              yPt: rowY
            }));

            chunkBodyRows.push({
              ...bRow,
              yPt: rowY,
              cells: remappedCells
            });

            tableChunkY += bRow.heightPt;
            bodyRowIdx++;
          }

          // If we reached the end of the body rows, append footer rows
          const chunkFooterRows: LayoutTableRow[] = [];
          if (bodyRowIdx >= totalBodyRows) {
            for (const fRow of table.footerRows) {
              const rowY = tableChunkY;
              const remappedCells = fRow.cells.map(c => ({
                ...c,
                xPt: laid.xPt + c.xPt,
                yPt: rowY
              }));
              chunkFooterRows.push({
                ...fRow,
                yPt: rowY,
                cells: remappedCells
              });
              tableChunkY += fRow.heightPt;
            }
          }

          // Construct the chunk table instance for this page
          const chunkTable: LayoutTable = {
            id: `${table.id}_page${currentPage.pageNumber}`,
            xPt: laid.xPt,
            yPt: startTableY,
            widthPt: table.widthPt,
            heightPt: tableChunkY - startTableY,
            headerRows: chunkHeaderRows,
            bodyRows: chunkBodyRows,
            footerRows: chunkFooterRows,
            repeatHeaderOnEveryPage: table.repeatHeaderOnEveryPage,
            keepTogether: table.keepTogether
          };

          currentPage.elements.push({
            ...laid,
            xPt: laid.xPt,
            yPt: startTableY,
            table: chunkTable
          });

          currentBodyYPt = tableChunkY + 5; // 5pt gap after table

          if (bodyRowIdx < totalBodyRows) {
            // Advance to next page for the remaining rows
            currentPage = createNewPage(pages.length + 1);
            pages.push(currentPage);
            currentBodyYPt = marginsPt.top + pageHeaderHeightPt;
          } else {
            break;
          }
        }
      }

      // 3. Layout elements positioned after tables (e.g. totals, signatures, notes)
      const tableFinishYPt = currentBodyYPt;
      let maxPostTableBottomPt = tableFinishYPt;

      for (const element of postTableElements) {
        const laid = layoutElement(element, unit, context, pageDirection);
        if (!laid) continue;

        const offsetBelowTablePt = Math.max(0, unitToPt(element.y - tableBottomMm, unit));
        let targetYPt = tableFinishYPt + offsetBelowTablePt;

        if (targetYPt + laid.heightPt > bodyMaxYPt && tableFinishYPt > pagePrintableTopPt + 1) {
          currentPage = createNewPage(pages.length + 1);
          pages.push(currentPage);
          targetYPt = pagePrintableTopPt + offsetBelowTablePt;
        }

        currentPage.elements.push({
          ...laid,
          xPt: laid.xPt,
          yPt: targetYPt
        });

        const elemBottom = targetYPt + laid.heightPt;
        if (elemBottom > maxPostTableBottomPt) {
          maxPostTableBottomPt = elemBottom;
        }
      }

      // Set the final cursor for subsequent sections (ensuring section.height is honored if on starting page)
      const minSectionBottomPt = pages.length - 1 === sectionStartPageIdx ? sectionStartYPt + sectionHeightPt : 0;
      currentBodyYPt = Math.max(maxPostTableBottomPt, sectionStartYPt + maxPreTableExtentPt, minSectionBottomPt);
    }

    if (section.pageBreakAfter) {
      currentPage = createNewPage(pages.length + 1);
      pages.push(currentPage);
      currentBodyYPt = marginsPt.top + pageHeaderHeightPt;
    }
  }

  // 3. Render Report Footer (Appended to last page or new page if full)
  if (reportFooterSec) {
    const rpFtrHeightPt = unitToPt(reportFooterSec.height, unit);
    ensureVerticalSpace(rpFtrHeightPt);
    for (const elem of reportFooterSec.elements) {
      const laid = layoutElement(elem, unit, context, pageDirection);
      if (laid) {
        currentPage.elements.push({
          ...laid,
          xPt: laid.xPt,
          yPt: currentBodyYPt + laid.yPt
        });
      }
    }
    currentBodyYPt += rpFtrHeightPt;
  }

  // 4. Render Page Footer on every page (Anchored to bottom margin)
  if (pageFooterSec) {
    const footerTopYPt = pageHeightPt - marginsPt.bottom - pageFooterHeightPt;
    for (const page of pages) {
      for (const elem of pageFooterSec.elements) {
        const laid = layoutElement(elem, unit, context, pageDirection);
        if (laid) {
          page.elements.push({
            ...laid,
            xPt: laid.xPt,
            yPt: footerTopYPt + laid.yPt
          });
        }
      }
    }
  }

  // 5. Pass 2: Update Total Pages and interpolate pageNumber / totalPages in text elements
  const totalPages = pages.length;
  for (const page of pages) {
    page.totalPages = totalPages;
    const pageContext = {
      ...context.data,
      ...context.parameters,
      ...context.variables,
      pageNumber: page.pageNumber,
      totalPages
    };

    for (const elem of page.elements) {
      if (elem.type === 'text') {
        const textElem = elem as any;
        if (textElem.text && (textElem.text.includes('pageNumber') || textElem.text.includes('totalPages'))) {
          textElem.text = interpolateTemplate(textElem.text, pageContext);
          textElem.lines = [textElem.text];
        }
      }
    }
  }

  return {
    reportName: report.name,
    version: report.version,
    totalPages,
    pages
  };
}
