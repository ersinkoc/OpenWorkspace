/**
 * Formatting operations for Google Sheets.
 * Apply bold, colors, borders, alignment, and number formats to cells.
 * All functions take an HttpClient as the first parameter and return Result types.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  BatchUpdateSpreadsheetResponse,
  CellFormat,
  FormatCellsOptions,
  GridRange,
} from './types.js';

/**
 * Sheets API v4 base URL.
 */
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Builds the `fields` mask string from a CellFormat object.
 * Traverses the format recursively to find all leaf paths that map to the
 * Sheets API `repeatCell.cell.userEnteredFormat.*` field masks.
 *
 * @param format - The cell format whose set properties should be included.
 * @returns A comma-separated field mask string (e.g. "userEnteredFormat(bold,italic)").
 */
function buildFieldMask(format: CellFormat): string {
  const paths: string[] = [];

  if (format.numberFormat !== undefined) {
    paths.push('userEnteredFormat.numberFormat');
  }
  if (format.backgroundColor !== undefined) {
    paths.push('userEnteredFormat.backgroundColor');
  }
  if (format.borders !== undefined) {
    paths.push('userEnteredFormat.borders');
  }
  if (format.padding !== undefined) {
    paths.push('userEnteredFormat.padding');
  }
  if (format.horizontalAlignment !== undefined) {
    paths.push('userEnteredFormat.horizontalAlignment');
  }
  if (format.verticalAlignment !== undefined) {
    paths.push('userEnteredFormat.verticalAlignment');
  }
  if (format.wrapStrategy !== undefined) {
    paths.push('userEnteredFormat.wrapStrategy');
  }
  if (format.textFormat !== undefined) {
    paths.push('userEnteredFormat.textFormat');
  }

  return paths.join(',');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Applies formatting to a range of cells.
 *
 * Supports bold, italic, font size, font family, foreground and background
 * colors, borders, alignment, wrap strategy, padding, and number format.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param options - Formatting options including range, format, and optional field mask.
 * @returns The batch update response on success.
 *
 * @example
 * ```ts
 * // Make the first row bold with a blue background
 * const result = await formatCells(http, 'abc123', {
 *   range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
 *   format: {
 *     textFormat: { bold: true },
 *     backgroundColor: { red: 0.8, green: 0.9, blue: 1.0 },
 *   },
 * });
 * if (result.ok) console.log('Formatting applied');
 * ```
 *
 * @example
 * ```ts
 * // Apply currency number format to a column
 * const result = await formatCells(http, 'abc123', {
 *   range: { sheetId: 0, startColumnIndex: 2, endColumnIndex: 3 },
 *   format: {
 *     numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
 *     horizontalAlignment: 'RIGHT',
 *   },
 * });
 * ```
 */
export async function formatCells(
  http: HttpClient,
  spreadsheetId: string,
  options: FormatCellsOptions,
): Promise<Result<BatchUpdateSpreadsheetResponse, WorkspaceError>> {
  const fields = options.fields ?? buildFieldMask(options.format);

  if (!fields) {
    return err(
      new WorkspaceError(
        'No format fields specified',
        'SHEETS_FORMAT_CELLS',
        { spreadsheetId },
      ),
    );
  }

  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`;

  const body: Record<string, unknown> = {
    requests: [
      {
        repeatCell: {
          range: options.range,
          cell: {
            userEnteredFormat: options.format,
          },
          fields,
        },
      },
    ],
  };

  const result = await http.post<BatchUpdateSpreadsheetResponse>(url, { body });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to format cells: ${result.error.message}`,
        'SHEETS_FORMAT_CELLS',
        { spreadsheetId, range: options.range },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Applies formatting to multiple ranges in a single batch request.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param items - Array of formatting option sets to apply.
 * @returns The batch update response on success.
 *
 * @example
 * ```ts
 * const result = await batchFormatCells(http, 'abc123', [
 *   {
 *     range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
 *     format: { textFormat: { bold: true } },
 *   },
 *   {
 *     range: { sheetId: 0, startRowIndex: 1, endRowIndex: 100, startColumnIndex: 3, endColumnIndex: 4 },
 *     format: { numberFormat: { type: 'PERCENT', pattern: '0.00%' } },
 *   },
 * ]);
 * ```
 */
export async function batchFormatCells(
  http: HttpClient,
  spreadsheetId: string,
  items: FormatCellsOptions[],
): Promise<Result<BatchUpdateSpreadsheetResponse, WorkspaceError>> {
  const requests = items.map((item) => {
    const fields = item.fields ?? buildFieldMask(item.format);
    return {
      repeatCell: {
        range: item.range,
        cell: {
          userEnteredFormat: item.format,
        },
        fields,
      },
    };
  });

  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`;
  const body: Record<string, unknown> = { requests };
  const result = await http.post<BatchUpdateSpreadsheetResponse>(url, { body });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to batch format cells: ${result.error.message}`,
        'SHEETS_BATCH_FORMAT_CELLS',
        { spreadsheetId },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}
