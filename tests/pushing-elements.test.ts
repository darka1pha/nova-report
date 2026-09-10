import { describe, it, expect } from 'vitest';
import { renderReport } from '../packages/report-engine/src/index.js';
import defaultInvoice from '../templates/invoice.report.json';

describe('Adding new element should not push existing ones off', () => {
  it('adding an element to invoice detail does not push reportFooter off page 1', async () => {
    // 1. Render default invoice
    const initialDoc = await renderReport({ report: defaultInvoice as any });
    expect(initialDoc.pages.length).toBe(1);

    const initialReportFooterElems = initialDoc.pages[0]!.elements.filter(
      e => e.id.includes('elem-notes') || e.id.includes('elem-summary-box') || e.id.includes('elem-subtotal')
    );
    expect(initialReportFooterElems.length).toBeGreaterThan(0);
    const initialSubtotalY = initialReportFooterElems.find(e => e.id.includes('elem-subtotal'))?.yPt;

    // 2. Clone invoice and add a new text element into sec-detail (at x: 120, y: 10)
    const modifiedInvoice = JSON.parse(JSON.stringify(defaultInvoice));
    const detailSec = modifiedInvoice.sections.find((s: any) => s.id === 'sec-detail');
    expect(detailSec).toBeDefined();

    detailSec.elements.push({
      id: 'elem-new-test-1',
      type: 'text',
      name: 'Status Stamp',
      x: 120,
      y: 10,
      width: 50,
      height: 10,
      text: 'PAID IN FULL',
      style: { fontSize: 12, fontWeight: 'bold', color: '#16a34a' }
    });

    const modifiedDoc = await renderReport({ report: modifiedInvoice });

    // It should still fit on Page 1! Existing footer elements should NOT be pushed to page 2!
    expect(modifiedDoc.pages.length).toBe(1);

    const modifiedReportFooterElems = modifiedDoc.pages[0]!.elements.filter(
      e => e.id.includes('elem-notes') || e.id.includes('elem-summary-box') || e.id.includes('elem-subtotal')
    );
    expect(modifiedReportFooterElems.length).toBeGreaterThan(0);

    const newSubtotalY = modifiedReportFooterElems.find(e => e.id.includes('elem-subtotal'))?.yPt;
    // The subtotal Y should NOT have changed (pushed down) simply by adding a text stamp at y=10
    expect(newSubtotalY).toBeCloseTo(initialSubtotalY!, 0.1);
  });

  it('sibling elements placed below table do not push each other cumulatively', async () => {
    const invoice = JSON.parse(JSON.stringify(defaultInvoice));
    const detailSec = invoice.sections.find((s: any) => s.id === 'sec-detail');

    // Add two side-by-side elements below the table (e.g. at y=75, x=15 and x=120)
    detailSec.elements.push({
      id: 'elem-notes-left',
      type: 'text',
      name: 'Left Note',
      x: 15,
      y: 75,
      width: 80,
      height: 15,
      text: 'Left Note Text'
    });

    detailSec.elements.push({
      id: 'elem-notes-right',
      type: 'text',
      name: 'Right Note',
      x: 120,
      y: 75,
      width: 70,
      height: 15,
      text: 'Right Note Text'
    });

    const doc = await renderReport({ report: invoice });
    const leftElem = doc.pages[0]?.elements.find(e => e.id === 'elem-notes-left');
    const rightElem = doc.pages[0]?.elements.find(e => e.id === 'elem-notes-right');

    expect(leftElem).toBeDefined();
    expect(rightElem).toBeDefined();
    // Since both were placed at y=75 in the designer, they MUST have the same Y on the page!
    expect(rightElem!.yPt).toBeCloseTo(leftElem!.yPt, 0.1);
  });
});
