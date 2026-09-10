export interface ReportDataContext {
  parameters?: Record<string, any>;
  variables?: Record<string, any>;
  data?: Record<string, any> | any[];
}

export interface ReportDataSource {
  readonly name: string;
  getData(context: ReportDataContext): Promise<unknown>;
}
