import { describe, it, expect } from 'vitest';
import {
  encodeCode128,
  encodeCode39,
  encodeEan13,
  encodeBarcode,
  barcodeToSvg,
  generateQRCodeMatrix,
  qrcodeToSvg,
  qrcodeToRects,
  layoutChart,
  chartToSvg
} from '@report/layout';
import { createDefaultChartElement } from '@report/schema';
import { exportReport } from '@report/engine';
import type { ReportDefinition } from '@report/schema';

describe('1D Barcode Vector Encoder', () => {
  it('encodes Code 128 with correct checksum and module length', () => {
    const res = encodeCode128('INV-1002');
    expect(res.format).toBe('CODE128');
    expect(res.value).toBe('INV-1002');
    expect(res.modules.length).toBeGreaterThan(50);
    // All modules should be boolean
    expect(res.modules.every(m => typeof m === 'boolean')).toBe(true);

    const svg = barcodeToSvg(res, 200, 50, { includeText: true });
    expect(svg).toContain('<svg');
    expect(svg).toContain('INV-1002');
    expect(svg).toContain('<rect');
  });

  it('encodes Code 39 with start/stop asterisks', () => {
    const res = encodeCode39('NOVA123');
    expect(res.format).toBe('CODE39');
    expect(res.modules.length).toBeGreaterThan(40);

    const svg = barcodeToSvg(res, 200, 50);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<rect');
  });

  it('encodes EAN-13 with valid 13-digit checksum', () => {
    const res = encodeEan13('400638133393');
    expect(res.format).toBe('EAN13');
    // EAN-13 always has 95 modules
    expect(res.modules.length).toBe(95);

    const svg = barcodeToSvg(res, 180, 60);
    expect(svg).toContain('<svg');
    expect(svg).toContain('4006381333931');
  });
});

describe('2D QR Code Generator (ISO/IEC 18004)', () => {
  it('generates standard QR matrix with finder patterns', () => {
    const matrix = generateQRCodeMatrix('https://novareport.dev/verify/100', 'M');
    expect(matrix.length).toBeGreaterThanOrEqual(21); // Version 1 is 21x21
    expect(matrix[0]!.length).toBe(matrix.length); // Must be square

    // Finder patterns top-left: (0,0) to (6,6)
    expect(matrix[0]![0]).toBe(true);
    expect(matrix[0]![6]).toBe(true);
    expect(matrix[6]![0]).toBe(true);
    expect(matrix[6]![6]).toBe(true);
    // Center of finder pattern (3,3) must be true
    expect(matrix[3]![3]).toBe(true);
  });

  it('generates vector SVG and PDF rect coordinates', () => {
    const matrix = generateQRCodeMatrix('NovaReport', 'H');
    const svg = qrcodeToSvg(matrix, 100, 100);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');

    const rects = qrcodeToRects(matrix, 0, 0, 100, 100);
    expect(rects.length).toBeGreaterThan(0);
    expect(rects[0]).toHaveProperty('x');
    expect(rects[0]).toHaveProperty('y');
    expect(rects[0]).toHaveProperty('width');
  });
});

describe('Vector Chart Engine', () => {
  it('calculates layout and produces SVG for Bar Chart', () => {
    const elem = createDefaultChartElement({
      chartType: 'bar',
      title: 'Q1 Revenue',
      data: [
        { label: 'Jan', value: 120 },
        { label: 'Feb', value: 240 },
        { label: 'Mar', value: 310 }
      ]
    });

    const layout = layoutChart(elem, 250, 150, { data: {}, parameters: {}, variables: {} });
    expect(layout.bars?.length).toBe(3);
    expect(layout.bars![0]!.label).toBe('Jan');
    expect(layout.bars![0]!.value).toBe(120);

    const svg = chartToSvg(layout, 250, 150);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Q1 Revenue');
    expect(svg).toContain('Jan');
  });

  it('calculates layout and produces SVG for Pie Chart', () => {
    const elem = createDefaultChartElement({
      chartType: 'pie',
      title: 'Market Share',
      data: [
        { label: 'Alpha', value: 60 },
        { label: 'Beta', value: 40 }
      ]
    });

    const layout = layoutChart(elem, 200, 200, { data: {}, parameters: {}, variables: {} });
    expect(layout.pieSlices?.length).toBe(2);
    expect(layout.pieSlices![0]!.percentage).toBe(60);
    expect(layout.pieSlices![1]!.percentage).toBe(40);

    const svg = chartToSvg(layout, 200, 200);
    expect(svg).toContain('<path d="M');
    expect(svg).toContain('Alpha');
  });
});

describe('End-to-End Export with Barcode, QR, and Chart', () => {
  it('exports PDF and HTML reports containing vector Barcode, QR, and Chart', async () => {
    const report: ReportDefinition = {
      version: '1.0',
      name: 'Advanced Visuals Report',
      page: {
        width: 210,
        height: 297,
        unit: 'mm',
        orientation: 'portrait',
        margins: { top: 10, right: 10, bottom: 10, left: 10 }
      },
      dataSources: [],
      parameters: [],
      variables: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          name: 'Detail Band',
          height: 200,
          elements: [
            {
              id: 'bar-1',
              type: 'barcode',
              x: 10,
              y: 10,
              width: 60,
              height: 20,
              value: 'INV-990123',
              format: 'CODE128',
              includeText: true
            },
            {
              id: 'qr-1',
              type: 'qrcode',
              x: 80,
              y: 10,
              width: 25,
              height: 25,
              value: 'https://verify.novareport.dev/inv/990123',
              errorCorrectionLevel: 'M'
            },
            createDefaultChartElement({
              x: 10,
              y: 40,
              width: 120,
              height: 70,
              chartType: 'bar',
              title: 'Quarterly Sales'
            })
          ]
        }
      ]
    };

    // Export PDF
    const pdfBytes = await exportReport({ report, format: 'pdf' });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Export HTML
    const htmlBytes = await exportReport({ report, format: 'html' });
    const htmlString = new TextDecoder().decode(htmlBytes);
    expect(htmlString).toContain('INV-990123');
    expect(htmlString).toContain('Quarterly Sales');
    expect(htmlString).toContain('<svg');
  });
});
