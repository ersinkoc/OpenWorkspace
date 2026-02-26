/**
 * Minimal YAML parser for pipeline workflows.
 * Zero-dependency implementation supporting a subset of YAML.
 */

import type { Result } from '@openworkspace/core';
import { ok, err, ValidationError } from '@openworkspace/core';

/**
 * Parsed YAML value types.
 */
export type YamlValue =
  | string
  | number
  | boolean
  | null
  | YamlValue[]
  | { [key: string]: YamlValue };

/**
 * Parsed line with metadata.
 */
type ParsedLine = {
  indent: number;
  content: string;
  lineNumber: number;
};

/**
 * Strips inline comments from a line (respecting quoted strings).
 */
function stripComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble) {
      if (i === 0 || line.charAt(i - 1) === ' ' || line.charAt(i - 1) === '\t') {
        return line.slice(0, i).trimEnd();
      }
    }
  }
  return line;
}

/**
 * Prepare lines: strip comments, skip blanks, record indent.
 */
function prepareLines(input: string): ParsedLine[] {
  const rawLines = input.split('\n');
  const result: ParsedLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i] ?? '';
    const trimmed = raw.trim();

    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }

    const indent = raw.length - raw.trimStart().length;
    const content = stripComment(raw.trimStart());

    if (content !== '') {
      result.push({ indent, content, lineNumber: i + 1 });
    }
  }

  return result;
}

/**
 * Parse a scalar value from a string.
 */
function parseScalar(value: string): YamlValue {
  const trimmed = value.trim();

  if (trimmed === '' || trimmed === 'null' || trimmed === '~') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1);
    if (trimmed.startsWith('"')) {
      return inner
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
    return inner;
  }

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return parseFloat(trimmed);
  }

  return trimmed;
}

/**
 * Find the index of an unquoted colon followed by space or end-of-string.
 */
function findUnquotedColon(str: string): number {
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charAt(i);
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ':' && !inSingle && !inDouble) {
      if (i + 1 >= str.length || str.charAt(i + 1) === ' ') {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Parse a block of lines starting from `start` at or deeper than `baseIndent`.
 */
function parseBlock(
  lines: ParsedLine[],
  start: number,
  baseIndent: number
): Result<{ value: YamlValue; next: number }, ValidationError> {
  const firstLine = lines[start]!;

  const lineIndent = firstLine.indent;

  if (firstLine.content.startsWith('- ') || firstLine.content === '-') {
    return parseArrayBlock(lines, start, lineIndent);
  }

  if (findUnquotedColon(firstLine.content) >= 0) {
    return parseObjectBlock(lines, start, lineIndent);
  }

  return ok({ value: parseScalar(firstLine.content), next: start + 1 });
}

/**
 * Parse an array block.
 */
function parseArrayBlock(
  lines: ParsedLine[],
  start: number,
  blockIndent: number
): Result<{ value: YamlValue[]; next: number }, ValidationError> {
  const arr: YamlValue[] = [];
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line || line.indent < blockIndent) break;
    if (line.indent > blockIndent) {
      return err(new ValidationError(`Inconsistent indentation at line ${line.lineNumber}`));
    }

    if (!line.content.startsWith('- ') && line.content !== '-') {
      break;
    }

    const afterDash = line.content === '-' ? '' : line.content.slice(2).trim();

    if (afterDash === '') {
      i++;
      if (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine && nextLine.indent > blockIndent) {
          const result = parseBlock(lines, i, nextLine.indent);
          if (!result.ok) return result;
          arr.push(result.value.value);
          i = result.value.next;
        } else {
          arr.push(null);
        }
      } else {
        arr.push(null);
      }
      continue;
    }

    // Check if afterDash contains a key:value (inline object in array)
    const colonIdx = findUnquotedColon(afterDash);
    if (colonIdx > 0) {
      const syntheticIndent = blockIndent + 2;
      const syntheticLines: ParsedLine[] = [
        { indent: syntheticIndent, content: afterDash, lineNumber: line.lineNumber },
      ];

      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (!nextLine || nextLine.indent <= blockIndent) break;
        syntheticLines.push(nextLine);
        j++;
      }

      const result = parseObjectBlock(syntheticLines, 0, syntheticIndent);
      if (!result.ok) return result;
      arr.push(result.value.value);
      i = j;
    } else {
      arr.push(parseScalar(afterDash));
      i++;
    }
  }

  return ok({ value: arr, next: i });
}

