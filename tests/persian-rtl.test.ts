import { describe, it, expect } from 'vitest';
import { renderReport, exportReport } from '../packages/report-engine/src/index.js';
import persianInvoiceTemplate from '../templates/invoice-rtl-persian.report.json';

describe('RTL & Persian Report Support', () => {
  it('renders RTL report with correct direction and table headers', async () => {
    const doc = await renderReport({
      report: persianInvoiceTemplate as any
    });

    expect(doc.pages.length).toBeGreaterThanOrEqual(1);
    const page = doc.pages[0]!;
    expect(page.direction).toBe('rtl');

    const table = page.elements.find(e => e.type === 'table') as any;
    expect(table).toBeDefined();
    expect(table.table.headerRows[0].cells[0].text).toBe('ردیف');
  });

  it('exports Persian RTL report to HTML preserving RTL layout', async () => {
    const bytes = await exportReport({
      report: persianInvoiceTemplate as any,
      format: 'html'
    });

    const html = new TextDecoder().decode(bytes);
    expect(html).toContain('direction: rtl');
    expect(html).toContain('شرکت مهندسی داده‌پردازان آریانا');
    expect(html).toContain('صورتحساب فروش کالا و خدمات');
  });
});
