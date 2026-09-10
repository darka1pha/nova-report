import { z } from 'zod';

export const UnitSchema = z.enum(['mm', 'cm', 'in', 'pt', 'px']);
export const TextAlignmentSchema = z.enum(['left', 'center', 'right', 'justify']);
export const VerticalAlignmentSchema = z.enum(['top', 'middle', 'bottom']);
export const BorderStyleSchema = z.enum(['none', 'solid', 'dashed', 'dotted', 'double']);
export const TextDirectionSchema = z.enum(['ltr', 'rtl', 'auto']);

export const BorderSideSchema = z.object({
  style: BorderStyleSchema,
  width: z.number().nonnegative(),
  color: z.string()
});

export const ElementBordersSchema = z.object({
  top: BorderSideSchema.optional(),
  right: BorderSideSchema.optional(),
  bottom: BorderSideSchema.optional(),
  left: BorderSideSchema.optional()
});

export const ElementPaddingSchema = z.object({
  top: z.number().nonnegative(),
  right: z.number().nonnegative(),
  bottom: z.number().nonnegative(),
  left: z.number().nonnegative()
});

export const ElementStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().positive().optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
  textDecoration: z.enum(['none', 'underline', 'line-through']).optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  textAlign: TextAlignmentSchema.optional(),
  verticalAlign: VerticalAlignmentSchema.optional(),
  lineHeight: z.number().positive().optional(),
  letterSpacing: z.number().optional(),
  opacity: z.number().min(0).max(1).optional(),
  borders: ElementBordersSchema.optional(),
  padding: ElementPaddingSchema.optional(),
  borderRadius: z.number().nonnegative().optional(),
  direction: TextDirectionSchema.optional(),
  wordWrap: z.boolean().optional()
});

export const PageMarginsSchema = z.object({
  top: z.number().nonnegative(),
  right: z.number().nonnegative(),
  bottom: z.number().nonnegative(),
  left: z.number().nonnegative()
});

export const PageSettingsSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  unit: UnitSchema,
  orientation: z.enum(['portrait', 'landscape']),
  margins: PageMarginsSchema,
  direction: TextDirectionSchema.optional(),
  paperSize: z.enum(['A3', 'A4', 'A5', 'Letter', 'Legal', 'Tabloid', 'Custom']).optional()
});

export const BaseElementSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  type: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  rotation: z.number().optional(),
  locked: z.boolean().optional(),
  hidden: z.boolean().optional(),
  condition: z.string().optional(),
  style: ElementStyleSchema.optional()
});

export const TextElementSchema = BaseElementSchema.extend({
  type: z.literal('text'),
  text: z.string(),
  multiline: z.boolean().optional(),
  autoHeight: z.boolean().optional(),
  format: z
    .object({
      type: z.enum(['string', 'number', 'currency', 'date']),
      pattern: z.string().optional(),
      currencySymbol: z.string().optional(),
      locale: z.string().optional()
    })
    .optional()
});

export const ShapeElementSchema = BaseElementSchema.extend({
  type: z.literal('shape'),
  shapeType: z.enum(['rectangle', 'rounded-rectangle', 'circle', 'ellipse', 'line']),
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().nonnegative().optional(),
  strokeStyle: BorderStyleSchema.optional(),
  borderRadius: z.number().nonnegative().optional()
});

export const ImageElementSchema = BaseElementSchema.extend({
  type: z.literal('image'),
  src: z.string(),
  fit: z.enum(['contain', 'cover', 'fill', 'none']).optional(),
  preserveAspectRatio: z.boolean().optional()
});

export const BarcodeElementSchema = BaseElementSchema.extend({
  type: z.literal('barcode'),
  value: z.string(),
  format: z.enum(['CODE128', 'EAN13', 'EAN8', 'UPCA', 'CODE39', 'ITF14']),
  includeText: z.boolean().optional(),
  barColor: z.string().optional(),
  backgroundColor: z.string().optional()
});

export const QRCodeElementSchema = BaseElementSchema.extend({
  type: z.literal('qrcode'),
  value: z.string(),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).optional(),
  darkColor: z.string().optional(),
  lightColor: z.string().optional()
});

