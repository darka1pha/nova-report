import type { ReportExporter, ExportOptions } from './types.js';
import type { RenderedDocument } from '@report/core';
import { ReportError } from '@report/core';

export class ExporterRegistry {
  private static instance: ExporterRegistry;
  private exporters: Map<string, ReportExporter> = new Map();

  public static getInstance(): ExporterRegistry {
    if (!ExporterRegistry.instance) {
      ExporterRegistry.instance = new ExporterRegistry();
    }
    return ExporterRegistry.instance;
  }

  public register(exporter: ReportExporter) {
    this.exporters.set(exporter.format.toLowerCase(), exporter);
  }

  public get(format: string): ReportExporter | undefined {
    return this.exporters.get(format.toLowerCase());
  }

  public async export(renderedDoc: RenderedDocument, options: ExportOptions): Promise<Uint8Array> {
    const exporter = this.get(options.format);
    if (!exporter) {
      throw new ReportError('EXPORT_FAILED', `No exporter registered for format '${options.format}'`);
    }
    return await exporter.export(renderedDoc, options);
  }
}

export function registerExporter(exporter: ReportExporter) {
  ExporterRegistry.getInstance().register(exporter);
}

export async function exportDocument(
  renderedDoc: RenderedDocument,
  options: ExportOptions
): Promise<Uint8Array> {
  return await ExporterRegistry.getInstance().export(renderedDoc, options);
}
