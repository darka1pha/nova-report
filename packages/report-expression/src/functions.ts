export type ExpressionFunction = (...args: any[]) => any;

export const BUILTIN_FUNCTIONS: Record<string, ExpressionFunction> = {
  // String operations
  uppercase: (val: unknown) => String(val ?? '').toUpperCase(),
  lowercase: (val: unknown) => String(val ?? '').toLowerCase(),
  capitalize: (val: unknown) => {
    const s = String(val ?? '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
  trim: (val: unknown) => String(val ?? '').trim(),
  concat: (...args: unknown[]) => args.map(a => String(a ?? '')).join(''),
  coalesce: (...args: unknown[]) => {
    for (const a of args) {
      if (a !== null && a !== undefined && a !== '') return a;
    }
    return '';
  },
  contains: (str: unknown, search: unknown) => String(str ?? '').includes(String(search ?? '')),
  replace: (str: unknown, search: unknown, replacement: unknown) =>
    String(str ?? '').replace(new RegExp(String(search ?? ''), 'g'), String(replacement ?? '')),

  // Numeric operations
  round: (val: unknown, decimals = 2) => {
    const num = Number(val);
    if (isNaN(num)) return 0;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },
  abs: (val: unknown) => Math.abs(Number(val) || 0),
  ceil: (val: unknown) => Math.ceil(Number(val) || 0),
  floor: (val: unknown) => Math.floor(Number(val) || 0),
  minVal: (...args: unknown[]) => Math.min(...args.map(a => Number(a) || 0)),
  maxVal: (...args: unknown[]) => Math.max(...args.map(a => Number(a) || 0)),

  // Formatting helpers
  formatNumber: (val: unknown, decimals = 2, locale = 'en-US') => {
    const num = Number(val);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  },

  formatCurrency: (val: unknown, currency = 'USD', locale = 'en-US') => {
    const num = Number(val);
    if (isNaN(num)) return '$0.00';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      }).format(num);
    } catch {
      return `$${num.toFixed(2)}`;
    }
  },

  formatPercent: (val: unknown, decimals = 1, locale = 'en-US') => {
    const num = Number(val);
    if (isNaN(num)) return '0%';
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  },

  formatDate: (val: unknown, formatStr = 'YYYY-MM-DD') => {
    if (!val) return '';
    const date = val instanceof Date ? val : new Date(String(val));
    if (isNaN(date.getTime())) return String(val);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return formatStr
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },

  // Aggregation functions for collections
  SUM: (collection: unknown, path?: string) => {
    if (!Array.isArray(collection)) return 0;
    return collection.reduce((acc, item) => {
      const val = path ? getNestedValue(item, path) : item;
      const num = Number(val);
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  },

  COUNT: (collection: unknown) => {
    if (Array.isArray(collection)) return collection.length;
    return collection ? 1 : 0;
  },

  AVG: (collection: unknown, path?: string) => {
    if (!Array.isArray(collection) || collection.length === 0) return 0;
    const sum = BUILTIN_FUNCTIONS['SUM']!(collection, path);
    return sum / collection.length;
  },

  MIN: (collection: unknown, path?: string) => {
    if (!Array.isArray(collection) || collection.length === 0) return 0;
    let min = Infinity;
    for (const item of collection) {
      const val = path ? getNestedValue(item, path) : item;
      const num = Number(val);
      if (!isNaN(num) && num < min) min = num;
    }
    return min === Infinity ? 0 : min;
  },

  MAX: (collection: unknown, path?: string) => {
    if (!Array.isArray(collection) || collection.length === 0) return 0;
    let max = -Infinity;
    for (const item of collection) {
      const val = path ? getNestedValue(item, path) : item;
      const num = Number(val);
      if (!isNaN(num) && num > max) max = num;
    }
    return max === -Infinity ? 0 : max;
  }
};

function getNestedValue(obj: any, path: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[p];
  }
  return curr;
}
