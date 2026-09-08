import type { Unit } from '@report/schema';
import { unitToPt } from '@report/schema';

export interface RectPt {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InsetsPt {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function toPtRect(
  x: number,
  y: number,
  width: number,
  height: number,
  unit: Unit
): RectPt {
  return {
    x: unitToPt(x, unit),
    y: unitToPt(y, unit),
    width: unitToPt(width, unit),
    height: unitToPt(height, unit)
  };
}

export function toPtInsets(
  insets: { top?: number; right?: number; bottom?: number; left?: number },
  unit: Unit
): InsetsPt {
  return {
    top: unitToPt(insets.top ?? 0, unit),
    right: unitToPt(insets.right ?? 0, unit),
    bottom: unitToPt(insets.bottom ?? 0, unit),
    left: unitToPt(insets.left ?? 0, unit)
  };
}
