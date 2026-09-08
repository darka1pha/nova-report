import type { DataSourceDefinition } from '@report/schema';
import type { ReportDataContext, ReportDataSource } from './types.js';

export class JsonDataSource implements ReportDataSource {
  constructor(public readonly name: string, private data: unknown) {}

  async getData(_context: ReportDataContext): Promise<unknown> {
    return this.data;
  }
}

export class RestDataSource implements ReportDataSource {
  constructor(
    public readonly name: string,
    private url: string,
    private headers?: Record<string, string>
  ) {}

  async getData(_context: ReportDataContext): Promise<unknown> {
    const response = await fetch(this.url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch data source '${this.name}' from ${this.url}: ${response.statusText}`);
    }

    return await response.json();
  }
}

export class CustomDataSource implements ReportDataSource {
  constructor(
    public readonly name: string,
    private fetcher: (context: ReportDataContext) => Promise<unknown> | unknown
  ) {}

  async getData(context: ReportDataContext): Promise<unknown> {
    return await this.fetcher(context);
  }
}

export class DataSourceRegistry {
  private sources: Map<string, ReportDataSource> = new Map();

  public register(source: ReportDataSource) {
    this.sources.set(source.name, source);
  }

  public get(name: string): ReportDataSource | undefined {
    return this.sources.get(name);
  }

  public createFromDefinition(def: DataSourceDefinition): ReportDataSource {
    switch (def.type) {
      case 'json':
      case 'array':
        return new JsonDataSource(def.name, def.data);
      case 'rest':
        if (!def.url) throw new Error(`REST data source '${def.name}' missing URL`);
        return new RestDataSource(def.name, def.url, def.headers);
      default:
        return new JsonDataSource(def.name, def.data);
    }
  }
}
