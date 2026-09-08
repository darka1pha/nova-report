import { describe, it, expect } from 'vitest';
import {
  unitToPt,
  ptToUnit,
  convertUnit,
  validateReportDefinition,
  createBlankReport,
  createDefaultTextElement,
  createDefaultTableElement
} from '../packages/report-schema/src/index.js';

describe('Report Schema & Units', () => {
  it('converts units correctly', () => {
    expect(unitToPt(1, 'in')).toBe(72);
    expect(unitToPt(25.4, 'mm')).toBeCloseTo(72, 4);
    expect(ptToUnit(72, 'in')).toBe(1);
    expect(convertUnit(10, 'mm', 'mm')).toBe(10);
  });

  it('validates a correct report definition', () => {
    const blank = createBlankReport('Invoice Test');
    const res = validateReportDefinition(blank);
    expect(res.success).toBe(true);
  });

  it('rejects an invalid report definition missing mandatory fields', () => {
    const invalid = { version: '1.0', name: '' };
    const res = validateReportDefinition(invalid);
    expect(res.success).toBe(false);
  });

  it('creates default elements with unique IDs', () => {
    const el1 = createDefaultTextElement();
    const el2 = createDefaultTextElement();
    expect(el1.id).not.toBe(el2.id);
    expect(el1.type).toBe('text');

    const tbl = createDefaultTableElement();
    expect(tbl.type).toBe('table');
    expect(tbl.columns.length).toBe(3);
  });
});
