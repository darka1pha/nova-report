export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'BOOLEAN'
  | 'NULL'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

export class Lexer {
  private pos = 0;
  private length: number;

  constructor(private input: string) {
    this.length = input.length;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.length) {
      this.skipWhitespace();
      if (this.pos >= this.length) break;

      const char = this.input[this.pos]!;

      // String literal: "..." or '...'
      if (char === '"' || char === "'") {
        tokens.push(this.readString(char));
        continue;
      }

      // Number literal
      const prevTok = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
      const isMemberDot =
        char === '.' &&
        Boolean(
          prevTok &&
            (prevTok.type === 'IDENTIFIER' ||
              prevTok.type === 'NUMBER' ||
              prevTok.value === ']' ||
              prevTok.value === ')')
        );

      if (this.isDigit(char) || (!isMemberDot && char === '.' && this.isDigit(this.peek(1)))) {
        tokens.push(this.readNumber());
        continue;
      }

      // Two-character operators: ==, !=, ===, !==, <=, >=, &&, ||
      const twoChar = this.input.substring(this.pos, this.pos + 2);
      const threeChar = this.input.substring(this.pos, this.pos + 3);

      if (threeChar === '===' || threeChar === '!==') {
        tokens.push({ type: 'OPERATOR', value: threeChar, pos: this.pos });
        this.pos += 3;
        continue;
      }

      if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChar)) {
        tokens.push({ type: 'OPERATOR', value: twoChar, pos: this.pos });
        this.pos += 2;
        continue;
      }

      // Single-character operators
      if (['+', '-', '*', '/', '%', '<', '>', '!'].includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char, pos: this.pos });
        this.pos++;
        continue;
      }

      // Punctuation & grouping
      if (['(', ')', '[', ']', '.', ',', '?', ':'].includes(char)) {
        tokens.push({ type: 'PUNCTUATION', value: char, pos: this.pos });
        this.pos++;
        continue;
      }

      // Identifier or Keyword
      if (this.isAlpha(char) || char === '_' || char === '$') {
        tokens.push(this.readIdentifier());
        continue;
      }

      throw new Error(`Unexpected character '${char}' at position ${this.pos}`);
    }

    tokens.push({ type: 'EOF', value: '', pos: this.pos });
    return tokens;
  }

  private skipWhitespace() {
    while (this.pos < this.length && /\s/.test(this.input[this.pos]!)) {
      this.pos++;
    }
  }

  private peek(offset = 0): string {
    return this.pos + offset < this.length ? this.input[this.pos + offset]! : '';
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private readString(quote: string): Token {
    const start = this.pos;
    this.pos++; // skip opening quote
    let str = '';

    while (this.pos < this.length) {
      const char = this.input[this.pos]!;
      if (char === '\\') {
        this.pos++;
        if (this.pos < this.length) {
          const next = this.input[this.pos]!;
          if (next === 'n') str += '\n';
          else if (next === 't') str += '\t';
          else if (next === 'r') str += '\r';
          else str += next;
          this.pos++;
        }
      } else if (char === quote) {
        this.pos++; // skip closing quote
        return { type: 'STRING', value: str, pos: start };
      } else {
        str += char;
        this.pos++;
      }
    }

    throw new Error(`Unterminated string literal starting at position ${start}`);
  }

  private readNumber(): Token {
    const start = this.pos;
    let numStr = '';
    let hasDot = false;

    while (this.pos < this.length) {
      const char = this.input[this.pos]!;
      if (this.isDigit(char)) {
        numStr += char;
        this.pos++;
      } else if (char === '.' && !hasDot && this.isDigit(this.peek(1))) {
        hasDot = true;
        numStr += char;
        this.pos++;
      } else {
        break;
      }
    }

    return { type: 'NUMBER', value: numStr, pos: start };
  }

  private readIdentifier(): Token {
    const start = this.pos;
    let ident = '';

    while (this.pos < this.length) {
      const char = this.input[this.pos]!;
      if (this.isAlpha(char) || this.isDigit(char) || char === '_' || char === '$') {
        ident += char;
        this.pos++;
      } else {
        break;
      }
    }

    if (ident === 'true' || ident === 'false') {
      return { type: 'BOOLEAN', value: ident, pos: start };
    }
    if (ident === 'null') {
      return { type: 'NULL', value: ident, pos: start };
    }

    return { type: 'IDENTIFIER', value: ident, pos: start };
  }
}
