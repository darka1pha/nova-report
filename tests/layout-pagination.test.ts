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
});
