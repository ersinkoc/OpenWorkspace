/**
 * Read operations for Google Sheets.
 * All functions take an HttpClient as the first parameter and return Result types.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  Spreadsheet,
  GetValuesResponse,
  BatchGetValuesResponse,
  GetOptions,
  SheetProperties,
} from './types.js';

/**
 * Sheets API v4 base URL.
 */
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query string from an options record, omitting undefined values.
 */
function qs(params: Record<string, string | boolean | undefined>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Retrieves the full spreadsheet resource including sheet metadata.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @returns The spreadsheet resource on success.
 *
 * @example
 * ```ts
 * const result = await getSpreadsheet(http, 'abc123');
 * if (result.ok) console.log(result.value.properties.title);
 * ```
 */
export async function getSpreadsheet(
  http: HttpClient,
  spreadsheetId: string,
): Promise<Result<Spreadsheet, WorkspaceError>> {
  const result = await http.get<Spreadsheet>(`${BASE}/${encodeURIComponent(spreadsheetId)}`);
  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to get spreadsheet: ${result.error.message}`,
        'SHEETS_GET_SPREADSHEET',
        { spreadsheetId },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Reads cell values from a single range in a spreadsheet.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param range - A1 notation range (e.g. "Sheet1!A1:D10").
 * @param options - Optional read parameters.
 * @returns The value range on success.
 *
 * @example
 * ```ts
 * const result = await getValues(http, 'abc123', 'Sheet1!A1:C5');
 * if (result.ok) {
 *   for (const row of result.value.values ?? []) {
 *     console.log(row);
 *   }
 * }
 * ```
 */
export async function getValues(
  http: HttpClient,
  spreadsheetId: string,
  range: string,
  options: GetOptions = {},
): Promise<Result<GetValuesResponse, WorkspaceError>> {
  const query = qs({
    majorDimension: options.majorDimension,
    valueRenderOption: options.valueRenderOption,
    dateTimeRenderOption: options.dateTimeRenderOption,
  });

  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${query}`;
  const result = await http.get<GetValuesResponse>(url);

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to get values: ${result.error.message}`,
        'SHEETS_GET_VALUES',
        { spreadsheetId, range },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Reads cell values from multiple ranges in a single request.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param ranges - Array of A1 notation ranges.
 * @param options - Optional read parameters.
 * @returns The batch value ranges on success.
 *
 * @example
 * ```ts
 * const result = await batchGetValues(http, 'abc123', ['Sheet1!A1:B2', 'Sheet2!C3:D4']);
 * if (result.ok) {
 *   for (const vr of result.value.valueRanges) {
 *     console.log(vr.range, vr.values);
 *   }
 * }
 * ```
 */
export async function batchGetValues(
  http: HttpClient,
  spreadsheetId: string,
  ranges: string[],
  options: GetOptions = {},
): Promise<Result<BatchGetValuesResponse, WorkspaceError>> {
  const params: Record<string, string | boolean | undefined> = {
    majorDimension: options.majorDimension,
    valueRenderOption: options.valueRenderOption,
    dateTimeRenderOption: options.dateTimeRenderOption,
  };

  // Append each range as a separate `ranges` query parameter.
  const baseQuery = qs(params);
  const rangeParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const separator = baseQuery ? '&' : '?';
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet${baseQuery}${rangeParams ? separator + rangeParams : ''}`;

  const result = await http.get<BatchGetValuesResponse>(url);

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to batch get values: ${result.error.message}`,
        'SHEETS_BATCH_GET_VALUES',
        { spreadsheetId, ranges },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Retrieves metadata for all sheets in a spreadsheet (sheet titles, IDs, grid properties).
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @returns Array of sheet properties on success.
 *
 * @example
 * ```ts
 * const result = await getMetadata(http, 'abc123');
 * if (result.ok) {
 *   for (const sheet of result.value) {
 *     console.log(sheet.title, sheet.sheetId);
 *   }
 * }
 * ```
 */
export async function getMetadata(
  http: HttpClient,
  spreadsheetId: string,
): Promise<Result<SheetProperties[], WorkspaceError>> {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties`;
  const result = await http.get<{ sheets?: Array<{ properties?: SheetProperties }> }>(url);

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to get metadata: ${result.error.message}`,
        'SHEETS_GET_METADATA',
        { spreadsheetId },
        result.error.statusCode,
      ),
    );
  }

  const sheets = result.value.data.sheets ?? [];
  const properties: SheetProperties[] = [];
  for (const sheet of sheets) {
    if (sheet.properties) {
      properties.push(sheet.properties);
    }
  }

  return ok(properties);
}
