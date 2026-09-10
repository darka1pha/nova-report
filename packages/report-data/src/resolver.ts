import type { ReportDefinition } from '@report/schema';
import { evaluateExpression } from '@report/expression';
import type { ReportDataContext } from './types.js';
import { DataSourceRegistry } from './sources.js';

export interface ResolveDataOptions {
  report: ReportDefinition;
  data?: Record<string, any> | any[];
  parameters?: Record<string, any>;
  registry?: DataSourceRegistry;
}

export async function resolveReportData(options: ResolveDataOptions): Promise<ReportDataContext> {
  const { report, data = {}, parameters = {}, registry = new DataSourceRegistry() } = options;

  // 1. Resolve parameters with defaults
  const resolvedParameters: Record<string, any> = {};
  for (const paramDef of report.parameters || []) {
    if (paramDef.name in parameters) {
      resolvedParameters[paramDef.name] = parameters[paramDef.name];
    } else if (paramDef.defaultValue !== undefined) {
      resolvedParameters[paramDef.name] = paramDef.defaultValue;
    } else {
      resolvedParameters[paramDef.name] = null;
    }
  }

  // Pass-through any extra runtime parameters
  for (const [key, val] of Object.entries(parameters)) {
    if (!(key in resolvedParameters)) {
      resolvedParameters[key] = val;
    }
  }

  // 2. Resolve data sources
  let resolvedData: Record<string, any>;
  if (Array.isArray(data)) {
    resolvedData = {
      data,
      items: data,
      rows: data
    };
    if (report.dataSources?.[0]?.name) {
      resolvedData[report.dataSources[0].name] = data;
    }
  } else {
    resolvedData = { ...data };
  }

  for (const dsDef of report.dataSources || []) {
    // If not already provided by runtime data
    if (!(dsDef.name in resolvedData)) {
      const source = registry.get(dsDef.name) || registry.createFromDefinition(dsDef);
      try {
        const result = await source.getData({ parameters: resolvedParameters, data: resolvedData });
        resolvedData[dsDef.name] = result;
      } catch (err) {
        console.warn(`Could not resolve data source '${dsDef.name}':`, err);
        resolvedData[dsDef.name] = dsDef.data || null;
      }
    }
  }

  // Provide convenient aliases for tables and expressions if an array exists
  if (!resolvedData.items || !Array.isArray(resolvedData.items)) {
    const arrayEntries = Object.entries(resolvedData).filter(([_, v]) => Array.isArray(v));
    if (arrayEntries.length > 0) {
      resolvedData.items = arrayEntries[0]![1];
      if (!resolvedData.data) resolvedData.data = arrayEntries[0]![1];
      if (!resolvedData.rows) resolvedData.rows = arrayEntries[0]![1];
    }
  }

  // 3. Resolve variables
  const resolvedVariables: Record<string, any> = {};
  const currentContext: ReportDataContext = {
    parameters: resolvedParameters,
    data: resolvedData,
    variables: resolvedVariables
  };

  for (const varDef of report.variables || []) {
    try {
      resolvedVariables[varDef.name] = evaluateExpression(varDef.expression, {
        ...currentContext,
        ...resolvedData,
        ...resolvedParameters
      });
    } catch {
      resolvedVariables[varDef.name] = varDef.initialValue ?? null;
    }
  }

  return {
    data: resolvedData,
    parameters: resolvedParameters,
    variables: resolvedVariables
  };
}
