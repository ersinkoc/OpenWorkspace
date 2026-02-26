/**
 * Type definitions for the Google Sheets API.
 * Models the core Sheets data structures for typed interactions.
 */

// ---------------------------------------------------------------------------
// Cell values & formats
// ---------------------------------------------------------------------------

/**
 * Primitive cell value types supported by Google Sheets.
 */
export type CellValue = string | number | boolean | null;

/**
 * Horizontal alignment options for cell text.
 */
export type HorizontalAlign = 'LEFT' | 'CENTER' | 'RIGHT';

/**
 * Vertical alignment options for cell text.
 */
export type VerticalAlign = 'TOP' | 'MIDDLE' | 'BOTTOM';

/**
 * Wrap strategy for cell text.
 */
export type WrapStrategy = 'OVERFLOW_CELL' | 'LEGACY_WRAP' | 'CLIP' | 'WRAP';

/**
 * Border style for cell borders.
 */
export type BorderStyle =
  | 'NONE'
  | 'DOTTED'
  | 'DASHED'
  | 'SOLID'
  | 'SOLID_MEDIUM'
  | 'SOLID_THICK'
  | 'DOUBLE';

/**
 * Number format type for cell values.
 */
export type NumberFormatType =
  | 'TEXT'
  | 'NUMBER'
  | 'PERCENT'
  | 'CURRENCY'
  | 'DATE'
  | 'TIME'
  | 'DATE_TIME'
  | 'SCIENTIFIC';

/**
 * RGBA color representation used by the Sheets API.
 */
export type Color = {
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
};

/**
 * Number format specification for a cell.
 */
export type NumberFormat = {
  type: NumberFormatType;
  pattern?: string;
};

/**
 * Text format properties (bold, italic, font, size, color).
 */
export type TextFormat = {
  foregroundColor?: Color;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
};

/**
 * Border specification for a single edge.
 */
export type Border = {
  style: BorderStyle;
  color?: Color;
  width?: number;
};

/**
 * Borders for all four edges of a cell.
 */
export type Borders = {
  top?: Border;
  bottom?: Border;
  left?: Border;
  right?: Border;
};

/**
 * Padding inside a cell.
 */
export type Padding = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

/**
 * Complete cell format specification.
 */
export type CellFormat = {
  numberFormat?: NumberFormat;
  backgroundColor?: Color;
  borders?: Borders;
  padding?: Padding;
  horizontalAlignment?: HorizontalAlign;
  verticalAlignment?: VerticalAlign;
  wrapStrategy?: WrapStrategy;
  textFormat?: TextFormat;
};

// ---------------------------------------------------------------------------
// Grid & sheet structures
// ---------------------------------------------------------------------------

/**
 * Zero-indexed grid coordinate within a sheet.
 */
export type GridCoordinate = {
  sheetId: number;
  rowIndex: number;
  columnIndex: number;
};

/**
 * Range within a sheet specified by start/end indices (inclusive start, exclusive end).
 */
export type GridRange = {
  sheetId: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
};

/**
 * Properties of an individual sheet tab.
 */
export type SheetProperties = {
  sheetId: number;
  title: string;
  index: number;
  sheetType?: string;
  gridProperties?: {
    rowCount?: number;
    columnCount?: number;
    frozenRowCount?: number;
    frozenColumnCount?: number;
    hideGridlines?: boolean;
  };
  hidden?: boolean;
  tabColor?: Color;
  tabColorStyle?: { rgbColor?: Color };
};

/**
 * Represents a single sheet tab within a spreadsheet.
 */
export type Sheet = {
  properties: SheetProperties;
  data?: SheetData[];
  merges?: GridRange[];
};

/**
 * Data payload for a sheet region.
 */
export type SheetData = {
  startRow?: number;
  startColumn?: number;
  rowData?: RowData[];
};

/**
 * Row of cell data.
 */
export type RowData = {
  values?: CellData[];
};

/**
 * Individual cell data including value and format.
 */
export type CellData = {
  userEnteredValue?: ExtendedValue;
  effectiveValue?: ExtendedValue;
  formattedValue?: string;
  userEnteredFormat?: CellFormat;
  effectiveFormat?: CellFormat;
};

/**
 * Extended value that can represent multiple value types.
 */
export type ExtendedValue = {
  numberValue?: number;
  stringValue?: string;
  boolValue?: boolean;
  formulaValue?: string;
  errorValue?: { type: string; message: string };
};

