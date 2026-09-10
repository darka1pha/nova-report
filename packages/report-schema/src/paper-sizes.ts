import type { PaperSizeName, PaperDimensions } from './types.js';
import { unitToPt, ptToUnit, type Unit } from './units.js';

export const PAPER_SIZES: Record<Exclude<PaperSizeName, 'Custom'>, PaperDimensions> = {
  A4: {
    name: 'A4',
    label: 'A4 (210 × 297 mm)',
    widthMm: 210,
    heightMm: 297
  },
  A3: {
    name: 'A3',
    label: 'A3 (297 × 420 mm)',
    widthMm: 297,
    heightMm: 420
  },
  A5: {
    name: 'A5',
    label: 'A5 (148 × 210 mm)',
    widthMm: 148,
    heightMm: 210
  },
  Letter: {
    name: 'Letter',
    label: 'Letter (8.5 × 11 in / 215.9 × 279.4 mm)',
    widthMm: 215.9,
    heightMm: 279.4
  },
  Legal: {
    name: 'Legal',
    label: 'Legal (8.5 × 14 in / 215.9 × 355.6 mm)',
    widthMm: 215.9,
    heightMm: 355.6
  },
  Tabloid: {
    name: 'Tabloid',
    label: 'Tabloid (11 × 17 in / 279.4 × 431.8 mm)',
    widthMm: 279.4,
    heightMm: 431.8
  }
};

export function getPaperDimensions(
  paperSize: PaperSizeName,
  orientation: 'portrait' | 'landscape' = 'portrait',
  unit: Unit = 'mm'
): { width: number; height: number } {
  if (paperSize === 'Custom') {
    return getPaperDimensions('A4', orientation, unit);
  }

  const spec = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  let rawW = spec.widthMm;
  let rawH = spec.heightMm;

  if (orientation === 'landscape') {
    const w = Math.max(rawW, rawH);
    const h = Math.min(rawW, rawH);
    rawW = w;
    rawH = h;
  } else {
    const w = Math.min(rawW, rawH);
    const h = Math.max(rawW, rawH);
    rawW = w;
    rawH = h;
  }

  if (unit === 'mm') {
    return { width: Math.round(rawW * 10) / 10, height: Math.round(rawH * 10) / 10 };
  }

  const ptW = unitToPt(rawW, 'mm');
  const ptH = unitToPt(rawH, 'mm');
  return {
    width: Math.round(ptToUnit(ptW, unit) * 10) / 10,
    height: Math.round(ptToUnit(ptH, unit) * 10) / 10
  };
}

export function detectPaperSize(
  width: number,
  height: number,
  unit: Unit = 'mm'
): PaperSizeName {
  const wPt = unitToPt(width, unit);
  const hPt = unitToPt(height, unit);
  const minPt = Math.min(wPt, hPt);
  const maxPt = Math.max(wPt, hPt);

  for (const [key, spec] of Object.entries(PAPER_SIZES)) {
    const specWPt = unitToPt(spec.widthMm, 'mm');
    const specHPt = unitToPt(spec.heightMm, 'mm');
    const specMinPt = Math.min(specWPt, specHPt);
    const specMaxPt = Math.max(specWPt, specHPt);

    if (Math.abs(minPt - specMinPt) < 4 && Math.abs(maxPt - specMaxPt) < 4) {
      return key as PaperSizeName;
    }
  }

  return 'Custom';
}
