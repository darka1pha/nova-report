import type { ASTNode } from './ast.js';
import { Lexer, type Token } from './lexer.js';

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    const node = this.parseExpression();
    if (!this.isAtEnd()) {
      throw new Error(`Unexpected extra token '${this.peek().value}' at position ${this.peek().pos}`);
    }
    return node;
  }

  // Precedence levels:
  // 1. Conditional (ternary: test ? a : b)
  // 2. Logical OR (||)
  // 3. Logical AND (&&)
  // 4. Equality (==, !=, ===, !==)
  // 5. Relational (<, <=, >, >=)
  // 6. Additive (+, -)
  // 7. Multiplicative (*, /, %)
  // 8. Unary (!, -, +)
  // 9. Member, Call, Indexing
  // 10. Primary (literal, identifier, grouped)

  private parseExpression(): ASTNode {
    return this.parseConditional();
  }

  private parseConditional(): ASTNode {
    let expr = this.parseLogicalOr();

    if (this.matchPunctuation('?')) {
      const consequent = this.parseExpression();
      this.consumePunctuation(':', "Expected ':' in conditional expression");
      const alternate = this.parseConditional();
      expr = {
        type: 'Conditional',
        test: expr,
        consequent,
        alternate
      };
    }

    return expr;
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();
    while (this.matchOperator('||')) {
      const right = this.parseLogicalAnd();
      expr = { type: 'Binary', operator: '||', left: expr, right };
    }
    return expr;
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality();
    while (this.matchOperator('&&')) {
      const right = this.parseEquality();
      expr = { type: 'Binary', operator: '&&', left: expr, right };
    }
    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseRelational();
    while (this.matchOperators(['==', '!=', '===', '!=='])) {
      const operator = this.previous().value as any;
      const right = this.parseRelational();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private parseRelational(): ASTNode {
    let expr = this.parseAdditive();
    while (this.matchOperators(['<', '<=', '>', '>='])) {
      const operator = this.previous().value as any;
      const right = this.parseAdditive();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private parseAdditive(): ASTNode {
    let expr = this.parseMultiplicative();
    while (this.matchOperators(['+', '-'])) {
      const operator = this.previous().value as any;
      const right = this.parseMultiplicative();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private parseMultiplicative(): ASTNode {
    let expr = this.parseUnary();
    while (this.matchOperators(['*', '/', '%'])) {
      const operator = this.previous().value as any;
      const right = this.parseUnary();
      expr = { type: 'Binary', operator, left: expr, right };
    }
    return expr;
  }

  private parseUnary(): ASTNode {
    if (this.matchOperators(['!', '-', '+'])) {
      const operator = this.previous().value as any;
      const argument = this.parseUnary();
      return { type: 'Unary', operator, argument };
    }
    return this.parsePostfix();
  }

  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.matchPunctuation('.')) {
        const propToken = this.consume('IDENTIFIER', "Expected property name after '.'");
        expr = {
          type: 'Member',
          object: expr,
          property: propToken.value,
          computed: false
        };
      } else if (this.matchPunctuation('[')) {
        const indexExpr = this.parseExpression();
        this.consumePunctuation(']', "Expected ']' after index");
        expr = {
          type: 'Member',
          object: expr,
          property: (indexExpr as any).value !== undefined ? String((indexExpr as any).value) : '',
          computed: true
        };
      } else if (this.matchPunctuation('(')) {
        if (expr.type !== 'Identifier') {
          throw new Error(`Cannot invoke non-function expression at position ${this.previous().pos}`);
        }
        const args = this.parseArguments();
        this.consumePunctuation(')', "Expected ')' after arguments");
        expr = {
          type: 'Call',
          callee: expr.name,
          args
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private parseArguments(): ASTNode[] {
    const args: ASTNode[] = [];
    if (this.checkPunctuation(')')) {
      return args;
    }
    do {
      args.push(this.parseExpression());
    } while (this.matchPunctuation(','));
    return args;
  }

  private parsePrimary(): ASTNode {
    if (this.match('NUMBER')) {
      return { type: 'Literal', value: Number(this.previous().value) };
    }
    if (this.match('STRING')) {
      return { type: 'Literal', value: this.previous().value };
    }
    if (this.match('BOOLEAN')) {
      return { type: 'Literal', value: this.previous().value === 'true' };
    }
    if (this.match('NULL')) {
      return { type: 'Literal', value: null };
    }
    if (this.match('IDENTIFIER')) {
      return { type: 'Identifier', name: this.previous().value };
    }
    if (this.matchPunctuation('[')) {
      const elements: ASTNode[] = [];
      if (!this.checkPunctuation(']')) {
        do {
          elements.push(this.parseExpression());
        } while (this.matchPunctuation(','));
      }
      this.consumePunctuation(']', "Expected ']' at end of array");
      return { type: 'Array', elements };
    }
    if (this.matchPunctuation('(')) {
      const expr = this.parseExpression();
      this.consumePunctuation(')', "Expected ')' after grouped expression");
      return expr;
    }

    throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
  }

  private match(type: string): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchOperator(op: string): boolean {
    if (this.check('OPERATOR') && this.peek().value === op) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchOperators(ops: string[]): boolean {
    if (this.check('OPERATOR') && ops.includes(this.peek().value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchPunctuation(char: string): boolean {
    if (this.check('PUNCTUATION') && this.peek().value === char) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkPunctuation(char: string): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === 'PUNCTUATION' && this.peek().value === char;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current]!;
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!;
  }

  private consume(type: string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} at position ${this.peek().pos}`);
  }

  private consumePunctuation(char: string, message: string): Token {
    if (this.checkPunctuation(char)) return this.advance();
    throw new Error(`${message} at position ${this.peek().pos}`);
  }
}

export function parseExpression(code: string): ASTNode {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}