export const TableCellSchema = z.object({
  id: z.string().min(1),
  colSpan: z.number().int().positive().optional(),
  rowSpan: z.number().int().positive().optional(),
  text: z.string().optional(),
  style: ElementStyleSchema.optional(),
  format: z
    .object({
      type: z.enum(['string', 'number', 'currency', 'date']),
      pattern: z.string().optional(),
      currencySymbol: z.string().optional(),
      locale: z.string().optional()
    })
    .optional()
});

export const TableRowSchema = z.object({
  id: z.string().min(1),
  height: z.number().positive(),
  cells: z.array(TableCellSchema),
  isHeader: z.boolean().optional(),
  isFooter: z.boolean().optional()
});

export const TableColumnSchema = z.object({
  id: z.string().min(1),
  width: z.number().positive()
});

export const TableElementSchema = BaseElementSchema.extend({
  type: z.literal('table'),
  dataSource: z.string().optional(),
  columns: z.array(TableColumnSchema),
  headerRows: z.array(TableRowSchema),
  bodyRows: z.array(TableRowSchema),
  footerRows: z.array(TableRowSchema).optional(),
  repeatHeaderOnEveryPage: z.boolean().optional(),
  keepTogether: z.boolean().optional(),
  groupBy: z.string().optional()
});

export const ChartDataPointSchema = z.object({
  label: z.string(),
  value: z.number()
});

export const ChartElementSchema = BaseElementSchema.extend({
  type: z.literal('chart'),
  chartType: z.enum(['bar', 'line', 'pie', 'donut']),
  title: z.string().optional(),
  dataSource: z.string().optional(),
  categoryField: z.string().optional(),
  valueField: z.string().optional(),
  data: z.array(ChartDataPointSchema).optional(),
  colors: z.array(z.string()).optional(),
  showLegend: z.boolean().optional(),
  showLabels: z.boolean().optional(),
  showGrid: z.boolean().optional()
});

export const ReportElementSchema = z.discriminatedUnion('type', [
  TextElementSchema,
  ShapeElementSchema,
  ImageElementSchema,
  BarcodeElementSchema,
  QRCodeElementSchema,
  TableElementSchema,
  ChartElementSchema
]);

export const SectionTypeSchema = z.enum([
  'pageHeader',
  'reportHeader',
  'groupHeader',
  'detail',
  'groupFooter',
  'reportFooter',
  'pageFooter'
]);

export const SectionDefinitionSchema = z.object({
  id: z.string().min(1),
  type: SectionTypeSchema,
  name: z.string(),
  height: z.number().nonnegative(),
  autoHeight: z.boolean().optional(),
  canGrow: z.boolean().optional(),
  canShrink: z.boolean().optional(),
  repeatOnEveryPage: z.boolean().optional(),
  pageBreakBefore: z.boolean().optional(),
  pageBreakAfter: z.boolean().optional(),
  keepTogether: z.boolean().optional(),
  condition: z.string().optional(),
  groupBy: z.string().optional(),
  dataSource: z.string().optional(),
  repeatForEachRecord: z.boolean().optional(),
  elements: z.array(ReportElementSchema)
});

export const ParameterDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'date']),
  defaultValue: z.unknown().optional(),
  label: z.string().optional(),
  required: z.boolean().optional()
});

export const VariableDefinitionSchema = z.object({
  name: z.string().min(1),
  expression: z.string(),
  initialValue: z.unknown().optional(),
  resetOn: z.enum(['none', 'page', 'group', 'report']).optional()
});

export const DataSourceDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['json', 'array', 'rest', 'custom']),
  data: z.unknown().optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional()
});

export const ReportDefinitionSchema = z.object({
  version: z.literal('1.0'),
  name: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  page: PageSettingsSchema,
  dataSources: z.array(DataSourceDefinitionSchema).default([]),
  parameters: z.array(ParameterDefinitionSchema).default([]),
  variables: z.array(VariableDefinitionSchema).default([]),
  sections: z.array(SectionDefinitionSchema).default([]),
  elements: z.array(ReportElementSchema).optional()
});

export function validateReportDefinition(input: unknown) {
  return ReportDefinitionSchema.safeParse(input);
}

export function parseReportDefinition(input: unknown) {
  return ReportDefinitionSchema.parse(input);
}
