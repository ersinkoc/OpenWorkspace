/**
 * Sheets service plugin for OpenWorkspace.
 * Creates a SheetsApi facade that wraps all Sheets operations with a
 * pre-configured HttpClient. Exports a `sheets()` factory function.
 */

import type { HttpClient, Plugin, PluginContext, Result } from '@openworkspace/core';
import { WorkspaceError } from '@openworkspace/core';
import type {
  Spreadsheet,
  GetValuesResponse,
  BatchGetValuesResponse,
  UpdateValuesResponse,
  AppendValuesResponse,
  ClearValuesResponse,
  BatchUpdateValuesResponse,
  BatchUpdateSpreadsheetResponse,
  SheetProperties,
  CellValue,
  ValueRange,
  GetOptions,
  UpdateOptions,
  CreateSpreadsheetOptions,
  FormatCellsOptions,
} from './types.js';

// Read operations
import { getSpreadsheet, getValues, batchGetValues, getMetadata } from './read.js';

// Write operations
import { updateValues, appendValues, clearValues, batchUpdateValues } from './write.js';

// Structural operations
import { createSpreadsheet, addSheet, deleteSheet, insertRows, insertColumns } from './structure.js';

// Format operations
import { formatCells, batchFormatCells } from './format.js';

// ---------------------------------------------------------------------------
// SheetsApi type
// ---------------------------------------------------------------------------

/**
 * Unified Sheets API facade.
 * Every method delegates to the underlying function module,
 * injecting the pre-configured HttpClient automatically.
 */
export type SheetsApi = {
  // -- Read ----------------------------------------------------------------

  /**
   * Retrieves the full spreadsheet resource including sheet metadata.
   * @param spreadsheetId - The ID of the spreadsheet.
   */
  getSpreadsheet(spreadsheetId: string): Promise<Result<Spreadsheet, WorkspaceError>>;

  /**
   * Reads cell values from a single range.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param range - A1 notation range (e.g. "Sheet1!A1:D10").
   * @param options - Optional read parameters.
   */
  getValues(
    spreadsheetId: string,
    range: string,
    options?: GetOptions,
  ): Promise<Result<GetValuesResponse, WorkspaceError>>;

  /**
   * Reads cell values from multiple ranges in a single request.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param ranges - Array of A1 notation ranges.
   * @param options - Optional read parameters.
   */
  batchGetValues(
    spreadsheetId: string,
    ranges: string[],
    options?: GetOptions,
  ): Promise<Result<BatchGetValuesResponse, WorkspaceError>>;

  /**
   * Retrieves metadata for all sheets in a spreadsheet.
   * @param spreadsheetId - The ID of the spreadsheet.
   */
  getMetadata(spreadsheetId: string): Promise<Result<SheetProperties[], WorkspaceError>>;

  // -- Write ---------------------------------------------------------------

  /**
   * Writes values to a single range.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param range - A1 notation range.
   * @param values - 2D array of cell values.
   * @param options - Optional update parameters.
   */
  updateValues(
    spreadsheetId: string,
    range: string,
    values: CellValue[][],
    options?: UpdateOptions,
  ): Promise<Result<UpdateValuesResponse, WorkspaceError>>;

  /**
   * Appends values after the last row of data in a range.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param range - A1 notation range that determines where to search for the table.
   * @param values - 2D array of cell values.
   * @param options - Optional update parameters.
   */
  appendValues(
    spreadsheetId: string,
    range: string,
    values: CellValue[][],
    options?: UpdateOptions,
  ): Promise<Result<AppendValuesResponse, WorkspaceError>>;

  /**
   * Clears all values from a range, leaving formatting intact.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param range - A1 notation range.
   */
  clearValues(
    spreadsheetId: string,
    range: string,
  ): Promise<Result<ClearValuesResponse, WorkspaceError>>;

  /**
   * Writes values to multiple ranges in a single request.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param data - Array of value ranges.
   * @param options - Optional update parameters.
   */
  batchUpdateValues(
    spreadsheetId: string,
    data: ValueRange[],
    options?: UpdateOptions,
  ): Promise<Result<BatchUpdateValuesResponse, WorkspaceError>>;

  // -- Structure -----------------------------------------------------------

  /**
   * Creates a new spreadsheet.
   * @param options - Configuration for the new spreadsheet.
   */
  createSpreadsheet(
    options: CreateSpreadsheetOptions,
  ): Promise<Result<Spreadsheet, WorkspaceError>>;

  /**
   * Adds a new sheet tab to an existing spreadsheet.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param title - Title of the new sheet tab.
   * @param index - Optional position index.
   */
  addSheet(
    spreadsheetId: string,
    title: string,
    index?: number,
  ): Promise<Result<SheetProperties, WorkspaceError>>;

  /**
   * Deletes a sheet tab from a spreadsheet.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param sheetId - The numeric ID of the sheet.
   */
  deleteSheet(
    spreadsheetId: string,
    sheetId: number,
  ): Promise<Result<void, WorkspaceError>>;

  /**
   * Inserts empty rows into a sheet.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param sheetId - The numeric ID of the sheet.
   * @param startIndex - Start row index (inclusive, 0-based).
   * @param endIndex - End row index (exclusive, 0-based).
   * @param inheritFromBefore - Whether to inherit formatting from the previous row.
   */
  insertRows(
    spreadsheetId: string,
    sheetId: number,
    startIndex: number,
    endIndex: number,
    inheritFromBefore?: boolean,
  ): Promise<Result<void, WorkspaceError>>;

  /**
   * Inserts empty columns into a sheet.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param sheetId - The numeric ID of the sheet.
   * @param startIndex - Start column index (inclusive, 0-based).
   * @param endIndex - End column index (exclusive, 0-based).
   * @param inheritFromBefore - Whether to inherit formatting from the previous column.
   */
  insertColumns(
    spreadsheetId: string,
    sheetId: number,
    startIndex: number,
    endIndex: number,
    inheritFromBefore?: boolean,
  ): Promise<Result<void, WorkspaceError>>;

  // -- Format --------------------------------------------------------------

  /**
   * Applies formatting to a range of cells.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param options - Formatting options (range, format, optional field mask).
   */
  formatCells(
    spreadsheetId: string,
    options: FormatCellsOptions,
  ): Promise<Result<BatchUpdateSpreadsheetResponse, WorkspaceError>>;

  /**
   * Applies formatting to multiple ranges in a single batch request.
   * @param spreadsheetId - The ID of the spreadsheet.
   * @param items - Array of formatting option sets.
   */
  batchFormatCells(
    spreadsheetId: string,
    items: FormatCellsOptions[],
  ): Promise<Result<BatchUpdateSpreadsheetResponse, WorkspaceError>>;
};

