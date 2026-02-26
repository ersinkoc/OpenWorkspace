/**
 * Minimal JSON5 parser for config files.
 * Zero-dependency implementation supporting JSON5 superset features:
 * - Single-line (//) and multi-line comments
 * - Trailing commas in objects and arrays
 * - Unquoted object keys (identifiers)
 * - Single-quoted strings
 * - Multi-line strings (via \)
 * - Hexadecimal numbers
 * - Leading/trailing decimal points (.5, 5.)
 * - Positive infinity, negative infinity, NaN
 * - Plus sign on numbers (+1)
 */

import type { Result } from '../result.js';
import { ok, err } from '../result.js';
import { ConfigError } from '../errors.js';

type Json5Value = string | number | boolean | null | Json5Value[] | { [key: string]: Json5Value };

/**
 * Internal parser state.
 */
class Json5Parser {
  private pos = 0;
  private readonly input: string;
  private readonly length: number;

  constructor(input: string) {
    this.input = input;
    this.length = input.length;
  }

  parse(): Json5Value {
    this.skipWhitespaceAndComments();
    const value = this.parseValue();
    this.skipWhitespaceAndComments();
    if (this.pos < this.length) {
      throw new ConfigError(`Unexpected character at position ${this.pos}: '${this.current()}'`);
    }
    return value;
  }

  private current(): string {
    return this.input.charAt(this.pos);
  }

  private peek(offset: number = 0): string {
    return this.input.charAt(this.pos + offset);
  }

  private advance(count: number = 1): void {
    this.pos += count;
  }

  private expect(ch: string): void {
    if (this.current() !== ch) {
      throw new ConfigError(`Expected '${ch}' at position ${this.pos}, got '${this.current()}'`);
    }
    this.advance();
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.length) {
      const ch = this.current();

      // Whitespace
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.advance();
        continue;
      }

