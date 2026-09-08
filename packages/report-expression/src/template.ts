import { parseExpression } from './parser.js';
import { Evaluator, type EvaluationContext } from './evaluator.js';

const defaultEvaluator = new Evaluator();

export function evaluateExpression(code: string, context: EvaluationContext = {}, evaluator = defaultEvaluator): any {
  const ast = parseExpression(code.trim());
  return evaluator.evaluate(ast, context);
}

/**
 * Interpolates string templates with {{ expression }} tags.
 * If the entire string is just `{{expr}}`, returns the raw evaluated value (e.g. number or object).
 * Otherwise returns the interpolated string.
 */
export function interpolateTemplate(
  template: string,
  context: EvaluationContext = {},
  evaluator = defaultEvaluator
): any {
  if (!template || typeof template !== 'string') return template;

  const trimmed = template.trim();
  const singleMatch = trimmed.match(/^\{\{\s*(.+?)\s*\}\}$/);
  if (singleMatch && singleMatch[1]) {
    try {
      return evaluateExpression(singleMatch[1], context, evaluator);
    } catch {
      return '';
    }
  }

  return template.replace(/\{\{\s*(.+?)\s*\}\}/g, (_, expr) => {
    try {
      const res = evaluateExpression(expr, context, evaluator);
      return res !== null && res !== undefined ? String(res) : '';
    } catch {
      return '';
    }
  });
}
