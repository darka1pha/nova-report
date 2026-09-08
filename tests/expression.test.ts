import { describe, it, expect } from 'vitest';
import {
  evaluateExpression,
  interpolateTemplate,
  parseExpression
} from '../packages/report-expression/src/index.js';

describe('Safe Expression & Aggregation Engine', () => {
  it('evaluates basic math and boolean logic', () => {
    expect(evaluateExpression('2 + 3 * 4')).toBe(14);
    expect(evaluateExpression('(10 - 4) / 2')).toBe(3);
    expect(evaluateExpression('10 > 5 && 3 < 4')).toBe(true);
    expect(evaluateExpression('5 > 10 || 2 == 2')).toBe(true);
  });

  it('evaluates conditional ternary expressions', () => {
    expect(evaluateExpression('total > 100 ? "High" : "Low"', { total: 150 })).toBe('High');
    expect(evaluateExpression('total > 100 ? "High" : "Low"', { total: 50 })).toBe('Low');
  });

  it('evaluates member expressions on context data', () => {
    const context = {
      customer: { name: 'Acme Corp', address: { city: 'New York' } },
      items: [10, 20, 30]
    };
    expect(evaluateExpression('customer.name', context)).toBe('Acme Corp');
    expect(evaluateExpression('customer.address.city', context)).toBe('New York');
  });

  it('evaluates formatting functions', () => {
    expect(evaluateExpression('uppercase("hello world")')).toBe('HELLO WORLD');
    expect(evaluateExpression('round(123.456, 2)')).toBe(123.46);
    expect(evaluateExpression('formatDate("2026-09-08", "YYYY/MM/DD")')).toBe('2026/09/08');
  });

  it('evaluates collection aggregations (SUM, COUNT, AVG, MIN, MAX)', () => {
    const context = {
      items: [
        { name: 'A', price: 100 },
        { name: 'B', price: 200 },
        { name: 'C', price: 300 }
      ]
    };

    expect(evaluateExpression('SUM(items, "price")', context)).toBe(600);
    expect(evaluateExpression('COUNT(items)', context)).toBe(3);
    expect(evaluateExpression('AVG(items, "price")', context)).toBe(200);
    expect(evaluateExpression('MIN(items, "price")', context)).toBe(100);
    expect(evaluateExpression('MAX(items, "price")', context)).toBe(300);
  });

  it('interpolates template strings with {{ ... }} tags', () => {
    const context = {
      invoice: { id: 'INV-99', total: 1500 }
    };
    expect(interpolateTemplate('Invoice #{{invoice.id}} Total: {{invoice.total}}', context)).toBe(
      'Invoice #INV-99 Total: 1500'
    );
  });
});
