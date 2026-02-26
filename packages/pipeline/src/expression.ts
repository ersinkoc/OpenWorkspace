/**
 * Expression evaluator for pipeline expressions.
 * Supports variable access, arithmetic, comparisons, logical operators,
 * function calls, ternary, and string concatenation.
 *
 * Uses a simple tokenizer + recursive descent parser + evaluator.
 */

/**
 * Expression evaluation context.
 */
export type ExpressionContext = {
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  steps: Record<string, unknown>;
  env: Record<string, string | undefined>;
  vars: Record<string, unknown>;
  item?: unknown;
  index?: number;
};

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

type TokenType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'null'
  | 'identifier'
  | 'dot'
  | 'lparen'
  | 'rparen'
  | 'lbracket'
  | 'rbracket'
  | 'comma'
  | 'plus'
  | 'minus'
  | 'star'
  | 'slash'
  | 'percent'
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'and'
  | 'or'
  | 'not'
  | 'question'
  | 'colon'
  | 'eof';

type Token = {
  type: TokenType;
  value: unknown;
  pos: number;
};

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input.charAt(i);

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      i++;
      continue;
    }

    // String literals
    if (ch === "'" || ch === '"') {
      const quote = ch;
      let str = '';
      i++; // skip opening quote
      while (i < input.length && input.charAt(i) !== quote) {
        if (input.charAt(i) === '\\' && i + 1 < input.length) {
          const next = input.charAt(i + 1);
          if (next === 'n') { str += '\n'; i += 2; continue; }
          if (next === 't') { str += '\t'; i += 2; continue; }
          if (next === '\\') { str += '\\'; i += 2; continue; }
          if (next === quote) { str += quote; i += 2; continue; }
        }
        str += input.charAt(i);
        i++;
      }
      if (i >= input.length) {
        throw new Error('Unterminated string literal at position ' + String(i));
      }
      i++; // skip closing quote
      tokens.push({ type: 'string', value: str, pos: i });
      continue;
    }

    // Numbers
    if ((ch >= '0' && ch <= '9') || (ch === '.' && i + 1 < input.length && input.charAt(i + 1) >= '0' && input.charAt(i + 1) <= '9')) {
      let num = '';
      let hasDot = false;
      while (i < input.length) {
        const c = input.charAt(i);
        if (c >= '0' && c <= '9') {
          num += c;
          i++;
        } else if (c === '.' && !hasDot) {
          hasDot = true;
          num += c;
          i++;
        } else {
          break;
        }
      }
      tokens.push({ type: 'number', value: parseFloat(num), pos: i });
      continue;
    }

    // Two-character operators
    if (i + 1 < input.length) {
      const twoChar = ch + input.charAt(i + 1);
      if (twoChar === '==') { tokens.push({ type: 'eq', value: '==', pos: i }); i += 2; continue; }
      if (twoChar === '!=') { tokens.push({ type: 'neq', value: '!=', pos: i }); i += 2; continue; }
      if (twoChar === '>=') { tokens.push({ type: 'gte', value: '>=', pos: i }); i += 2; continue; }
      if (twoChar === '<=') { tokens.push({ type: 'lte', value: '<=', pos: i }); i += 2; continue; }
      if (twoChar === '&&') { tokens.push({ type: 'and', value: '&&', pos: i }); i += 2; continue; }
      if (twoChar === '||') { tokens.push({ type: 'or', value: '||', pos: i }); i += 2; continue; }
    }

    // Single-character operators
    if (ch === '>') { tokens.push({ type: 'gt', value: '>', pos: i }); i++; continue; }
    if (ch === '<') { tokens.push({ type: 'lt', value: '<', pos: i }); i++; continue; }
    if (ch === '!') { tokens.push({ type: 'not', value: '!', pos: i }); i++; continue; }
    if (ch === '+') { tokens.push({ type: 'plus', value: '+', pos: i }); i++; continue; }
    if (ch === '-') { tokens.push({ type: 'minus', value: '-', pos: i }); i++; continue; }
    if (ch === '*') { tokens.push({ type: 'star', value: '*', pos: i }); i++; continue; }
    if (ch === '/') { tokens.push({ type: 'slash', value: '/', pos: i }); i++; continue; }
    if (ch === '%') { tokens.push({ type: 'percent', value: '%', pos: i }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen', value: '(', pos: i }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ')', pos: i }); i++; continue; }
    if (ch === '[') { tokens.push({ type: 'lbracket', value: '[', pos: i }); i++; continue; }
    if (ch === ']') { tokens.push({ type: 'rbracket', value: ']', pos: i }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ',', pos: i }); i++; continue; }
    if (ch === '.') { tokens.push({ type: 'dot', value: '.', pos: i }); i++; continue; }
    if (ch === '?') { tokens.push({ type: 'question', value: '?', pos: i }); i++; continue; }
    if (ch === ':') { tokens.push({ type: 'colon', value: ':', pos: i }); i++; continue; }

    // Identifiers and keywords
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let ident = '';
      while (i < input.length) {
        const c = input.charAt(i);
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_') {
          ident += c;
          i++;
        } else {
          break;
        }
      }

      if (ident === 'true') {
        tokens.push({ type: 'boolean', value: true, pos: i });
      } else if (ident === 'false') {
        tokens.push({ type: 'boolean', value: false, pos: i });
      } else if (ident === 'null') {
        tokens.push({ type: 'null', value: null, pos: i });
      } else {
        tokens.push({ type: 'identifier', value: ident, pos: i });
      }
      continue;
    }

    throw new Error('Unexpected character: ' + JSON.stringify(ch) + ' at position ' + String(i));
  }

  tokens.push({ type: 'eof', value: null, pos: i });
  return tokens;
}

