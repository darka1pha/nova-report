import { describe, it, expect } from 'vitest';
import {
  renderReport,
  exportReport,
  getPaperDimensions,
  detectPaperSize,
  PAPER_SIZES,
  type ReportDefinition
} from '../packages/report-engine/src/index.js';
import defaultInvoice from '../templates/invoice.report.json';

describe('Paper Size Presets & Multi-Page Pagination Flow', () => {
  it('correctly calculates dimensions and detects standard paper sizes', () => {
    // A4
    const a4Port = getPaperDimensions('A4', 'portrait', 'mm');
    expect(a4Port.width).toBe(210);
    expect(a4Port.height).toBe(297);
    expect(detectPaperSize(210, 297, 'mm')).toBe('A4');

    const a4Land = getPaperDimensions('A4', 'landscape', 'mm');
    expect(a4Land.width).toBe(297);
    expect(a4Land.height).toBe(210);
    expect(detectPaperSize(297, 210, 'mm')).toBe('A4');

    // A3
    const a3Port = getPaperDimensions('A3', 'portrait', 'mm');
    expect(a3Port.width).toBe(297);
    expect(a3Port.height).toBe(420);
    expect(detectPaperSize(297, 420, 'mm')).toBe('A3');

    // A5
    const a5Port = getPaperDimensions('A5', 'portrait', 'mm');
    expect(a5Port.width).toBe(148);
    expect(a5Port.height).toBe(210);
    expect(detectPaperSize(148, 210, 'mm')).toBe('A5');

    // Letter
    const letterPort = getPaperDimensions('Letter', 'portrait', 'mm');
    expect(letterPort.width).toBeCloseTo(215.9, 1);
    expect(letterPort.height).toBeCloseTo(279.4, 1);
    expect(detectPaperSize(215.9, 279.4, 'mm')).toBe('Letter');

    // Legal
    const legalPort = getPaperDimensions('Legal', 'portrait', 'mm');
    expect(legalPort.width).toBeCloseTo(215.9, 1);
    expect(legalPort.height).toBeCloseTo(355.6, 1);
    expect(detectPaperSize(215.9, 355.6, 'mm')).toBe('Legal');
  });

  it('automatically creates Page 2 when elements in a section exceed printable page height', async () => {
    // A4 portrait: 210mm x 297mm.
    // Margins: 15mm top, 15mm bottom.
    // Page Header: 25mm, Page Footer: 15mm.
    // Printable body space on Page 1: 297 - 15 - 15 - 25 - 15 = 227mm.
    const report: ReportDefinition = {
      id: 'rep-overflow-test',
      name: 'Overflow Test',
      version: '1.0',
      page: {
        width: 210,
        height: 297,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-hdr',
          type: 'pageHeader',
          height: 25,
          elements: [
            {
              id: 'hdr-title',
              type: 'text',
              x: 10,
              y: 5,
              width: 100,
              height: 10,
              text: 'Page Header Title (Page {{pageNumber}} of {{totalPages}})'
            }
          ]
        },
        {
          id: 'sec-detail',
          type: 'detail',
          height: 350, // Exceeds single page printable height (227mm)
          elements: [
            {
              id: 'elem-page1-top',
              type: 'text',
              x: 10,
              y: 20,
              width: 100,
              height: 15,
              text: 'Element on Page 1 (Top)'
            },
            {
              id: 'elem-page1-mid',
              type: 'text',
              x: 10,
              y: 150,
              width: 100,
              height: 15,
              text: 'Element on Page 1 (Middle)'
            },
            {
              id: 'elem-page2-bottom',
              type: 'text',
              x: 10,
              y: 260, // 260mm > 227mm printable height -> MUST flow onto Page 2!
              width: 120,
              height: 20,
              text: 'Element Placed At Bottom (Should be on Page 2)'
            }
          ]
        },
        {
          id: 'sec-ftr',
          type: 'pageFooter',
          height: 15,
          elements: [
            {
              id: 'ftr-text',
              type: 'text',
              x: 10,
              y: 2,
              width: 100,
              height: 10,
              text: 'Page Footer - Page {{pageNumber}}'
            }
          ]
        }
      ]
    };

    const doc = await renderReport({ report });

    // Must have generated 2 pages
    expect(doc.totalPages).toBe(2);
    expect(doc.pages.length).toBe(2);

    const page1 = doc.pages[0]!;
    const page2 = doc.pages[1]!;

    expect(page1.pageNumber).toBe(1);
    expect(page2.pageNumber).toBe(2);

    // Page 1 should contain elem-page1-top and elem-page1-mid, but NOT elem-page2-bottom
    const p1Texts = page1.elements.filter(e => e.type === 'text') as any[];
    expect(p1Texts.some(e => e.id === 'elem-page1-top')).toBe(true);
    expect(p1Texts.some(e => e.id === 'elem-page1-mid')).toBe(true);
    expect(p1Texts.some(e => e.id === 'elem-page2-bottom')).toBe(false);

    // Page 2 must contain elem-page2-bottom!
    const p2Texts = page2.elements.filter(e => e.type === 'text') as any[];
    const overflowElem = p2Texts.find(e => e.id === 'elem-page2-bottom');
    expect(overflowElem).toBeDefined();
    expect(overflowElem.text).toBe('Element Placed At Bottom (Should be on Page 2)');

    // Overflow element on Page 2 must be within the printable body area (below header, above footer)
    // Page Header is 25mm + 15mm margin = 40mm = ~113.4pt
    expect(overflowElem.yPt).toBeGreaterThanOrEqual(100);
    // Must not exceed page 2 height minus bottom margin and footer
    expect(overflowElem.yPt + overflowElem.heightPt).toBeLessThan(page2.heightPt);

    // Both pages must have headers and footers
    expect(p1Texts.some(e => e.id === 'hdr-title')).toBe(true);
    expect(p2Texts.some(e => e.id === 'hdr-title')).toBe(true);
    expect(p1Texts.some(e => e.id === 'ftr-text')).toBe(true);
    expect(p2Texts.some(e => e.id === 'ftr-text')).toBe(true);
  });

  it('correctly places post-table elements (e.g. signature/notes) after expanding table onto Page 2', async () => {
    // Generate 40 rows to force table to paginate
    const items = Array.from({ length: 40 }, (_, i) => ({
      item: `Product Line Item #${i + 1}`,
      qty: 1,
      price: 100
    }));

    const report: ReportDefinition = {
      id: 'rep-table-pagination',
      name: 'Table Pagination Report',
      version: '1.0',
      page: {
        width: 210,
        height: 297,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          height: 120,
          elements: [
            {
              id: 'tbl-items',
              type: 'table',
              x: 10,
              y: 10,
              width: 170,
              height: 30,
              columns: [
                { id: 'c1', width: 100, headerText: 'Item' },
                { id: 'c2', width: 30, headerText: 'Qty' },
                { id: 'c3', width: 40, headerText: 'Price' }
              ],
              headerRows: [
                {
                  id: 'hr1',
                  height: 10,
                  isHeader: true,
                  cells: [
                    { id: 'hc1', text: 'Item' },
                    { id: 'hc2', text: 'Qty' },
                    { id: 'hc3', text: 'Price' }
                  ]
                }
              ],
              bodyRows: [
                {
                  id: 'br1',
                  height: 10,
                  cells: [
                    { id: 'bc1', text: '{{item}}' },
                    { id: 'bc2', text: '{{qty}}' },
                    { id: 'bc3', text: '${{price}}' }
                  ]
                }
              ]
            },
            {
              id: 'elem-signature',
              type: 'text',
              x: 10,
              y: 50, // Placed below table in designer
              width: 100,
              height: 15,
              text: 'Authorized Signature: ____________________'
            }
          ]
        }
      ]
    };

    const doc = await renderReport({
      report,
      data: items
    });

    // Should paginate to at least 2 pages
    expect(doc.totalPages).toBeGreaterThanOrEqual(2);

    const lastPage = doc.pages[doc.pages.length - 1]!;
    // The signature block MUST appear on the last page after the table!
    const sigElem = lastPage.elements.find(e => e.id === 'elem-signature') as any;
    expect(sigElem).toBeDefined();
    expect(sigElem.text).toBe('Authorized Signature: ____________________');

    // And it must not be clipped by the page bottom
    expect(sigElem.yPt + sigElem.heightPt).toBeLessThanOrEqual(lastPage.heightPt);
  });

  it('exports reports with A3 and A5 paper sizes to vector PDF with correct page dimensions', async () => {
    const reportA3: ReportDefinition = {
      id: 'rep-a3',
      name: 'A3 Blueprint Report',
      version: '1.0',
      page: {
        width: 297,
        height: 420,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        paperSize: 'A3'
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          height: 100,
          elements: [
            {
              id: 't1',
              type: 'text',
              x: 10,
              y: 10,
              width: 200,
              height: 20,
              text: 'A3 Large Format Document'
            }
          ]
        }
      ]
    };

    const pdfA3 = await exportReport({ report: reportA3, format: 'pdf' });
    expect(pdfA3).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(pdfA3.slice(0, 5))).toBe('%PDF-');

    const docA3 = await renderReport({ report: reportA3 });
    // A3 width in pt: 297mm = 841.89pt, height: 420mm = 1190.55pt
    expect(docA3.pages[0]!.widthPt).toBeCloseTo(841.89, 1);
    expect(docA3.pages[0]!.heightPt).toBeCloseTo(1190.55, 1);

    const reportA5: ReportDefinition = {
      id: 'rep-a5',
      name: 'A5 Booklet Report',
      version: '1.0',
      page: {
        width: 148,
        height: 210,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 10, right: 10, bottom: 10, left: 10 },
        paperSize: 'A5'
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          height: 80,
          elements: [
            {
              id: 't2',
              type: 'text',
              x: 5,
              y: 5,
              width: 100,
              height: 15,
              text: 'A5 Compact Booklet'
            }
          ]
        }
      ]
    };

    const docA5 = await renderReport({ report: reportA5 });
    // A5 width in pt: 148mm = 419.53pt, height: 210mm = 595.28pt
    expect(docA5.pages[0]!.widthPt).toBeCloseTo(419.53, 1);
    expect(docA5.pages[0]!.heightPt).toBeCloseTo(595.28, 1);
  });

  it('expanding section height with table honors expanded height so report footer fills the page', async () => {
    const invoice = JSON.parse(JSON.stringify(defaultInvoice));
    const detailSec = invoice.sections.find((s: any) => s.id === 'sec-detail');
    expect(detailSec).toBeDefined();

    // Initial render with default height 80mm
    const initialDoc = await renderReport({ report: invoice });
    expect(initialDoc.pages.length).toBe(1);
    const initialSubtotal = initialDoc.pages[0]!.elements.find(e => e.id === 'elem-subtotal-lbl')!;

    // Now expand detail section height from 80mm to 127mm (exactly filling the unallocated page body)
    detailSec.height = 127;
    const expandedDoc = await renderReport({ report: invoice });

    // Must still fit cleanly on Page 1 without overflowing!
    expect(expandedDoc.pages.length).toBe(1);
    const expandedSubtotal = expandedDoc.pages[0]!.elements.find(e => e.id === 'elem-subtotal-lbl')!;

    // Subtotal must be positioned lower by 47mm (127 - 80) in points
    // 47mm = 47 * 72 / 25.4 = 133.228 pt
    const expectedDiffPt = (127 - 80) * 72 / 25.4;
    expect(expandedSubtotal.yPt - initialSubtotal.yPt).toBeCloseTo(expectedDiffPt, 1);
  });
});
