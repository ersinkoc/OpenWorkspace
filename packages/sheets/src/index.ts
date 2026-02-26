/**
 * @openworkspace/sheets
 * Google Sheets API toolkit for OpenWorkspace.
 * Zero-dependency, ESM-only, Node >= 22.
 */

// Type definitions
export type {
  // Cell values & formats
  CellValue,
  HorizontalAlign,
  VerticalAlign,
  WrapStrategy,
  BorderStyle,
  NumberFormatType,
  Color,
  NumberFormat,
  TextFormat,
  Border,
  Borders,
  Padding,
  CellFormat,

  // Grid & sheet structures
  GridCoordinate,
  GridRange,
  SheetProperties,
  Sheet,
  SheetData,
  RowData,
  CellData,
  ExtendedValue,

  // Spreadsheet
  Spreadsheet,
  SpreadsheetProperties,

  // Value ranges
  ValueRange,
  GetValuesResponse,
  BatchGetValuesResponse,
  UpdateValuesResponse,
  AppendValuesResponse,
  ClearValuesResponse,
  BatchUpdateValuesResponse,
  BatchUpdateSpreadsheetResponse,

  // Options
  UpdateOptions,
  GetOptions,
  CreateSpreadsheetOptions,
  InsertDimensionOptions,
  FormatCellsOptions,
} from './types.js';

// Read operations
export { getSpreadsheet, getValues, batchGetValues, getMetadata } from './read.js';

// Write operations
export { updateValues, appendValues, clearValues, batchUpdateValues } from './write.js';

// Structural operations
export { createSpreadsheet, addSheet, deleteSheet, insertRows, insertColumns } from './structure.js';

// Format operations
export { formatCells, batchFormatCells } from './format.js';

// Plugin & API facade
export type { SheetsApi } from './plugin.js';
export { createSheetsApi, sheets } from './plugin.js';