// ---------------------------------------------------------------------------
// Parser + Evaluator (recursive descent)
// ---------------------------------------------------------------------------

/**
 * Built-in function implementations.
 */
const BUILTIN_FUNCTIONS: Record<string, (...args: unknown[]) => unknown> = {
  length(value: unknown): number {
    if (typeof value === 'string') return value.length;
    if (Array.isArray(value)) return value.length;
    throw new Error('length() expects a string or array');
  },

  contains(haystack: unknown, needle: unknown): boolean {
    if (typeof haystack === 'string' && typeof needle === 'string') {
      return haystack.includes(needle);
    }
    if (Array.isArray(haystack)) {
      return haystack.includes(needle);
    }
    throw new Error('contains() expects a string or array as first argument');
  },

  startsWith(str: unknown, prefix: unknown): boolean {
    if (typeof str === 'string' && typeof prefix === 'string') {
      return str.startsWith(prefix);
    }
    throw new Error('startsWith() expects two strings');
  },

  endsWith(str: unknown, suffix: unknown): boolean {
    if (typeof str === 'string' && typeof suffix === 'string') {
      return str.endsWith(suffix);
    }
    throw new Error('endsWith() expects two strings');
  },

  join(arr: unknown, sep: unknown): string {
    if (!Array.isArray(arr)) {
      throw new Error('join() expects an array as first argument');
    }
    const separator = typeof sep === 'string' ? sep : ',';
    return arr.map(item => String(item)).join(separator);
  },

  toUpper(str: unknown): string {
    if (typeof str !== 'string') {
      throw new Error('toUpper() expects a string');
    }
    return str.toUpperCase();
  },

  toLower(str: unknown): string {
    if (typeof str !== 'string') {
      throw new Error('toLower() expects a string');
    }
    return str.toLowerCase();
  },
};

class Parser {
  private tokens: Token[];
  private pos: number;
  private context: ExpressionContext;

