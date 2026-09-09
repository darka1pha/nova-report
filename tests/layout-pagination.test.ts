import { describe, it, expect } from 'vitest';
import { renderReport } from '../packages/report-engine/src/index.js';
import invoiceTemplate from '../templates/invoice.report.json';
import salesTemplate from '../templates/sales-summary.report.json';

describe('Layout & Pagination Engine', () => {
  it('renders a single-page invoice report with sections and table correctly', async () => {
    const doc = await renderReport({
      report: invoiceTemplate as any
    });

    expect(doc.reportName).toBe('Invoice');
    expect(doc.pages.length).toBeGreaterThanOrEqual(1);

    const firstPage = doc.pages[0]!;
    expect(firstPage.pageNumber).toBe(1);
    expect(firstPage.totalPages).toBeGreaterThanOrEqual(1);
    expect(firstPage.widthPt).toBeCloseTo(595.28, 1); // 210mm in pt
    expect(firstPage.heightPt).toBeCloseTo(841.89, 1); // 297mm in pt

    // Verify elements are present on page
    const textElements = firstPage.elements.filter(e => e.type === 'text');
    expect(textElements.length).toBeGreaterThan(0);

    const tableElements = firstPage.elements.filter(e => e.type === 'table');
    expect(tableElements.length).toBe(1);
  });

  it('paginates large tables automatically across multiple pages', async () => {
    // Generate a report with 50 rows in the items table
    const manyItems = Array.from({ length: 60 }, (_, i) => ({
      description: `Test Product Item #${i + 1}`,
      quantity: 1,
      unitPrice: 50.0,
      total: 50.0
    }));

    const doc = await renderReport({
      report: invoiceTemplate as any,
      data: {
        invoice: {
          ...(invoiceTemplate as any).dataSources[0].data,
          items: manyItems
        }
      }
    });

    // Should paginate to at least 2 pages
    expect(doc.totalPages).toBeGreaterThanOrEqual(2);
    expect(doc.pages.length).toBe(doc.totalPages);

    // Verify page numbers are correctly set
    expect(doc.pages[0]!.pageNumber).toBe(1);
    expect(doc.pages[1]!.pageNumber).toBe(2);
    expect(doc.pages[0]!.totalPages).toBe(doc.totalPages);
    expect(doc.pages[1]!.totalPages).toBe(doc.totalPages);
  });

  it('preserves exact designer X positioning in preview without shifting by margins', async () => {
    // A4 portrait (210mm x 297mm) with 15mm margins
    // Centered element with width 50mm: center = 105mm, x = 105 - 25 = 80mm
    const customReport = {
      version: '1.0',
      name: 'Centering Test',
      page: {
        width: 210,
        height: 297,
        unit: 'mm',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      parameters: [],
      variables: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          name: 'Detail',
          height: 100,
          elements: [
            {
              id: 'elem-centered',
              type: 'text',
              name: 'Centered Label',
              x: 80, // Centered on 210mm page: (210 - 50) / 2 = 80mm
              y: 20,
              width: 50,
              height: 10,
              text: 'Centered Inside Margins'
            }
          ]
        }
      ]
    };

    const doc = await renderReport({ report: customReport as any });
    const page = doc.pages[0]!;
    const elem = page.elements.find(e => e.id === 'elem-centered')!;
    expect(elem).toBeDefined();

    // 80mm in pt = 80 * (72 / 25.4) = ~226.77pt
    const expectedXPt = 80 * (72 / 25.4);
    expect(elem.xPt).toBeCloseTo(expectedXPt, 1);

    // Verify center is at 105mm (297.64pt), NOT shifted right by margin (15mm = 42.52pt)
    const centerPt = elem.xPt + elem.widthPt / 2;
    const expectedCenterPt = 105 * (72 / 25.4);
    expect(centerPt).toBeCloseTo(expectedCenterPt, 1);
  });

  it('preserves exact designer Y positioning without compounding element heights', async () => {
    // 3 elements at different Y positions in a 200mm detail section
    const customReport = {
      version: '1.0',
      name: 'Y-Positioning Test',
      page: {
        width: 210,
        height: 297,
        unit: 'mm',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      parameters: [],
      variables: [],
      sections: [
        {
          id: 'sec-header',
          type: 'pageHeader',
          name: 'Header',
          height: 25,
          elements: []
        },
        {
          id: 'sec-detail',
          type: 'detail',
          name: 'Detail',
          height: 220,
          elements: [
            { id: 'el-top-left', type: 'text', x: 10, y: 10, width: 50, height: 20, text: 'Top Left' },
            { id: 'el-top-right', type: 'text', x: 100, y: 10, width: 50, height: 20, text: 'Top Right' },
            { id: 'el-middle', type: 'text', x: 10, y: 80, width: 50, height: 20, text: 'Middle' },
            { id: 'el-bottom', type: 'text', x: 10, y: 190, width: 50, height: 20, text: 'Near Bottom' }
          ]
        },
        {
          id: 'sec-footer',
          type: 'pageFooter',
          name: 'Footer',
          height: 15,
          elements: []
        }
      ]
    };

    const doc = await renderReport({ report: customReport as any });
    expect(doc.pages.length).toBe(1);

    const page = doc.pages[0]!;
    // Section start Y is margins.top (15mm) + pageHeader (25mm) = 40mm
    const secStartYPt = (15 + 25) * (72 / 25.4);

    const elTopLeft = page.elements.find(e => e.id === 'el-top-left')!;
    const elTopRight = page.elements.find(e => e.id === 'el-top-right')!;
    const elMiddle = page.elements.find(e => e.id === 'el-middle')!;
    const elBottom = page.elements.find(e => e.id === 'el-bottom')!;

    expect(elTopLeft).toBeDefined();
    expect(elTopRight).toBeDefined();
    expect(elMiddle).toBeDefined();
    expect(elBottom).toBeDefined();

    // Top left and top right must have the SAME Y (not shifted downwards by 20mm)
    expect(elTopLeft.yPt).toBeCloseTo(secStartYPt + 10 * (72 / 25.4), 1);
    expect(elTopRight.yPt).toBeCloseTo(secStartYPt + 10 * (72 / 25.4), 1);

    // Middle element must be at y: 80mm
    expect(elMiddle.yPt).toBeCloseTo(secStartYPt + 80 * (72 / 25.4), 1);

    // Bottom element must be at y: 190mm and MUST be present on page 1
    expect(elBottom.yPt).toBeCloseTo(secStartYPt + 190 * (72 / 25.4), 1);
  });

  it('renders elements placed at the extreme bottom of detail without pushing them to an extra page', async () => {
    // A4 (297mm) with 15mm margins, 25mm header, 15mm footer
    // Printable body = 297 - 15 - 15 - 25 - 15 = 227mm
    // Element placed at y = 215mm with height = 10mm (bottom at 225mm)
    const customReport = {
      version: '1.0',
      name: 'Extreme Bottom Test',
      page: {
        width: 210,
        height: 297,
        unit: 'mm',
        orientation: 'portrait',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      parameters: [],
      variables: [],
      sections: [
        {
          id: 'sec-header',
          type: 'pageHeader',
          name: 'Header',
          height: 25,
          elements: [
            { id: 'el-hdr', type: 'text', x: 15, y: 5, width: 80, height: 10, text: 'Header Title' }
          ]
        },
        {
          id: 'sec-detail',
          type: 'detail',
          name: 'Detail',
          height: 227,
          elements: [
            { id: 'el-bottom-sig', type: 'text', x: 15, y: 215, width: 80, height: 10, text: 'Authorized Signature' }
          ]
        },
        {
          id: 'sec-footer',
          type: 'pageFooter',
          name: 'Footer',
          height: 15,
          elements: [
            { id: 'el-ftr', type: 'text', x: 15, y: 2, width: 180, height: 6, text: 'Page 1 of 1' }
          ]
        }
      ]
    };

    const doc = await renderReport({ report: customReport as any });
    // Must remain on single page (no unexpected page 2)
    expect(doc.pages.length).toBe(1);

    const page = doc.pages[0]!;
    const sigElem = page.elements.find(e => e.id === 'el-bottom-sig')!;
    const ftrElem = page.elements.find(e => e.id === 'el-ftr')!;

    expect(sigElem).toBeDefined();
    expect(ftrElem).toBeDefined();

    // Detail start Y = margins.top (15mm) + pageHeader (25mm) = 40mm
    const expectedSigYPt = (15 + 25 + 215) * (72 / 25.4);
    expect(sigElem.yPt).toBeCloseTo(expectedSigYPt, 1);

    // Footer is anchored at pageHeight - margins.bottom - footerHeight = 297 - 15 - 15 = 267mm
    const expectedFtrYPt = (297 - 15 - 15 + 2) * (72 / 25.4);
    expect(ftrElem.yPt).toBeCloseTo(expectedFtrYPt, 1);

    // Signature must be above footer
    expect(sigElem.yPt + sigElem.heightPt).toBeLessThanOrEqual(ftrElem.yPt);
  });
});
