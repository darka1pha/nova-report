import { describe, it, expect } from 'vitest';
import { exportReport } from '../packages/report-engine/src/index.js';
import invoiceTemplate from '../templates/invoice.report.json';
import salesTemplate from '../templates/sales-summary.report.json';

describe('Multi-Format Exporters (PDF, DOCX, XLSX, HTML)', () => {
  it('exports report definition to vector PDF', async () => {
    const bytes = await exportReport({
      report: invoiceTemplate as any,
      format: 'pdf'
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    // PDF files start with %PDF-
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
  });

  it('exports report definition to Word (.docx)', async () => {
    const bytes = await exportReport({
      report: invoiceTemplate as any,
      format: 'docx'
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    // DOCX files are ZIP containers starting with PK\x03\x04
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });

  it('exports report definition to Excel (.xlsx)', async () => {
    const bytes = await exportReport({
      report: salesTemplate as any,
      format: 'xlsx'
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    // XLSX files are ZIP containers starting with PK\x03\x04
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });

  it('exports report definition to clean standalone HTML', async () => {
    const bytes = await exportReport({
      report: invoiceTemplate as any,
      format: 'html'
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    const htmlStr = new TextDecoder().decode(bytes);
    expect(htmlStr).toContain('<!DOCTYPE html>');
    expect(htmlStr).toContain('report-page');
    expect(htmlStr).toContain('Acme Technologies Global Ltd.');
  });
});
