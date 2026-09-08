import type { RenderedDocument } from '@report/core';

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'xlsx' | 'html' | 'svg' | 'png' | string;
  data?: Record<string, any>;
  parameters?: Record<string, any>;
  title?: string;
  author?: string;
  [key: string]: any;
}

export interface ReportExporter {
  readonly format: string;
  export(renderedDoc: RenderedDocument, options?: ExportOptions): Promise<Uint8Array>;
}
