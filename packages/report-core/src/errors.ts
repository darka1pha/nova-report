export type ReportErrorCode =
  | 'REPORT_SCHEMA_INVALID'
  | 'DATA_SOURCE_NOT_FOUND'
  | 'INVALID_EXPRESSION'
  | 'EXPORT_FAILED'
  | 'FONT_NOT_FOUND'
  | 'INVALID_ELEMENT'
  | 'PAGINATION_FAILED';

export class ReportError extends Error {
  public readonly code: ReportErrorCode;
  public readonly path?: string;
  public readonly details?: unknown;

  constructor(code: ReportErrorCode, message: string, options?: { path?: string; details?: unknown }) {
    super(message);
    this.name = 'ReportError';
    this.code = code;
    this.path = options?.path;
    this.details = options?.details;
  }
}