/**
 * Parse an object block.
 */
function parseObjectBlock(
  lines: ParsedLine[],
  start: number,
  blockIndent: number
): Result<{ value: Record<string, YamlValue>; next: number }, ValidationError> {
  const obj: Record<string, YamlValue> = {};
  let i = start;

  while (i < lines.length) {
    const line = lines[i];
    if (!line || line.indent < blockIndent) break;
    if (line.indent > blockIndent) {
      return err(new ValidationError(`Inconsistent indentation at line ${line.lineNumber}`));
    }

    const colonIdx = findUnquotedColon(line.content);
    if (colonIdx < 0) {
      break;
    }

    const key = line.content.slice(0, colonIdx).trim();
    const afterColon = line.content.slice(colonIdx + 1).trim();

    if (afterColon === '' || afterColon === '|' || afterColon === '>') {
      i++;
      if (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine && nextLine.indent > blockIndent) {
          if (afterColon === '|' || afterColon === '>') {
            const strLines: string[] = [];
            const strIndent = nextLine.indent;
            while (i < lines.length) {
              const sLine = lines[i];
              if (!sLine || sLine.indent < strIndent) break;
              strLines.push(sLine.content);
              i++;
            }
            obj[key] = afterColon === '|'
              ? strLines.join('\n')
              : strLines.join(' ');
          } else {
            const result = parseBlock(lines, i, nextLine.indent);
            if (!result.ok) return result;
            obj[key] = result.value.value;
            i = result.value.next;
          }
        } else {
          obj[key] = null;
        }
      } else {
        obj[key] = null;
      }
    } else {
      obj[key] = parseScalar(afterColon);
      i++;
    }
  }

  return ok({ value: obj, next: i });
}

/**
 * Parse YAML string into a JavaScript value.
 * @example
 * const result = parseYaml('name: test\nvalue: 42');
 * if (result.ok) console.log(result.value); // { name: 'test', value: 42 }
 */
export function parseYaml(input: string): Result<YamlValue, ValidationError> {
  const trimmed = input.trim();
  if (trimmed === '') {
    return ok(null);
  }

  const lines = prepareLines(trimmed);
  if (lines.length === 0) {
    return ok(null);
  }

  const firstLine = lines[0]!;

  // Single scalar with no structure
  if (
    lines.length === 1 &&
    !firstLine.content.startsWith('- ') &&
    firstLine.content !== '-' &&
    findUnquotedColon(firstLine.content) < 0
  ) {
    return ok(parseScalar(firstLine.content));
  }

  const result = parseBlock(lines, 0, firstLine.indent);
  if (!result.ok) return result;
  return ok(result.value.value);
}

/**
 * Stringify a JavaScript value to YAML.
 * @example
 * const yaml = stringifyYaml({ name: 'test', value: 42 });
 * console.log(yaml); // "name: test\nvalue: 42"
 */
export function stringifyYaml(value: YamlValue, indent: number = 0): string {
  const spaces = '  '.repeat(indent);

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    if (
      value === '' ||
      value.includes(' ') ||
      value.includes(':') ||
      value.includes('#') ||
      value.includes('\n') ||
      value.startsWith('-') ||
      value.startsWith('>') ||
      value.startsWith('@') ||
      ['true', 'false', 'null', '~'].includes(value)
    ) {
      return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value.map(item => `${spaces}- ${stringifyYaml(item, indent + 1).trimStart()}`).join('\n');
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return '{}';
  }

  return entries
    .map(([key, val]) => {
      const stringifiedValue = stringifyYaml(val, indent + 1);
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        return `${spaces}${key}:\n${stringifiedValue}`;
      }
      if (Array.isArray(val) && val.length > 0) {
        return `${spaces}${key}:\n${stringifiedValue}`;
      }
      return `${spaces}${key}: ${stringifiedValue}`;
    })
    .join('\n');
}
