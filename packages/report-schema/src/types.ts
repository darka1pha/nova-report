import type { Unit } from './units.js';

export type TextAlignment = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type TextDecoration = 'none' | 'underline' | 'line-through';
export type TextDirection = 'ltr' | 'rtl' | 'auto';

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted' | 'double';

export interface BorderSide {
  style: BorderStyle;
  width: number; // in report units
  color: string;
}

export interface ElementBorders {
  top?: BorderSide;
  right?: BorderSide;
  bottom?: BorderSide;
  left?: BorderSide;
}

export interface ElementPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number; // in pt
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textDecoration?: TextDecoration;
  color?: string;
  backgroundColor?: string;
  textAlign?: TextAlignment;
  verticalAlign?: VerticalAlignment;
  lineHeight?: number;
  letterSpacing?: number;
  opacity?: number;
  borders?: ElementBorders;
  padding?: ElementPadding;
  borderRadius?: number;
  direction?: TextDirection;
  wordWrap?: boolean;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PaperSizeName = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid' | 'Custom';

export interface PaperDimensions {
  name: PaperSizeName;
  label: string;
  widthMm: number;
  heightMm: number;
}

export interface PageSettings {
  width: number;
  height: number;
  unit: Unit;
  orientation: 'portrait' | 'landscape';
  margins: PageMargins;
  direction?: TextDirection;
  paperSize?: PaperSizeName;
}


export type SectionType =
  | 'pageHeader'
  | 'reportHeader'
  | 'groupHeader'
  | 'detail'
  | 'groupFooter'
  | 'reportFooter'
  | 'pageFooter';

export interface SectionDefinition {
  id: string;
  type: SectionType;
  name: string;
  height: number; // height in report unit
  autoHeight?: boolean;
  canGrow?: boolean;
  canShrink?: boolean;
  repeatOnEveryPage?: boolean;
  pageBreakBefore?: boolean;
  pageBreakAfter?: boolean;
  keepTogether?: boolean;
  condition?: string; // visibility expression
  groupBy?: string; // expression for groupHeader/groupFooter
  dataSource?: string; // e.g. "employees" to repeat section for each array item
  repeatForEachRecord?: boolean; // repeat detail section for each record in bound array
  elements: ReportElement[];
}

export interface BaseElement {
  id: string;
  name?: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number; // degrees 0-360
  locked?: boolean;
  hidden?: boolean;
  condition?: string; // expression for conditional rendering
  style?: ElementStyle;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string; // plain text or expression template e.g. "Invoice #{{invoice.id}}"
  multiline?: boolean;
  autoHeight?: boolean;
  format?: {
    type: 'string' | 'number' | 'currency' | 'date';
    pattern?: string;
    currencySymbol?: string;
    locale?: string;
  };
}

export type ShapeType = 'rectangle' | 'rounded-rectangle' | 'circle' | 'ellipse' | 'line';

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: ShapeType;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  strokeStyle?: BorderStyle;
  borderRadius?: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // url, data:image/..., or expression {{company.logo}}
  fit?: 'contain' | 'cover' | 'fill' | 'none';
  preserveAspectRatio?: boolean;
}

export type BarcodeFormat = 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'CODE39' | 'ITF14';

export interface BarcodeElement extends BaseElement {
  type: 'barcode';
  value: string; // literal or expression {{product.barcode}}
  format: BarcodeFormat;
  includeText?: boolean;
  barColor?: string;
  backgroundColor?: string;
}

export interface QRCodeElement extends BaseElement {
  type: 'qrcode';
  value: string; // literal or expression {{invoice.verifyUrl}}
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  darkColor?: string;
  lightColor?: string;
}

export interface TableCell {
  id: string;
  colSpan?: number;
  rowSpan?: number;
  text?: string; // text or expression
  style?: ElementStyle;
  format?: {
    type: 'string' | 'number' | 'currency' | 'date';
    pattern?: string;
    currencySymbol?: string;
    locale?: string;
  };
}

export interface TableRow {
  id: string;
  height: number;
  cells: TableCell[];
  isHeader?: boolean;
  isFooter?: boolean;
}

export interface TableColumn {
  id: string;
  width: number;
}

export interface TableElement extends BaseElement {
  type: 'table';
  dataSource?: string; // e.g. "items"
  columns: TableColumn[];
  headerRows: TableRow[];
  bodyRows: TableRow[]; // template rows for repeating data
  footerRows?: TableRow[];
  repeatHeaderOnEveryPage?: boolean;
  keepTogether?: boolean;
  groupBy?: string;
}

export type ChartType = 'bar' | 'line' | 'pie' | 'donut';

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartElement extends BaseElement {
  type: 'chart';
  chartType: ChartType;
  title?: string;
  dataSource?: string;
  categoryField?: string;
  valueField?: string;
  data?: ChartDataPoint[];
  colors?: string[];
  showLegend?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
}

export type ReportElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | BarcodeElement
  | QRCodeElement
  | TableElement
  | ChartElement;

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  defaultValue?: unknown;
  label?: string;
  required?: boolean;
}

export interface VariableDefinition {
  name: string;
  expression: string;
  initialValue?: unknown;
  resetOn?: 'none' | 'page' | 'group' | 'report';
}

export interface DataSourceDefinition {
  name: string;
  type: 'json' | 'array' | 'rest' | 'custom';
  data?: unknown; // initial or sample data
  url?: string;
  headers?: Record<string, string>;
}

export interface ReportDefinition {
  version: '1.0';
  name: string;
  title?: string;
  description?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  page: PageSettings;
  dataSources: DataSourceDefinition[];
  parameters: ParameterDefinition[];
  variables: VariableDefinition[];
  sections: SectionDefinition[];
  elements?: ReportElement[]; // top-level elements if not using sections
}
