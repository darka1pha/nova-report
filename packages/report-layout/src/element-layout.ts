import type {
  ReportElement,
  TextElement,
  ShapeElement,
  ImageElement,
  BarcodeElement,
  QRCodeElement,
  TableElement,
  Unit,
  TextDirection
} from '@report/schema';
import { unitToPt } from '@report/schema';
import { interpolateTemplate } from '@report/expression';
import type { ReportDataContext } from '@report/data';
import { resolveBorders, type ResolvedBorders } from './borders.js';
import { measureAndWrapText } from './metrics.js';
import { layoutTable, type LayoutTable } from './table.js';

export interface LayoutBaseElement {
  id: string;
  name?: string;
  type: string;
  xPt: number;
  yPt: number;
  widthPt: number;
  heightPt: number;
  rotation?: number;
  borders: ResolvedBorders;
  style: any;
  direction?: TextDirection;
}

export interface LayoutTextElement extends LayoutBaseElement {
  type: 'text';
  text: string;
  lines: string[];
  fontSizePt: number;
}

export interface LayoutShapeElement extends LayoutBaseElement {
  type: 'shape';
  shapeType: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidthPt: number;
  borderRadiusPt: number;
}

export interface LayoutImageElement extends LayoutBaseElement {
  type: 'image';
  src: string;
  fit: string;
}

export interface LayoutBarcodeElement extends LayoutBaseElement {
  type: 'barcode';
  value: string;
  format: string;
  includeText: boolean;
  barColor: string;
  backgroundColor: string;
}

export interface LayoutQRCodeElement extends LayoutBaseElement {
  type: 'qrcode';
  value: string;
  errorCorrectionLevel: string;
  darkColor: string;
  lightColor: string;
}

export interface LayoutTableElementInstance extends LayoutBaseElement {
  type: 'table';
  table: LayoutTable;
}

export type LayoutElement =
  | LayoutTextElement
  | LayoutShapeElement
  | LayoutImageElement
  | LayoutBarcodeElement
  | LayoutQRCodeElement
  | LayoutTableElementInstance;

export function layoutElement(
  element: ReportElement,
  unit: Unit,
  context: ReportDataContext,
  pageDirection: TextDirection = 'ltr'
): LayoutElement | null {
  const xPt = unitToPt(element.x, unit);
  const yPt = unitToPt(element.y, unit);
  const widthPt = unitToPt(element.width, unit);
  let heightPt = unitToPt(element.height, unit);
  const borders = resolveBorders(element.style?.borders, unit);
  const style = element.style || {};
  const direction = style.direction || pageDirection;

  // Check condition if present
  if (element.condition) {
    const isVisible = interpolateTemplate(`{{${element.condition}}}`, {
      ...context.data,
      ...context.parameters,
      ...context.variables
    });
    if (isVisible === false || isVisible === 'false') {
      return null;
    }
  }

  switch (element.type) {
    case 'text': {
      const textElem = element as TextElement;
      const evaluatedText = interpolateTemplate(textElem.text, {
        ...context.data,
        ...context.parameters,
        ...context.variables
      });
      const str = evaluatedText !== undefined && evaluatedText !== null ? String(evaluatedText) : '';
      const fontSizePt = style.fontSize || 10;

      const paddingLeft = unitToPt(style.padding?.left || 0, unit);
      const paddingRight = unitToPt(style.padding?.right || 0, unit);
      const paddingTop = unitToPt(style.padding?.top || 0, unit);
      const paddingBottom = unitToPt(style.padding?.bottom || 0, unit);

      const maxTextWidth = Math.max(10, widthPt - (paddingLeft + paddingRight));
      const wrapped = measureAndWrapText(str, {
        fontSizePt,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        maxWidthPt: textElem.multiline ? maxTextWidth : Infinity
      });

      if (textElem.autoHeight) {
        heightPt = Math.max(heightPt, wrapped.totalHeightPt + paddingTop + paddingBottom);
      }

      return {
        id: textElem.id,
        name: textElem.name,
        type: 'text',
        xPt,
        yPt,
        widthPt,
        heightPt,
        rotation: textElem.rotation,
        borders,
        style,
        direction,
        text: str,
        lines: wrapped.lines,
        fontSizePt
      };
    }

    case 'shape': {
      const shapeElem = element as ShapeElement;
      return {
        id: shapeElem.id,
        name: shapeElem.name,
        type: 'shape',
        shapeType: shapeElem.shapeType,
        xPt,
        yPt,
        widthPt,
        heightPt,
        rotation: shapeElem.rotation,
        borders,
        style,
        direction,
        fillColor: shapeElem.fillColor || style.backgroundColor,
        strokeColor: shapeElem.strokeColor,
        strokeWidthPt: unitToPt(shapeElem.strokeWidth || 0.5, unit),
        borderRadiusPt: unitToPt(shapeElem.borderRadius || 0, unit)
      };
    }

    case 'image': {
      const imgElem = element as ImageElement;
      const src = interpolateTemplate(imgElem.src, {
        ...context.data,
        ...context.parameters,
        ...context.variables
      });

      return {
        id: imgElem.id,
        name: imgElem.name,
        type: 'image',
        xPt,
        yPt,
        widthPt,
        heightPt,
        rotation: imgElem.rotation,
        borders,
        style,
        direction,
        src: String(src || ''),
        fit: imgElem.fit || 'contain'
      };
    }

    case 'barcode': {
      const barElem = element as BarcodeElement;
      const val = interpolateTemplate(barElem.value, {
        ...context.data,
        ...context.parameters,
        ...context.variables
      });

      return {
        id: barElem.id,
        name: barElem.name,
        type: 'barcode',
        xPt,
        yPt,
        widthPt,
        heightPt,
        rotation: barElem.rotation,
        borders,
        style,
        direction,
        value: String(val || ''),
        format: barElem.format || 'CODE128',
        includeText: barElem.includeText ?? true,
        barColor: barElem.barColor || '#000000',
        backgroundColor: barElem.backgroundColor || '#ffffff'
      };
    }

    case 'qrcode': {
      const qrElem = element as QRCodeElement;
      const val = interpolateTemplate(qrElem.value, {
        ...context.data,
        ...context.parameters,
        ...context.variables
      });

      return {
        id: qrElem.id,
        name: qrElem.name,
        type: 'qrcode',
        xPt,
        yPt,
        widthPt,
        heightPt,
        rotation: qrElem.rotation,
        borders,
        style,
        direction,
        value: String(val || ''),
        errorCorrectionLevel: qrElem.errorCorrectionLevel || 'M',
        darkColor: qrElem.darkColor || '#000000',
        lightColor: qrElem.lightColor || '#ffffff'
      };
    }

    case 'table': {
      const tblElem = element as TableElement;
      const layout = layoutTable(tblElem, unit, context, pageDirection);
      return {
        id: tblElem.id,
        name: tblElem.name,
        type: 'table',
        xPt,
        yPt,
        widthPt: layout.widthPt,
        heightPt: layout.heightPt,
        rotation: tblElem.rotation,
        borders,
        style,
        direction,
        table: layout
      };
    }
  }

  return null;
}
