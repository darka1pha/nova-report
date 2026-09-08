export type Unit = 'mm' | 'cm' | 'in' | 'pt' | 'px';

// 1 inch = 72 pt = 25.4 mm = 2.54 cm = 96 px (screen reference)
export const PT_PER_INCH = 72;
export const MM_PER_INCH = 25.4;
export const CM_PER_INCH = 2.54;
export const PX_PER_INCH = 96;

export function unitToPt(value: number, unit: Unit): number {
  switch (unit) {
    case 'pt':
      return value;
    case 'in':
      return value * PT_PER_INCH;
    case 'mm':
      return (value / MM_PER_INCH) * PT_PER_INCH;
    case 'cm':
      return (value / CM_PER_INCH) * PT_PER_INCH;
    case 'px':
      return (value / PX_PER_INCH) * PT_PER_INCH;
    default:
      return value;
  }
}

export function ptToUnit(pt: number, targetUnit: Unit): number {
  switch (targetUnit) {
    case 'pt':
      return pt;
    case 'in':
      return pt / PT_PER_INCH;
    case 'mm':
      return (pt / PT_PER_INCH) * MM_PER_INCH;
    case 'cm':
      return (pt / PT_PER_INCH) * CM_PER_INCH;
    case 'px':
      return (pt / PT_PER_INCH) * PX_PER_INCH;
    default:
      return pt;
  }
}

export function convertUnit(value: number, fromUnit: Unit, toUnit: Unit): number {
  if (fromUnit === toUnit) return value;
  const inPt = unitToPt(value, fromUnit);
  return ptToUnit(inPt, toUnit);
}

export const STANDARD_PAGE_SIZES: Record<string, { width: number; height: number; unit: Unit }> = {
  A4: { width: 210, height: 297, unit: 'mm' },
  A3: { width: 297, height: 420, unit: 'mm' },
  A5: { width: 148, height: 210, unit: 'mm' },
  Letter: { width: 8.5, height: 11, unit: 'in' },
  Legal: { width: 8.5, height: 14, unit: 'in' },
  Tabloid: { width: 11, height: 17, unit: 'in' },
  Receipt80mm: { width: 80, height: 200, unit: 'mm' }
};
