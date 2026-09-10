import type { ASTNode } from './ast.js';
import { BUILTIN_FUNCTIONS, type ExpressionFunction } from './functions.js';

export interface EvaluationContext {
  data?: Record<string, any>;
  parameters?: Record<string, any>;
  variables?: Record<string, any>;
  item?: any;
  index?: number;
  pageNumber?: number;
  totalPages?: number;
  [key: string]: any;
}

export class Evaluator {
  private customFunctions: Map<string, ExpressionFunction> = new Map();

  constructor(customFunctions?: Record<string, ExpressionFunction>) {
    if (customFunctions) {
      for (const [name, fn] of Object.entries(customFunctions)) {
        this.customFunctions.set(name, fn);
      }
    }
  }

  public registerFunction(name: string, fn: ExpressionFunction) {
    this.customFunctions.set(name, fn);
  }

  public evaluate(node: ASTNode, context: EvaluationContext = {}): any {
    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Identifier':
        return this.resolveIdentifier(node.name, context);

      case 'Member': {
        const target = this.evaluate(node.object, context);
        if (target === null || target === undefined) return undefined;
        let prop = node.property;
        if (node.computed && typeof target === 'object' && !(prop in target)) {
          const resolved = this.resolveIdentifier(prop, context);
          if (resolved !== undefined) {
            prop = String(resolved);
          }
        }
        return target[prop];
      }

      case 'Array':
        return node.elements.map(el => this.evaluate(el, context));

      case 'Unary': {
        const arg = this.evaluate(node.argument, context);
        switch (node.operator) {
          case '!':
            return !arg;
          case '-':
            return -Number(arg);
          case '+':
            return +Number(arg);
        }
        break;
      }

      case 'Binary': {
        const left = this.evaluate(node.left, context);
        const right = this.evaluate(node.right, context);

        switch (node.operator) {
          case '+':
            if (typeof left === 'string' || typeof right === 'string') {
              return String(left ?? '') + String(right ?? '');
            }
            return Number(left ?? 0) + Number(right ?? 0);
          case '-':
            return Number(left ?? 0) - Number(right ?? 0);
          case '*':
            return Number(left ?? 0) * Number(right ?? 0);
          case '/':
            return Number(right) === 0 ? 0 : Number(left ?? 0) / Number(right);
          case '%':
            return Number(left ?? 0) % Number(right ?? 1);
          case '==':
            return left == right;
          case '!=':
            return left != right;
          case '===':
            return left === right;
          case '!==':
            return left !== right;
          case '<':
            return Number(left) < Number(right);
          case '<=':
            return Number(left) <= Number(right);
          case '>':
            return Number(left) > Number(right);
          case '>=':
            return Number(left) >= Number(right);
          case '&&':
            return left && right;
          case '||':
            return left || right;
        }
        break;
      }

      case 'Conditional': {
        const test = this.evaluate(node.test, context);
        return test ? this.evaluate(node.consequent, context) : this.evaluate(node.alternate, context);
      }

      case 'Call': {
        const fn = this.customFunctions.get(node.callee) || BUILTIN_FUNCTIONS[node.callee];
        if (!fn) {
          throw new Error(`Unknown function: '${node.callee}'`);
        }
        const evaluatedArgs = node.args.map(arg => this.evaluate(arg, context));
        return fn(...evaluatedArgs);
      }
    }

    return null;
  }

  private resolveIdentifier(name: string, context: EvaluationContext): any {
    // 1. Direct top-level context properties (item, index, pageNumber, totalPages)
    if (name in context) {
      return context[name];
    }
    // 2. Data record
    if (context.data && name in context.data) {
      return context.data[name];
    }
    // 3. Parameters
    if (context.parameters && name in context.parameters) {
      return context.parameters[name];
    }
    // 4. Variables
    if (context.variables && name in context.variables) {
      return context.variables[name];
    }
    // 5. Item properties if evaluating inside an item
    if (context.item && typeof context.item === 'object' && name in context.item) {
      return context.item[name];
    }

    return undefined;
  }
}