// ---------------------------------------------------------------------------
// Spreadsheet
// ---------------------------------------------------------------------------

/**
 * Top-level spreadsheet resource.
 */
export type Spreadsheet = {
  spreadsheetId: string;
  properties: SpreadsheetProperties;
  sheets: Sheet[];
  spreadsheetUrl: string;
};

/**
 * Properties of a spreadsheet.
 */
export type SpreadsheetProperties = {
  title: string;
  locale?: string;
  autoRecalc?: string;
  timeZone?: string;
  defaultFormat?: CellFormat;
};

// ---------------------------------------------------------------------------
// Value ranges (for reading/writing cell values)
// ---------------------------------------------------------------------------

/**
 * A range of values from the spreadsheet.
 */
export type ValueRange = {
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  values?: CellValue[][];
};

/**
 * Response from a values.get request.
 */
export type GetValuesResponse = ValueRange;

/**
 * Response from a values.batchGet request.
 */
export type BatchGetValuesResponse = {
  spreadsheetId: string;
  valueRanges: ValueRange[];
};

/**
 * Response from a values.update request.
 */
export type UpdateValuesResponse = {
  spreadsheetId: string;
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
  updatedData?: ValueRange;
};

/**
 * Response from a values.append request.
 */
export type AppendValuesResponse = {
  spreadsheetId: string;
  tableRange?: string;
  updates: UpdateValuesResponse;
};

/**
 * Response from a values.clear request.
 */
export type ClearValuesResponse = {
  spreadsheetId: string;
  clearedRange: string;
};

/**
 * Response from a values.batchUpdate request.
 */
export type BatchUpdateValuesResponse = {
  spreadsheetId: string;
  totalUpdatedRows: number;
  totalUpdatedColumns: number;
  totalUpdatedCells: number;
  totalUpdatedSheets: number;
  responses: UpdateValuesResponse[];
};

// ---------------------------------------------------------------------------
// Batch update (structural / format)
// ---------------------------------------------------------------------------

/**
 * Generic batchUpdate response from the Sheets API.
 */
export type BatchUpdateSpreadsheetResponse = {
  spreadsheetId: string;
  replies: Record<string, unknown>[];
  updatedSpreadsheet?: Spreadsheet;
};

// ---------------------------------------------------------------------------
// Options for user-facing functions
// ---------------------------------------------------------------------------

/**
 * Options for value update operations.
 */
export type UpdateOptions = {
  /** How input data should be interpreted. */
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  /** Whether to include the updated values in the response. */
  includeValuesInResponse?: boolean;
  /** How dates/times/durations should be rendered in the response. */
  responseDateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
  /** How values should be rendered in the response. */
  responseValueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
};

/**
 * Options for value read operations.
 */
export type GetOptions = {
  /** Major dimension of the returned values. */
  majorDimension?: 'ROWS' | 'COLUMNS';
  /** How values should be rendered. */
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
  /** How dates/times/durations should be rendered. */
  dateTimeRenderOption?: 'SERIAL_NUMBER' | 'FORMATTED_STRING';
};

/**
 * Options for creating a new spreadsheet.
 */
export type CreateSpreadsheetOptions = {
  /** Title of the new spreadsheet. */
  title: string;
  /** Locale for the spreadsheet (e.g. "en_US"). */
  locale?: string;
  /** Timezone for the spreadsheet (e.g. "America/New_York"). */
  timeZone?: string;
  /** Sheet names to create (defaults to a single "Sheet1"). */
  sheetTitles?: string[];
};

/**
 * Options for inserting rows or columns.
 */
export type InsertDimensionOptions = {
  /** The sheet to modify. */
  sheetId: number;
  /** Whether to insert rows or columns. */
  dimension: 'ROWS' | 'COLUMNS';
  /** The start index (inclusive, 0-based). */
  startIndex: number;
  /** The end index (exclusive, 0-based). */
  endIndex: number;
  /** Whether to inherit formatting from the row/column before the insertion. */
  inheritFromBefore?: boolean;
};

/**
 * Options for formatting cells.
 */
export type FormatCellsOptions = {
  /** The range to format. */
  range: GridRange;
  /** The format to apply. */
  format: CellFormat;
  /** Which fields of the format to update (defaults to all provided fields). */
  fields?: string;
};