      // Single-line comment
      if (ch === '/' && this.peek(1) === '/') {
        this.advance(2);
        while (this.pos < this.length && this.current() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Multi-line comment
      if (ch === '/' && this.peek(1) === '*') {
        this.advance(2);
        while (this.pos < this.length) {
          if (this.current() === '*' && this.peek(1) === '/') {
            this.advance(2);
            break;
          }
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  private parseValue(): Json5Value {
    if (this.pos >= this.length) {
      throw new ConfigError('Unexpected end of input');
    }

    const ch = this.current();

    if (ch === '{') return this.parseObject();
    if (ch === '[') return this.parseArray();
    if (ch === '"' || ch === "'") return this.parseString();
    if (ch === '-' || ch === '+' || ch === '.' || (ch >= '0' && ch <= '9')) return this.parseNumber();
    if (ch === 't' || ch === 'f') return this.parseBoolean();
    if (ch === 'n') return this.parseNull();
    if (ch === 'I') return this.parseInfinity(false);
    if (ch === 'N') return this.parseNaN();

    throw new ConfigError(`Unexpected character '${ch}' at position ${this.pos}`);
  }

  private parseObject(): { [key: string]: Json5Value } {
    this.expect('{');
    this.skipWhitespaceAndComments();

    const obj: { [key: string]: Json5Value } = {};

    if (this.current() === '}') {
      this.advance();
      return obj;
    }

    while (this.pos < this.length) {
      this.skipWhitespaceAndComments();

      // Allow trailing comma
      if (this.current() === '}') {
        this.advance();
        return obj;
      }

      // Parse key (quoted or unquoted)
      const key = this.parseKey();

      this.skipWhitespaceAndComments();
      this.expect(':');
      this.skipWhitespaceAndComments();

      const value = this.parseValue();
      obj[key] = value;

      this.skipWhitespaceAndComments();

      if (this.current() === ',') {
        this.advance();
        continue;
      }

      if (this.current() === '}') {
        this.advance();
        return obj;
      }

      throw new ConfigError(`Expected ',' or '}' at position ${this.pos}`);
    }

    throw new ConfigError('Unterminated object');
  }

  private parseArray(): Json5Value[] {
    this.expect('[');
    this.skipWhitespaceAndComments();

    const arr: Json5Value[] = [];

    if (this.current() === ']') {
      this.advance();
      return arr;
    }

    while (this.pos < this.length) {
      this.skipWhitespaceAndComments();

      // Allow trailing comma
      if (this.current() === ']') {
        this.advance();
        return arr;
      }

      arr.push(this.parseValue());
      this.skipWhitespaceAndComments();

      if (this.current() === ',') {
        this.advance();
        continue;
      }

      if (this.current() === ']') {
        this.advance();
        return arr;
      }

      throw new ConfigError(`Expected ',' or ']' at position ${this.pos}`);
    }

    throw new ConfigError('Unterminated array');
  }

  private parseKey(): string {
    const ch = this.current();
    if (ch === '"' || ch === "'") {
      return this.parseString();
    }
    return this.parseIdentifier();
  }

  private parseIdentifier(): string {
    const start = this.pos;
    while (this.pos < this.length) {
      const ch = this.current();
      if (
        (ch >= 'a' && ch <= 'z') ||
        (ch >= 'A' && ch <= 'Z') ||
        (ch >= '0' && ch <= '9') ||
        ch === '_' || ch === '$'
      ) {
        this.advance();
      } else {
        break;
      }
    }

    if (this.pos === start) {
      throw new ConfigError(`Expected identifier at position ${this.pos}`);
    }

    return this.input.slice(start, this.pos);
  }

  private parseString(): string {
    const quote = this.current();
    this.advance();

    let result = '';

    while (this.pos < this.length) {
      const ch = this.current();

      if (ch === quote) {
        this.advance();
        return result;
      }

      if (ch === '\\') {
        this.advance();
        if (this.pos >= this.length) {
          throw new ConfigError('Unexpected end of string');
        }
        const escaped = this.current();
        this.advance();

        switch (escaped) {
          case '"': result += '"'; break;
          case "'": result += "'"; break;
          case '\\': result += '\\'; break;
          case '/': result += '/'; break;
          case 'b': result += '\b'; break;
          case 'f': result += '\f'; break;
          case 'n': result += '\n'; break;
          case 'r': result += '\r'; break;
          case 't': result += '\t'; break;
          case 'u': {
            let hex = '';
            for (let i = 0; i < 4; i++) {
              if (this.pos >= this.length) throw new ConfigError('Invalid unicode escape');
              hex += this.current();
              this.advance();
            }
            result += String.fromCharCode(parseInt(hex, 16));
            break;
          }
          case '\n': break; // Line continuation
          case '\r': {
            // Line continuation (CRLF)
            if (this.current() === '\n') this.advance();
            break;
          }
          default:
            result += escaped;
        }
      } else {
        result += ch;
        this.advance();
      }
    }

    throw new ConfigError('Unterminated string');
  }

  private parseNumber(): number {
    const start = this.pos;
    let ch = this.current();

    // Sign
    if (ch === '+' || ch === '-') {
      // Check for +/-Infinity
      if (this.peek(1) === 'I') {
        const negative = ch === '-';
        this.advance();
        return this.parseInfinity(negative);
      }
      this.advance();
      ch = this.current();
    }

    // Hex
    if (ch === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
      this.advance(2);
      while (this.pos < this.length) {
        const hex = this.current();
        if (
          (hex >= '0' && hex <= '9') ||
          (hex >= 'a' && hex <= 'f') ||
          (hex >= 'A' && hex <= 'F')
        ) {
          this.advance();
        } else {
          break;
        }
      }
      return Number(this.input.slice(start, this.pos));
    }

    // Integer part
    while (this.pos < this.length && this.current() >= '0' && this.current() <= '9') {
      this.advance();
    }

    // Decimal part
    if (this.pos < this.length && this.current() === '.') {
      this.advance();
      while (this.pos < this.length && this.current() >= '0' && this.current() <= '9') {
        this.advance();
      }
    }

    // Exponent
    if (this.pos < this.length && (this.current() === 'e' || this.current() === 'E')) {
      this.advance();
      if (this.pos < this.length && (this.current() === '+' || this.current() === '-')) {
        this.advance();
      }
      while (this.pos < this.length && this.current() >= '0' && this.current() <= '9') {
        this.advance();
      }
    }

    const numStr = this.input.slice(start, this.pos);
    const num = Number(numStr);
    if (isNaN(num) && numStr !== 'NaN') {
      throw new ConfigError(`Invalid number: ${numStr}`);
    }
    return num;
  }

  private parseBoolean(): boolean {
    if (this.input.startsWith('true', this.pos)) {
      this.advance(4);
      return true;
    }
    if (this.input.startsWith('false', this.pos)) {
      this.advance(5);
      return false;
    }
    throw new ConfigError(`Unexpected identifier at position ${this.pos}`);
  }

  private parseNull(): null {
    if (this.input.startsWith('null', this.pos)) {
      this.advance(4);
      return null;
    }
    throw new ConfigError(`Unexpected identifier at position ${this.pos}`);
  }

  private parseInfinity(negative: boolean): number {
    if (this.input.startsWith('Infinity', this.pos)) {
      this.advance(8);
      return negative ? -Infinity : Infinity;
    }
    throw new ConfigError(`Unexpected identifier at position ${this.pos}`);
  }

  private parseNaN(): number {
    if (this.input.startsWith('NaN', this.pos)) {
      this.advance(3);
      return NaN;
    }
    throw new ConfigError(`Unexpected identifier at position ${this.pos}`);
  }
}

/**
 * Parse a JSON5 string into a JavaScript value.
 *
 * @example
 * const result = parseJson5(`{
 *   // Comment
 *   name: 'test',
 *   value: 42,
 * }`);
 * if (result.ok) console.log(result.value); // { name: 'test', value: 42 }
 */
export function parseJson5(input: string): Result<Json5Value, ConfigError> {
  try {
    const trimmed = input.trim();
    if (trimmed === '') {
      return ok(null);
    }
    const parser = new Json5Parser(trimmed);
    return ok(parser.parse());
  } catch (error) {
    if (error instanceof ConfigError) {
      return err(error);
    }
    const message = error instanceof Error ? error.message : String(error);
    return err(new ConfigError(`JSON5 parse error: ${message}`));
  }
}

/**
 * JSON5 value type.
 */
export type { Json5Value };
