/**
 * Write operations for Google Sheets.
 * All functions take an HttpClient as the first parameter and return Result types.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  CellValue,
  UpdateValuesResponse,
  AppendValuesResponse,
  ClearValuesResponse,
  BatchUpdateValuesResponse,
  UpdateOptions,
  ValueRange,
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
 * Writes values to a single range in a spreadsheet.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param range - A1 notation range (e.g. "Sheet1!A1:D10").
 * @param values - 2D array of cell values to write.
 * @param options - Optional update parameters.
 * @returns The update response on success.
 *
 * @example
 * ```ts
 * const result = await updateValues(http, 'abc123', 'Sheet1!A1', [
 *   ['Name', 'Age'],
 *   ['Alice', 30],
 *   ['Bob', 25],
 * ]);
 * if (result.ok) console.log(`Updated ${result.value.updatedCells} cells`);
 * ```
 */
export async function updateValues(
  http: HttpClient,
  spreadsheetId: string,
  range: string,
  values: CellValue[][],
  options: UpdateOptions = {},
): Promise<Result<UpdateValuesResponse, WorkspaceError>> {
  const query = qs({
    valueInputOption: options.valueInputOption ?? 'USER_ENTERED',
    includeValuesInResponse: options.includeValuesInResponse,
    responseDateTimeRenderOption: options.responseDateTimeRenderOption,
    responseValueRenderOption: options.responseValueRenderOption,
  });

  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${query}`;
  const result = await http.put<UpdateValuesResponse>(url, {
    body: { range, majorDimension: 'ROWS', values } as unknown as Record<string, unknown>,
  });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to update values: ${result.error.message}`,
        'SHEETS_UPDATE_VALUES',
        { spreadsheetId, range },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Appends values after the last row of data in a range.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param range - A1 notation range that determines where to search for the table (e.g. "Sheet1!A:D").
 * @param values - 2D array of cell values to append.
 * @param options - Optional update parameters.
 * @returns The append response on success.
 *
 * @example
 * ```ts
 * const result = await appendValues(http, 'abc123', 'Sheet1!A:D', [
 *   ['Charlie', 35],
 * ]);
 * if (result.ok) console.log(`Appended ${result.value.updates.updatedCells} cells`);
 * ```
 */
export async function appendValues(
  http: HttpClient,
  spreadsheetId: string,
  range: string,
  values: CellValue[][],
  options: UpdateOptions = {},
): Promise<Result<AppendValuesResponse, WorkspaceError>> {
  const query = qs({
    valueInputOption: options.valueInputOption ?? 'USER_ENTERED',
    includeValuesInResponse: options.includeValuesInResponse,
    responseDateTimeRenderOption: options.responseDateTimeRenderOption,
    responseValueRenderOption: options.responseValueRenderOption,
    insertDataOption: 'INSERT_ROWS',
  });

  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append${query}`;
  const result = await http.post<AppendValuesResponse>(url, {
    body: { range, majorDimension: 'ROWS', values } as unknown as Record<string, unknown>,
  });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to append values: ${result.error.message}`,
        'SHEETS_APPEND_VALUES',
        { spreadsheetId, range },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Clears all values from a range, leaving formatting intact.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param range - A1 notation range to clear (e.g. "Sheet1!A1:D10").
 * @returns The clear response on success.
 *
 * @example
 * ```ts
 * const result = await clearValues(http, 'abc123', 'Sheet1!A1:D10');
 * if (result.ok) console.log(`Cleared ${result.value.clearedRange}`);
 * ```
 */
export async function clearValues(
  http: HttpClient,
  spreadsheetId: string,
  range: string,
): Promise<Result<ClearValuesResponse, WorkspaceError>> {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:clear`;
  const result = await http.post<ClearValuesResponse>(url, { body: {} });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to clear values: ${result.error.message}`,
        'SHEETS_CLEAR_VALUES',
        { spreadsheetId, range },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Writes values to multiple ranges in a single request.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param data - Array of value ranges to write.
 * @param options - Optional update parameters.
 * @returns The batch update response on success.
 *
 * @example
 * ```ts
 * const result = await batchUpdateValues(http, 'abc123', [
 *   { range: 'Sheet1!A1:B2', values: [['A', 'B'], [1, 2]] },
 *   { range: 'Sheet2!A1:B1', values: [['X', 'Y']] },
 * ]);
 * if (result.ok) console.log(`Updated ${result.value.totalUpdatedCells} cells total`);
 * ```
 */
export async function batchUpdateValues(
  http: HttpClient,
  spreadsheetId: string,
  data: ValueRange[],
  options: UpdateOptions = {},
): Promise<Result<BatchUpdateValuesResponse, WorkspaceError>> {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`;

  const body: Record<string, unknown> = {
    valueInputOption: options.valueInputOption ?? 'USER_ENTERED',
    data,
  };

  if (options.includeValuesInResponse !== undefined) {
    body['includeValuesInResponse'] = options.includeValuesInResponse;
  }
  if (options.responseDateTimeRenderOption !== undefined) {
    body['responseDateTimeRenderOption'] = options.responseDateTimeRenderOption;
  }
  if (options.responseValueRenderOption !== undefined) {
    body['responseValueRenderOption'] = options.responseValueRenderOption;
  }

  const result = await http.post<BatchUpdateValuesResponse>(url, { body });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to batch update values: ${result.error.message}`,
        'SHEETS_BATCH_UPDATE_VALUES',
        { spreadsheetId },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}
