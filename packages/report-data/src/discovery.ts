import type { DataSourceDefinition, ParameterDefinition, VariableDefinition } from '@report/schema';
import { interpolateTemplate } from '@report/expression';

export interface DiscoveredField {
  path: string;
  name: string;
  expression: string;
  source: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  sample: any;
  formattedSample: string;
}

export interface DiscoveredItemField {
  key: string;
  itemPath: string;
  expression: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  sample: any;
  formattedSample: string;
}

export interface DiscoveredCollection {
  path: string;
  name: string;
  source: string;
  itemCount: number;
  sampleItems: any[];
  itemFields: DiscoveredItemField[];
}

export interface DiscoveredSchema {
  fields: DiscoveredField[];
  collections: DiscoveredCollection[];
  systemFields: DiscoveredField[];
  functions: { name: string; signature: string; example: string; description: string }[];
}

function detectType(val: any): 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' {
  if (val === null || val === undefined) return 'string';
  if (Array.isArray(val)) return 'array';
  if (typeof val === 'number') return 'number';
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'string') {
    // Check if ISO date string (YYYY-MM-DD...)
    if (/^\d{4}-\d{2}-\d{2}/.test(val) && !isNaN(Date.parse(val))) {
      return 'date';
    }
    return 'string';
  }
  return 'object';
}

function formatSampleValue(val: any): string {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return `[${val.length} items]`;
    return '{...}';
  }
  return String(val);
}

/**
 * Traverses report data sources, parameters, and variables to discover
 * all bindable scalar fields, nested properties, and iterable collections.
 */
export function discoverReportDataSchema(
  dataSources: DataSourceDefinition[] = [],
  parameters: ParameterDefinition[] = [],
  variables: VariableDefinition[] = []
): DiscoveredSchema {
  const fields: DiscoveredField[] = [];
  const collections: DiscoveredCollection[] = [];

  // 1. Traverse Data Sources
  for (const ds of dataSources) {
    const dsData = ds.data;
    if (!dsData || typeof dsData !== 'object') continue;

    function traverse(obj: any, currentPath: string) {
      if (!obj || typeof obj !== 'object') return;

      if (Array.isArray(obj)) {
        // Discovered an array collection
        const itemFields: DiscoveredItemField[] = [];
        const sampleItem = obj[0];

        if (sampleItem && typeof sampleItem === 'object') {
          for (const key of Object.keys(sampleItem)) {
            const val = sampleItem[key];
            const t = detectType(val);
            if (t !== 'array' && t !== 'object') {
              itemFields.push({
                key,
                itemPath: `item.${key}`,
                expression: `{{item.${key}}}`,
                type: t as any,
                sample: val,
                formattedSample: formatSampleValue(val)
              });
            }
          }
        }

        collections.push({
          path: currentPath,
          name: currentPath.split('.').pop() || currentPath,
          source: ds.name,
          itemCount: obj.length,
          sampleItems: obj.slice(0, 5),
          itemFields
        });
        return;
      }

      // Plain Object properties
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        const path = currentPath ? `${currentPath}.${key}` : key;
        const type = detectType(val);

        if (type === 'object') {
          traverse(val, path);
        } else if (type === 'array') {
          traverse(val, path);
        } else {
          fields.push({
            path,
            name: key,
            expression: `{{${path}}}`,
            source: ds.name,
            type,
            sample: val,
            formattedSample: formatSampleValue(val)
          });
        }
      }
    }

    traverse(dsData, ds.name);
  }

  // 2. Traverse Parameters
  for (const param of parameters) {
    const path = `parameters.${param.name}`;
    fields.push({
      path,
      name: param.name,
      expression: `{{${path}}}`,
      source: 'parameters',
      type: (param.type as any) || 'string',
      sample: param.defaultValue ?? '',
      formattedSample: formatSampleValue(param.defaultValue)
    });
  }

  // 3. Traverse Variables
  for (const v of variables) {
    const path = `variables.${v.name}`;
    fields.push({
      path,
      name: v.name,
      expression: `{{${path}}}`,
      source: 'variables',
      type: 'string',
      sample: v.expression,
      formattedSample: v.expression
    });
  }

  // 4. Built-in System Fields
  const systemFields: DiscoveredField[] = [
    {
      path: 'pageNumber',
      name: 'Current Page Number',
      expression: '{{pageNumber}}',
      source: 'system',
      type: 'number',
      sample: 1,
      formattedSample: '1'
    },
    {
      path: 'totalPages',
      name: 'Total Document Pages',
      expression: '{{totalPages}}',
      source: 'system',
      type: 'number',
      sample: 3,
      formattedSample: '3'
    }
  ];

  // 5. Standard Calculation & Formatting Functions
  const functions = [
    {
      name: 'formatCurrency',
      signature: 'formatCurrency(value, currency?, locale?)',
      example: '{{formatCurrency(invoice.total)}}',
      description: 'Formats a number into locale-aware currency ($1,234.56)'
    },
    {
      name: 'formatDate',
      signature: 'formatDate(date, format?)',
      example: '{{formatDate(invoice.date, "yyyy-MM-dd")}}',
      description: 'Formats a date into desired display format'
    },
    {
      name: 'SUM',
      signature: 'SUM(collection.field)',
      example: '{{SUM(invoice.items.total)}}',
      description: 'Calculates the sum of numeric values across a collection'
    },
    {
      name: 'COUNT',
      signature: 'COUNT(collection)',
      example: '{{COUNT(invoice.items)}}',
      description: 'Returns the total number of items in a collection'
    },
    {
      name: 'AVG',
      signature: 'AVG(collection.field)',
      example: '{{AVG(invoice.items.unitPrice)}}',
      description: 'Calculates the arithmetic average of numeric values'
    },
    {
      name: 'upper',
      signature: 'upper(text)',
      example: '{{upper(invoice.company.name)}}',
      description: 'Converts text to uppercase'
    },
    {
      name: 'lower',
      signature: 'lower(text)',
      example: '{{lower(invoice.customer.email)}}',
      description: 'Converts text to lowercase'
    }
  ];

  return {
    fields,
    collections,
    systemFields,
    functions
  };
}

/**
 * Resolves a preview string for an expression template using data source samples.
 */
export function previewExpressionTemplate(
  template: string,
  dataSources: DataSourceDefinition[] = []
): string {
  if (!template) return '';
  const contextData: Record<string, any> = {};

  for (const ds of dataSources) {
    if (ds.data) {
      contextData[ds.name] = ds.data;
    }
  }

  // Inject sample system fields
  const fullContext = {
    ...contextData,
    pageNumber: 1,
    totalPages: 1
  };

  try {
    return interpolateTemplate(template, fullContext);
  } catch {
    return template;
  }
}
