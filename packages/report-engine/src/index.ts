import type { ReportDefinition } from '@report/schema';
import { renderReport as coreRenderReport } from '@report/core';
import { exportDocument, type ExportOptions } from '@report/exporter';
import '@report/exporter-pdf';
import '@report/exporter-docx';
import '@report/exporter-xlsx';
import '@report/exporter-html';

export * from '@report/schema';
export * from '@report/expression';
export * from '@report/data';
export * from '@report/layout';
export * from '@report/pagination';
export * from '@report/core';
export * from '@report/exporter';

export interface ExportReportOptions extends ExportOptions {
  report: ReportDefinition | string;
}

export async function exportReport(options: ExportReportOptions): Promise<Uint8Array> {
  const renderedDoc = await coreRenderReport({
    report: options.report,
    data: options.data,
    parameters: options.parameters
  });

  return await exportDocument(renderedDoc, options);
}