  constructor(tokens: Token[], context: ExpressionContext) {
    this.tokens = tokens;
    this.pos = 0;
    this.context = context;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: 'eof', value: null, pos: -1 };
  }

  private advance(): Token {
    const token = this.tokens[this.pos] ?? { type: 'eof', value: null, pos: -1 };
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(
        'Expected ' + type + ' but got ' + token.type + ' at position ' + String(token.pos)
      );
    }
    return this.advance();
  }

  /**
   * Entry point: parse a full expression.
   * expression = ternary
   */
  parse(): unknown {
    const result = this.parseTernary();
    if (this.peek().type !== 'eof') {
      throw new Error('Unexpected token: ' + String(this.peek().value) + ' at position ' + String(this.peek().pos));
    }
    return result;
  }

  /**
   * ternary = logicalOr ('?' ternary ':' ternary)?
   */
  private parseTernary(): unknown {
    const condition = this.parseLogicalOr();

    if (this.peek().type === 'question') {
      this.advance(); // consume '?'
      const trueVal = this.parseTernary();
      this.expect('colon');
      const falseVal = this.parseTernary();
      return condition ? trueVal : falseVal;
    }

    return condition;
  }

  /**
   * logicalOr = logicalAnd ('||' logicalAnd)*
   */
  private parseLogicalOr(): unknown {
    let left = this.parseLogicalAnd();

    while (this.peek().type === 'or') {
      this.advance();
      const right = this.parseLogicalAnd();
      left = left || right;
    }

    return left;
  }

  /**
   * logicalAnd = equality ('&&' equality)*
   */
  private parseLogicalAnd(): unknown {
    let left = this.parseEquality();

    while (this.peek().type === 'and') {
      this.advance();
      const right = this.parseEquality();
      left = left && right;
    }

    return left;
  }

  /**
   * equality = comparison (('==' | '!=') comparison)*
   */
  private parseEquality(): unknown {
    let left = this.parseComparison();

    while (this.peek().type === 'eq' || this.peek().type === 'neq') {
      const op = this.advance().type;
      const right = this.parseComparison();
      if (op === 'eq') {
        left = left === right;
      } else {
        left = left !== right;
      }
    }

    return left;
  }

  /**
   * comparison = addition (('>' | '>=' | '<' | '<=') addition)*
   */
  private parseComparison(): unknown {
    let left = this.parseAddition();

    while (
      this.peek().type === 'gt' ||
      this.peek().type === 'gte' ||
      this.peek().type === 'lt' ||
      this.peek().type === 'lte'
    ) {
      const op = this.advance().type;
      const right = this.parseAddition();
      const l = left as number;
      const r = right as number;
      if (op === 'gt') left = l > r;
      else if (op === 'gte') left = l >= r;
      else if (op === 'lt') left = l < r;
      else left = l <= r;
    }

    return left;
  }

  /**
   * addition = multiplication (('+' | '-') multiplication)*
   */
  private parseAddition(): unknown {
    let left = this.parseMultiplication();

    while (this.peek().type === 'plus' || this.peek().type === 'minus') {
      const op = this.advance().type;
      const right = this.parseMultiplication();

      if (op === 'plus') {
        // String concatenation if either operand is a string
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left) + String(right);
        } else {
          left = (left as number) + (right as number);
        }
      } else {
        left = (left as number) - (right as number);
      }
    }

    return left;
  }

  /**
   * multiplication = unary (('*' | '/' | '%') unary)*
   */
  private parseMultiplication(): unknown {
    let left = this.parseUnary();

    while (
      this.peek().type === 'star' ||
      this.peek().type === 'slash' ||
      this.peek().type === 'percent'
    ) {
      const op = this.advance().type;
      const right = this.parseUnary();
      const l = left as number;
      const r = right as number;
      if (op === 'star') left = l * r;
      else if (op === 'slash') left = l / r;
      else left = l % r;
    }

    return left;
  }

  /**
   * unary = ('!' | '-') unary | postfix
   */
  private parseUnary(): unknown {
    if (this.peek().type === 'not') {
      this.advance();
      const operand = this.parseUnary();
      return !operand;
    }

    if (this.peek().type === 'minus') {
      this.advance();
      const operand = this.parseUnary();
      return -(operand as number);
    }

    return this.parsePostfix();
  }

  /**
   * postfix = primary ('.' identifier | '[' expression ']')*
   */
  private parsePostfix(): unknown {
    let value = this.parsePrimary();

    while (true) {
      if (this.peek().type === 'dot') {
        this.advance(); // consume '.'
        const propToken = this.expect('identifier');
        const propName = propToken.value as string;

        if (value !== null && value !== undefined && typeof value === 'object') {
          value = (value as Record<string, unknown>)[propName];
        } else {
          value = undefined;
        }
      } else if (this.peek().type === 'lbracket') {
        this.advance(); // consume '['
        const index = this.parseTernary();
        this.expect('rbracket');

        if (value !== null && value !== undefined && typeof value === 'object') {
          value = (value as Record<string | number, unknown>)[index as string | number];
        } else {
          value = undefined;
        }
      } else {
        break;
      }
    }

    return value;
  }

  /**
   * primary = number | string | boolean | null
   *         | identifier ('(' args ')')? ('.' identifier)*
   *         | '(' expression ')'
   */
  private parsePrimary(): unknown {
    const token = this.peek();

    if (token.type === 'number') {
      this.advance();
      return token.value;
    }

    if (token.type === 'string') {
      this.advance();
      return token.value;
    }

    if (token.type === 'boolean') {
      this.advance();
      return token.value;
    }

    if (token.type === 'null') {
      this.advance();
      return null;
    }

    if (token.type === 'lparen') {
      this.advance(); // consume '('
      const result = this.parseTernary();
      this.expect('rparen');
      return result;
    }

    if (token.type === 'identifier') {
      const name = token.value as string;
      this.advance();

      // Check if this is a function call
      if (this.peek().type === 'lparen') {
        return this.parseFunctionCall(name);
      }

      // Variable resolution
      return this.resolveVariable(name);
    }

    throw new Error(
      'Unexpected token: ' + String(token.type) + ' (' + String(token.value) + ') at position ' + String(token.pos)
    );
  }

  /**
   * Parse function call arguments: '(' (expr (',' expr)*)? ')'
   */
  private parseFunctionCall(name: string): unknown {
    this.expect('lparen');
    const args: unknown[] = [];

    if (this.peek().type !== 'rparen') {
      args.push(this.parseTernary());
      while (this.peek().type === 'comma') {
        this.advance();
        args.push(this.parseTernary());
      }
    }

    this.expect('rparen');

    const fn = BUILTIN_FUNCTIONS[name];
    if (!fn) {
      throw new Error('Unknown function: ' + name);
    }

    return fn(...args);
  }

  /**
   * Resolve a variable name from context.
   */
  private resolveVariable(name: string): unknown {
    switch (name) {
      case 'inputs':
        return this.context.inputs;
      case 'outputs':
        return this.context.outputs;
      case 'steps':
        return this.context.steps;
      case 'env':
        return this.context.env;
      case 'vars':
        return this.context.vars;
      case 'item':
        return this.context.item;
      case 'index':
        return this.context.index;
      default:
        throw new Error('Unknown variable: ' + name);
    }
  }
}

/**
 * Evaluates an expression string within the given context.
 *
 * @example
 * const result = evaluateExpression("inputs.name == 'test'", context);
 * // returns true or false
 *
 * @example
 * const result = evaluateExpression("length(inputs.items) > 0", context);
 * // returns true if items has elements
 */
export function evaluateExpression(expr: string, context: ExpressionContext): unknown {
  const trimmed = expr.trim();
  if (trimmed === '') {
    throw new Error('Empty expression');
  }

  const tokens = tokenize(trimmed);
  const parser = new Parser(tokens, context);
  return parser.parse();
}
