import {
  validateReportDefinition,
  createBlankReport,
  type ReportDefinition
} from '@report/schema';
import { resolveReportData } from '@report/data';
import { paginateReport, type RenderedDocument } from '@report/pagination';
import { ReportError } from './errors.js';

export interface RenderReportOptions {
  report: ReportDefinition | string;
  data?: Record<string, any> | any[];
  parameters?: Record<string, any>;
}

export function createReport(name = 'New Report'): ReportDefinition {
  return createBlankReport(name);
}

export function validateReport(input: unknown): { valid: boolean; errors?: string[] } {
  const result = validateReportDefinition(input);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return { valid: false, errors };
  }
  return { valid: true };
}

export function loadReport(input: string | ReportDefinition): ReportDefinition {
  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch (e: any) {
      throw new ReportError('REPORT_SCHEMA_INVALID', `Failed to parse JSON string: ${e.message}`);
    }
  }

  const validation = validateReportDefinition(parsed);
  if (!validation.success) {
    const details = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new ReportError('REPORT_SCHEMA_INVALID', `Invalid report definition: ${details}`, {
      details: validation.error.errors
    });
  }

  return validation.data as ReportDefinition;
}

export async function renderReport(options: RenderReportOptions): Promise<RenderedDocument> {
  const report = typeof options.report === 'string' ? loadReport(options.report) : options.report;

  try {
    const context = await resolveReportData({
      report,
      data: options.data,
      parameters: options.parameters
    });

    const renderedDoc = paginateReport(report, context);
    return renderedDoc;
  } catch (error: any) {
    if (error instanceof ReportError) throw error;
    throw new ReportError('PAGINATION_FAILED', `Report rendering failed: ${error.message}`, {
      details: error
    });
  }
}
