/**
 * Robust path resolver for objects and arrays.
 * Supports dot notation ('invoice.customer.name'), bracket indexing ('items[0].price'),
 * array index dot notation ('items.0.price'), and default array bindings ('items', 'data', '.').
 */
export function resolvePathValue(obj: any, path?: string): any {
  if (obj === null || obj === undefined) return undefined;

  // If path is empty, '.' or generic array aliases
  if (!path || path === '.' || path === 'items' || path === 'data' || path === 'rows') {
    if (Array.isArray(obj)) return obj;
    if (typeof obj === 'object') {
      if (path && path in obj) return obj[path];
      if (Array.isArray(obj.items)) return obj.items;
      if (Array.isArray(obj.data)) return obj.data;
      if (Array.isArray(obj.rows)) return obj.rows;
      // If there's only one array property on obj, resolve to it
      const arrayVals = Object.values(obj).filter(v => Array.isArray(v));
      if (arrayVals.length === 1) return arrayVals[0];
    }
    if (!path || path === '.') return obj;
  }

  // Exact property match
  if (typeof obj === 'object' && path in obj) {
    return obj[path];
  }

  // Normalize bracket notation e.g. "users[0].name" -> "users.0.name"
  const normalized = path.replace(/\[(\w+)\]/g, '.$1');
  const parts = normalized.split('.').filter(Boolean);

  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined) return undefined;
    curr = curr[part];
  }

  return curr;
}
