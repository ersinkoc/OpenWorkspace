/**
 * CLI output formatter module.
 * Supports table, JSON, plain (TSV), and CSV output formats.
 * Zero dependencies.
 */

export type OutputFormat = 'table' | 'json' | 'plain' | 'csv';

export type FormatterOptions = {
  columns?: string[];
  noHeader?: boolean;
  maxWidth?: number;
};

/**
 * Format data for CLI output in the specified format.
 *
 * Handles single objects, arrays of objects, arrays of primitives, and
 * bare primitives (string, number, boolean, null/undefined).
 */
export function formatOutput(
  data: unknown,
  format: OutputFormat,
  options: FormatterOptions = {},
): string {
  const rows = normalizeData(data);

  switch (format) {
    case 'json':
      return formatJson(data);
    case 'plain':
      return formatPlain(rows, options);
    case 'csv':
      return formatCsv(rows, options);
    case 'table':
    default:
      return formatTable(rows, options);
  }
}

/**
 * Detect the desired output format from CLI flags.
 *
 * Checks `flags.json`, `flags.plain`, and `flags.csv` (boolean or string
 * truthy values). Falls back to `'table'`.
 */
export function detectFormat(
  flags: Record<string, string | boolean | string[]>,
): OutputFormat {
  if (isTruthy(flags['json'])) return 'json';
  if (isTruthy(flags['plain'])) return 'plain';
  if (isTruthy(flags['csv'])) return 'csv';
  return 'table';
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

function isTruthy(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'string' && value !== '' && value !== '0' && value.toLowerCase() !== 'false') return true;
  return false;
}

/**
 * Normalise arbitrary data into an array of record-like rows so every
 * formatter can work with a consistent shape.
 */
function normalizeData(data: unknown): Row[] {
  if (data === null || data === undefined) {
    return [{ value: String(data) }];
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return [];

    return data.map((item) => {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return item as Row;
      }
      return { value: item } as Row;
    });
  }

  if (typeof data === 'object') {
    return [data as Row];
  }

  // primitive
  return [{ value: data }];
}

function getColumns(rows: Row[], options: FormatterOptions): string[] {
  if (options.columns && options.columns.length > 0) {
    return options.columns;
  }

  if (rows.length === 0) return [];

  // Collect all keys across every row to handle heterogeneous objects.
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    }
  }

  return ordered;
}

function cellValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function truncate(text: string, max: number): string {
  if (max <= 0) return text;
  if (text.length <= max) return text;
  if (max <= 3) return text.slice(0, max);
  return text.slice(0, max - 3) + '...';
}

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') return true;
  if (typeof value === 'string' && value !== '' && !isNaN(Number(value))) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Table formatter
// ---------------------------------------------------------------------------

function formatTable(rows: Row[], options: FormatterOptions): string {
  if (rows.length === 0) return '';

  const columns = getColumns(rows, options);
  if (columns.length === 0) return '';

  // Build cell grid (string[][]) and track column widths.
  const grid: string[][] = [];
  const widths: number[] = columns.map((col) => col.length);

  for (const row of rows) {
    const cells: string[] = [];
    for (let i = 0; i < columns.length; i++) {
      const colName = columns[i] as string;
      let cell = cellValue(row[colName]);
      if (options.maxWidth && options.maxWidth > 0) {
        cell = truncate(cell, options.maxWidth);
      }
      cells.push(cell);
      if (cell.length > (widths[i] as number)) {
        widths[i] = cell.length;
      }
    }
    grid.push(cells);
  }

  // Track which columns hold only numeric data (for right-alignment).
  const numericCol: boolean[] = columns.map((_, ci) =>
    rows.every((row) => {
      const colName = columns[ci] as string;
      const v = row[colName];
      return v === undefined || v === null || isNumeric(v);
    }),
  );

  // Helpers to draw horizontal rules and data rows.
  const sep = '+' + widths.map((w) => '-'.repeat(w + 2)).join('+') + '+';

  const renderRow = (cells: string[], isHeader: boolean): string => {
    const parts = cells.map((cell, i) => {
      const w = widths[i] as number;
      if (!isHeader && numericCol[i]) {
        return ' ' + cell.padStart(w) + ' ';
      }
      return ' ' + cell.padEnd(w) + ' ';
    });
    return '|' + parts.join('|') + '|';
  };

  const lines: string[] = [];

  if (!options.noHeader) {
    const headerCells = columns.map((col, i) => col.padEnd(widths[i] as number));
    lines.push(sep);
    lines.push(
      '|' + headerCells.map((c, i) => ' ' + c.padEnd(widths[i] as number) + ' ').join('|') + '|',
    );
    lines.push(sep);
  } else {
    lines.push(sep);
  }

  for (const cells of grid) {
    lines.push(renderRow(cells, false));
  }

  lines.push(sep);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// JSON formatter
// ---------------------------------------------------------------------------

function formatJson(data: unknown): string {
  return JSON.stringify(data ?? null, null, 2);
}

// ---------------------------------------------------------------------------
// Plain (TSV) formatter
// ---------------------------------------------------------------------------

function formatPlain(rows: Row[], options: FormatterOptions): string {
  if (rows.length === 0) return '';

  const columns = getColumns(rows, options);
  if (columns.length === 0) return '';

  const lines: string[] = [];

  if (!options.noHeader) {
    lines.push(columns.join('\t'));
  }

  for (const row of rows) {
    const cells = columns.map((col) => cellValue(row[col]));
    lines.push(cells.join('\t'));
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CSV formatter (RFC 4180)
// ---------------------------------------------------------------------------

function csvEscape(value: string): string {
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function formatCsv(rows: Row[], options: FormatterOptions): string {
  if (rows.length === 0) return '';

  const columns = getColumns(rows, options);
  if (columns.length === 0) return '';

  const lines: string[] = [];

  if (!options.noHeader) {
    lines.push(columns.map(csvEscape).join(','));
  }

  for (const row of rows) {
    const cells = columns.map((col) => csvEscape(cellValue(row[col])));
    lines.push(cells.join(','));
  }

  return lines.join('\n');
}
