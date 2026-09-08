import type { BorderSide, ElementBorders, Unit } from '@report/schema';
import { unitToPt } from '@report/schema';
import type { RectPt } from './box.js';

export interface ResolvedBorderSide {
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  widthPt: number;
  color: string;
}

export interface ResolvedBorders {
  top?: ResolvedBorderSide;
  right?: ResolvedBorderSide;
  bottom?: ResolvedBorderSide;
  left?: ResolvedBorderSide;
}

export function resolveBorders(borders?: ElementBorders, unit: Unit = 'mm'): ResolvedBorders {
  if (!borders) return {};

  const resolveSide = (side?: BorderSide): ResolvedBorderSide | undefined => {
    if (!side || side.style === 'none' || side.width <= 0) return undefined;
    return {
      style: side.style,
      widthPt: unitToPt(side.width, unit),
      color: side.color || '#000000'
    };
  };

  return {
    top: resolveSide(borders.top),
    right: resolveSide(borders.right),
    bottom: resolveSide(borders.bottom),
    left: resolveSide(borders.left)
  };
}

export interface BorderLineSegment {
  side: 'top' | 'right' | 'bottom' | 'left';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  widthPt: number;
  style: 'solid' | 'dashed' | 'dotted' | 'double';
  color: string;
}

export function computeBorderSegments(rect: RectPt, borders: ResolvedBorders): BorderLineSegment[] {
  const segments: BorderLineSegment[] = [];

  if (borders.top) {
    segments.push({
      side: 'top',
      x1: rect.x,
      y1: rect.y + borders.top.widthPt / 2,
      x2: rect.x + rect.width,
      y2: rect.y + borders.top.widthPt / 2,
      widthPt: borders.top.widthPt,
      style: borders.top.style,
      color: borders.top.color
    });
  }

  if (borders.right) {
    segments.push({
      side: 'right',
      x1: rect.x + rect.width - borders.right.widthPt / 2,
      y1: rect.y,
      x2: rect.x + rect.width - borders.right.widthPt / 2,
      y2: rect.y + rect.height,
      widthPt: borders.right.widthPt,
      style: borders.right.style,
      color: borders.right.color
    });
  }

  if (borders.bottom) {
    segments.push({
      side: 'bottom',
      x1: rect.x,
      y1: rect.y + rect.height - borders.bottom.widthPt / 2,
      x2: rect.x + rect.width,
      y2: rect.y + rect.height - borders.bottom.widthPt / 2,
      widthPt: borders.bottom.widthPt,
      style: borders.bottom.style,
      color: borders.bottom.color
    });
  }

  if (borders.left) {
    segments.push({
      side: 'left',
      x1: rect.x + borders.left.widthPt / 2,
      y1: rect.y,
      x2: rect.x + borders.left.widthPt / 2,
      y2: rect.y + rect.height,
      widthPt: borders.left.widthPt,
      style: borders.left.style,
      color: borders.left.color
    });
  }

  return segments;
}
