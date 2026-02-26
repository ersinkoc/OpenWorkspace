/**
 * Structural operations for Google Sheets.
 * Create spreadsheets, add/delete sheets, insert rows and columns.
 * All functions take an HttpClient as the first parameter and return Result types.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  Spreadsheet,
  BatchUpdateSpreadsheetResponse,
  CreateSpreadsheetOptions,
  InsertDimensionOptions,
  SheetProperties,
} from './types.js';

/**
 * Sheets API v4 base URL.
 */
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a new spreadsheet.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Configuration for the new spreadsheet.
 * @returns The created spreadsheet resource on success.
 *
 * @example
 * ```ts
 * const result = await createSpreadsheet(http, {
 *   title: 'Quarterly Report',
 *   sheetTitles: ['Q1', 'Q2', 'Q3', 'Q4'],
 * });
 * if (result.ok) console.log(result.value.spreadsheetUrl);
 * ```
 */
export async function createSpreadsheet(
  http: HttpClient,
  options: CreateSpreadsheetOptions,
): Promise<Result<Spreadsheet, WorkspaceError>> {
  const sheets = (options.sheetTitles ?? ['Sheet1']).map((title, index) => ({
    properties: { title, index },
  }));

  const body: Record<string, unknown> = {
    properties: {
      title: options.title,
      ...(options.locale ? { locale: options.locale } : {}),
      ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    },
    sheets,
  };

  const result = await http.post<Spreadsheet>(BASE, { body });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to create spreadsheet: ${result.error.message}`,
        'SHEETS_CREATE_SPREADSHEET',
        { title: options.title },
        result.error.statusCode,
      ),
    );
  }
  return ok(result.value.data);
}

/**
 * Adds a new sheet tab to an existing spreadsheet.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param title - Title of the new sheet tab.
 * @param index - Optional position to insert the sheet at.
 * @returns The properties of the newly created sheet on success.
 *
 * @example
 * ```ts
 * const result = await addSheet(http, 'abc123', 'Summary');
 * if (result.ok) console.log(`Created sheet: ${result.value.title} (ID ${result.value.sheetId})`);
 * ```
 */
export async function addSheet(
  http: HttpClient,
  spreadsheetId: string,
  title: string,
  index?: number,
): Promise<Result<SheetProperties, WorkspaceError>> {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`;

  const properties: Record<string, unknown> = { title };
  if (index !== undefined) {
    properties['index'] = index;
  }

  const body: Record<string, unknown> = {
    requests: [{ addSheet: { properties } }],
  };

  const result = await http.post<BatchUpdateSpreadsheetResponse>(url, { body });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to add sheet: ${result.error.message}`,
        'SHEETS_ADD_SHEET',
        { spreadsheetId, title },
        result.error.statusCode,
      ),
    );
  }

  // Extract the newly created sheet properties from the reply.
  const replies = result.value.data.replies;
  const firstReply = replies[0] as { addSheet?: { properties?: SheetProperties } } | undefined;
  const sheetProps = firstReply?.addSheet?.properties;

  if (!sheetProps) {
    return err(
      new WorkspaceError(
        'Unexpected response: missing sheet properties in reply',
        'SHEETS_ADD_SHEET',
        { spreadsheetId, title },
      ),
    );
  }

  return ok(sheetProps);
}

/**
 * Deletes a sheet tab from a spreadsheet.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param sheetId - The numeric ID of the sheet to delete.
 * @returns Void on success.
 *
 * @example
 * ```ts
 * const result = await deleteSheet(http, 'abc123', 0);
 * if (result.ok) console.log('Sheet deleted');
 * ```
 */
export async function deleteSheet(
  http: HttpClient,
  spreadsheetId: string,
  sheetId: number,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`;

  const body: Record<string, unknown> = {
    requests: [{ deleteSheet: { sheetId } }],
  };

  const result = await http.post<BatchUpdateSpreadsheetResponse>(url, { body });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to delete sheet: ${result.error.message}`,
        'SHEETS_DELETE_SHEET',
        { spreadsheetId, sheetId },
        result.error.statusCode,
      ),
    );
  }
  return ok(undefined);
}

/**
 * Inserts empty rows into a sheet.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param sheetId - The numeric ID of the sheet.
 * @param startIndex - Start row index (inclusive, 0-based).
 * @param endIndex - End row index (exclusive, 0-based).
 * @param inheritFromBefore - Whether to inherit formatting from the row before the insertion.
 * @returns Void on success.
 *
 * @example
 * ```ts
 * // Insert 5 rows starting at row index 2
 * const result = await insertRows(http, 'abc123', 0, 2, 7);
 * if (result.ok) console.log('Rows inserted');
 * ```
 */
export async function insertRows(
  http: HttpClient,
  spreadsheetId: string,
  sheetId: number,
  startIndex: number,
  endIndex: number,
  inheritFromBefore?: boolean,
): Promise<Result<void, WorkspaceError>> {
  return insertDimension(http, spreadsheetId, {
    sheetId,
    dimension: 'ROWS',
    startIndex,
    endIndex,
    inheritFromBefore,
  });
}

/**
 * Inserts empty columns into a sheet.
 *
 * @param http - Authenticated HTTP client.
 * @param spreadsheetId - The ID of the spreadsheet.
 * @param sheetId - The numeric ID of the sheet.
 * @param startIndex - Start column index (inclusive, 0-based).
 * @param endIndex - End column index (exclusive, 0-based).
 * @param inheritFromBefore - Whether to inherit formatting from the column before the insertion.
 * @returns Void on success.
 *
 * @example
 * ```ts
 * // Insert 3 columns starting at column index 1
 * const result = await insertColumns(http, 'abc123', 0, 1, 4);
 * if (result.ok) console.log('Columns inserted');
 * ```
 */
export async function insertColumns(
  http: HttpClient,
  spreadsheetId: string,
  sheetId: number,
  startIndex: number,
  endIndex: number,
  inheritFromBefore?: boolean,
): Promise<Result<void, WorkspaceError>> {
  return insertDimension(http, spreadsheetId, {
    sheetId,
    dimension: 'COLUMNS',
    startIndex,
    endIndex,
    inheritFromBefore,
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Inserts rows or columns via the batchUpdate insertDimension request.
 */
async function insertDimension(
  http: HttpClient,
  spreadsheetId: string,
  options: InsertDimensionOptions,
): Promise<Result<void, WorkspaceError>> {
  const url = `${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`;

  const body: Record<string, unknown> = {
    requests: [
      {
        insertDimension: {
          range: {
            sheetId: options.sheetId,
            dimension: options.dimension,
            startIndex: options.startIndex,
            endIndex: options.endIndex,
          },
          inheritFromBefore: options.inheritFromBefore ?? false,
        },
      },
    ],
  };

  const result = await http.post<BatchUpdateSpreadsheetResponse>(url, { body });

  if (!result.ok) {
    return err(
      new WorkspaceError(
        `Failed to insert ${options.dimension.toLowerCase()}: ${result.error.message}`,
        'SHEETS_INSERT_DIMENSION',
        { spreadsheetId, ...options },
        result.error.statusCode,
      ),
    );
  }
  return ok(undefined);
}