// ---------------------------------------------------------------------------
// Factory: createSheetsApi
// ---------------------------------------------------------------------------

/**
 * Creates a SheetsApi instance backed by the given HttpClient.
 *
 * @param http - An authenticated HttpClient (e.g. with OAuth bearer token interceptor).
 * @returns A SheetsApi facade.
 *
 * @example
 * ```ts
 * const api = createSheetsApi(httpClient);
 * const result = await api.getValues('abc123', 'Sheet1!A1:C5');
 * ```
 */
export function createSheetsApi(http: HttpClient): SheetsApi {
  return {
    // Read
    getSpreadsheet: (spreadsheetId) => getSpreadsheet(http, spreadsheetId),
    getValues: (spreadsheetId, range, options) => getValues(http, spreadsheetId, range, options),
    batchGetValues: (spreadsheetId, ranges, options) =>
      batchGetValues(http, spreadsheetId, ranges, options),
    getMetadata: (spreadsheetId) => getMetadata(http, spreadsheetId),

    // Write
    updateValues: (spreadsheetId, range, values, options) =>
      updateValues(http, spreadsheetId, range, values, options),
    appendValues: (spreadsheetId, range, values, options) =>
      appendValues(http, spreadsheetId, range, values, options),
    clearValues: (spreadsheetId, range) => clearValues(http, spreadsheetId, range),
    batchUpdateValues: (spreadsheetId, data, options) =>
      batchUpdateValues(http, spreadsheetId, data, options),

    // Structure
    createSpreadsheet: (options) => createSpreadsheet(http, options),
    addSheet: (spreadsheetId, title, index) => addSheet(http, spreadsheetId, title, index),
    deleteSheet: (spreadsheetId, sheetId) => deleteSheet(http, spreadsheetId, sheetId),
    insertRows: (spreadsheetId, sheetId, startIndex, endIndex, inheritFromBefore) =>
      insertRows(http, spreadsheetId, sheetId, startIndex, endIndex, inheritFromBefore),
    insertColumns: (spreadsheetId, sheetId, startIndex, endIndex, inheritFromBefore) =>
      insertColumns(http, spreadsheetId, sheetId, startIndex, endIndex, inheritFromBefore),

    // Format
    formatCells: (spreadsheetId, options) => formatCells(http, spreadsheetId, options),
    batchFormatCells: (spreadsheetId, items) => batchFormatCells(http, spreadsheetId, items),
  };
}

// ---------------------------------------------------------------------------
// Plugin: sheets()
// ---------------------------------------------------------------------------

/**
 * Creates a Sheets plugin for the OpenWorkspace kernel.
 *
 * The plugin stores the SheetsApi in the kernel metadata under the key `'sheets'`
 * so that other plugins or application code can retrieve it.
 *
 * @param http - An authenticated HttpClient.
 * @returns A kernel Plugin.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { sheets } from '@openworkspace/sheets';
 *
 * const kernel = createKernel();
 * const http = createHttpClient({ baseUrl: '' });
 * await kernel.use(sheets(http));
 * await kernel.init();
 * ```
 */
export function sheets(http: HttpClient): Plugin {
  const api = createSheetsApi(http);

  return {
    name: 'sheets',
    version: '0.1.0',

    setup(context: PluginContext): void {
      context.metadata.set('sheets', api);
      context.logger.info('Sheets plugin initialized');
    },

    teardown(context: PluginContext): void {
      context.metadata.delete('sheets');
      context.logger.info('Sheets plugin torn down');
    },
  };
}
