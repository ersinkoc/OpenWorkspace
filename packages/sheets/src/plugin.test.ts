import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { createSheetsApi, sheets } from './plugin.js';
import type { SheetsApi } from './plugin.js';
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
} from './types.js';

// ---------------------------------------------------------------------------
// Mock HttpClient factory
// ---------------------------------------------------------------------------

type MockHttpClient = HttpClient & {
  _setGetResponse: <T>(result: Result<HttpResponse<T>, NetworkError>) => void;
  _setPostResponse: <T>(result: Result<HttpResponse<T>, NetworkError>) => void;
  _setPutResponse: <T>(result: Result<HttpResponse<T>, NetworkError>) => void;
  _setPatchResponse: <T>(result: Result<HttpResponse<T>, NetworkError>) => void;
  _setDeleteResponse: <T>(result: Result<HttpResponse<T>, NetworkError>) => void;
  _getLastUrl: () => string;
  _getLastBody: () => unknown;
};

function createMockHttpClient(): MockHttpClient {
  let getResponse: Result<HttpResponse<unknown>, NetworkError> = ok({
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {},
  });
  let postResponse: Result<HttpResponse<unknown>, NetworkError> = ok({
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {},
  });
  let putResponse: Result<HttpResponse<unknown>, NetworkError> = ok({
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {},
  });
  let patchResponse: Result<HttpResponse<unknown>, NetworkError> = ok({
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {},
  });
  let deleteResponse: Result<HttpResponse<unknown>, NetworkError> = ok({
    status: 200,
    statusText: 'OK',
    headers: {},
    data: {},
  });
  let lastUrl = '';
  let lastBody: unknown = undefined;

  const mock: MockHttpClient = {
    request: vi.fn(),
    get: vi.fn(async (url: string) => {
      lastUrl = url;
      return getResponse;
    }) as HttpClient['get'],
    post: vi.fn(async (url: string, config?: { body?: unknown }) => {
      lastUrl = url;
      lastBody = config?.body;
      return postResponse;
    }) as HttpClient['post'],
    put: vi.fn(async (url: string, config?: { body?: unknown }) => {
      lastUrl = url;
      lastBody = config?.body;
      return putResponse;
    }) as HttpClient['put'],
    patch: vi.fn(async (url: string, config?: { body?: unknown }) => {
      lastUrl = url;
      lastBody = config?.body;
      return patchResponse;
    }) as HttpClient['patch'],
    delete: vi.fn(async (url: string) => {
      lastUrl = url;
      return deleteResponse;
    }) as HttpClient['delete'],
    interceptors: { request: [], response: [], error: [] },

    _setGetResponse: <T>(r: Result<HttpResponse<T>, NetworkError>) => {
      getResponse = r as Result<HttpResponse<unknown>, NetworkError>;
    },
    _setPostResponse: <T>(r: Result<HttpResponse<T>, NetworkError>) => {
      postResponse = r as Result<HttpResponse<unknown>, NetworkError>;
    },
    _setPutResponse: <T>(r: Result<HttpResponse<T>, NetworkError>) => {
      putResponse = r as Result<HttpResponse<unknown>, NetworkError>;
    },
    _setPatchResponse: <T>(r: Result<HttpResponse<T>, NetworkError>) => {
      patchResponse = r as Result<HttpResponse<unknown>, NetworkError>;
    },
    _setDeleteResponse: <T>(r: Result<HttpResponse<T>, NetworkError>) => {
      deleteResponse = r as Result<HttpResponse<unknown>, NetworkError>;
    },
    _getLastUrl: () => lastUrl,
    _getLastBody: () => lastBody,
  };

  return mock;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okResponse<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({ status: 200, statusText: 'OK', headers: {}, data });
}

function errResponse(message: string, status = 500): Result<HttpResponse<never>, NetworkError> {
  return err(new NetworkError(message, { status }, status));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sheets plugin', () => {
  let http: MockHttpClient;
  let api: SheetsApi;

  beforeEach(() => {
    http = createMockHttpClient();
    api = createSheetsApi(http);
  });

  // -----------------------------------------------------------------------
  // Read operations
  // -----------------------------------------------------------------------

  describe('getSpreadsheet', () => {
    it('should return a spreadsheet resource on success', async () => {
      const spreadsheet: Spreadsheet = {
        spreadsheetId: 'abc123',
        properties: { title: 'Test Sheet' },
        sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0 } }],
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/abc123',
      };
      http._setGetResponse(okResponse(spreadsheet));

      const result = await api.getSpreadsheet('abc123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.spreadsheetId).toBe('abc123');
        expect(result.value.properties.title).toBe('Test Sheet');
      }
    });

    it('should return an error on failure', async () => {
      http._setGetResponse(errResponse('Not found', 404));

      const result = await api.getSpreadsheet('bad-id');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to get spreadsheet');
        expect(result.error.statusCode).toBe(404);
      }
    });
  });

  describe('getValues', () => {
    it('should return cell values from a range', async () => {
      const response: GetValuesResponse = {
        range: 'Sheet1!A1:C3',
        majorDimension: 'ROWS',
        values: [
          ['Name', 'Age', 'City'],
          ['Alice', 30, 'NYC'],
          ['Bob', 25, 'LA'],
        ],
      };
      http._setGetResponse(okResponse(response));

      const result = await api.getValues('abc123', 'Sheet1!A1:C3');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.values).toHaveLength(3);
        expect(result.value.range).toBe('Sheet1!A1:C3');
      }
    });

    it('should pass read options as query parameters', async () => {
      http._setGetResponse(okResponse({ range: 'A1', values: [] }));

      await api.getValues('abc123', 'Sheet1!A1', {
        majorDimension: 'COLUMNS',
        valueRenderOption: 'UNFORMATTED_VALUE',
      });

      const url = http._getLastUrl();
      expect(url).toContain('majorDimension=COLUMNS');
      expect(url).toContain('valueRenderOption=UNFORMATTED_VALUE');
    });

    it('should return an error on failure', async () => {
      http._setGetResponse(errResponse('Server error', 500));

      const result = await api.getValues('abc123', 'Sheet1!A1');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to get values');
      }
    });
  });

  describe('batchGetValues', () => {
    it('should return values for multiple ranges', async () => {
      const response: BatchGetValuesResponse = {
        spreadsheetId: 'abc123',
        valueRanges: [
          { range: 'Sheet1!A1:B2', values: [['a', 'b'], [1, 2]] },
          { range: 'Sheet2!C3:D4', values: [['c', 'd'], [3, 4]] },
        ],
      };
      http._setGetResponse(okResponse(response));

      const result = await api.batchGetValues('abc123', ['Sheet1!A1:B2', 'Sheet2!C3:D4']);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.valueRanges).toHaveLength(2);
      }
    });
  });

  describe('getMetadata', () => {
    it('should return sheet properties array', async () => {
      http._setGetResponse(
        okResponse({
          sheets: [
            { properties: { sheetId: 0, title: 'Sheet1', index: 0 } },
            { properties: { sheetId: 1, title: 'Sheet2', index: 1 } },
          ],
        }),
      );

      const result = await api.getMetadata('abc123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0]?.title).toBe('Sheet1');
        expect(result.value[1]?.title).toBe('Sheet2');
      }
    });

    it('should return empty array when no sheets exist', async () => {
      http._setGetResponse(okResponse({ sheets: [] }));

      const result = await api.getMetadata('abc123');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toHaveLength(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Write operations
  // -----------------------------------------------------------------------

  describe('updateValues', () => {
    it('should write values to a range', async () => {
      const response: UpdateValuesResponse = {
        spreadsheetId: 'abc123',
        updatedRange: 'Sheet1!A1:B2',
        updatedRows: 2,
        updatedColumns: 2,
        updatedCells: 4,
      };
      http._setPutResponse(okResponse(response));

      const result = await api.updateValues('abc123', 'Sheet1!A1', [
        ['Name', 'Age'],
        ['Alice', 30],
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.updatedCells).toBe(4);
      }
    });

    it('should default to USER_ENTERED value input option', async () => {
      http._setPutResponse(
        okResponse({
          spreadsheetId: 'abc123',
          updatedRange: 'A1',
          updatedRows: 1,
          updatedColumns: 1,
          updatedCells: 1,
        }),
      );

      await api.updateValues('abc123', 'Sheet1!A1', [['test']]);

      const url = http._getLastUrl();
      expect(url).toContain('valueInputOption=USER_ENTERED');
    });

    it('should return an error on failure', async () => {
      http._setPutResponse(errResponse('Forbidden', 403));

      const result = await api.updateValues('abc123', 'Sheet1!A1', [['x']]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to update values');
        expect(result.error.statusCode).toBe(403);
      }
    });
  });

  describe('appendValues', () => {
    it('should append values after existing data', async () => {
      const response: AppendValuesResponse = {
        spreadsheetId: 'abc123',
        tableRange: 'Sheet1!A1:B3',
        updates: {
          spreadsheetId: 'abc123',
          updatedRange: 'Sheet1!A4:B4',
          updatedRows: 1,
          updatedColumns: 2,
          updatedCells: 2,
        },
      };
      http._setPostResponse(okResponse(response));

      const result = await api.appendValues('abc123', 'Sheet1!A:B', [['Charlie', 35]]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.updates.updatedCells).toBe(2);
      }
    });

    it('should include append in the URL', async () => {
      http._setPostResponse(
        okResponse({
          spreadsheetId: 'abc123',
          updates: {
            spreadsheetId: 'abc123',
            updatedRange: 'A1',
            updatedRows: 0,
            updatedColumns: 0,
            updatedCells: 0,
          },
        }),
      );

      await api.appendValues('abc123', 'Sheet1!A:B', [['x']]);

      const url = http._getLastUrl();
      expect(url).toContain(':append');
    });
  });

  describe('clearValues', () => {
    it('should clear values from a range', async () => {
      const response: ClearValuesResponse = {
        spreadsheetId: 'abc123',
        clearedRange: 'Sheet1!A1:D10',
      };
      http._setPostResponse(okResponse(response));

      const result = await api.clearValues('abc123', 'Sheet1!A1:D10');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.clearedRange).toBe('Sheet1!A1:D10');
      }
    });

    it('should include :clear in the URL', async () => {
      http._setPostResponse(okResponse({ spreadsheetId: 'abc123', clearedRange: 'A1' }));

      await api.clearValues('abc123', 'Sheet1!A1');

      const url = http._getLastUrl();
      expect(url).toContain(':clear');
    });
  });

  describe('batchUpdateValues', () => {
    it('should write to multiple ranges', async () => {
      const response: BatchUpdateValuesResponse = {
        spreadsheetId: 'abc123',
        totalUpdatedRows: 3,
        totalUpdatedColumns: 2,
        totalUpdatedCells: 6,
        totalUpdatedSheets: 2,
        responses: [],
      };
      http._setPostResponse(okResponse(response));

      const result = await api.batchUpdateValues('abc123', [
        { range: 'Sheet1!A1:B2', values: [['a', 'b'], [1, 2]] },
        { range: 'Sheet2!A1', values: [['x']] },
      ]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.totalUpdatedCells).toBe(6);
      }
    });

    it('should include value ranges in the request body', async () => {
      http._setPostResponse(
        okResponse({
          spreadsheetId: 'abc123',
          totalUpdatedRows: 0,
          totalUpdatedColumns: 0,
          totalUpdatedCells: 0,
          totalUpdatedSheets: 0,
          responses: [],
        }),
      );

      const data = [{ range: 'Sheet1!A1', values: [['test']] }];
      await api.batchUpdateValues('abc123', data);

      const body = http._getLastBody() as Record<string, unknown>;
      expect(body).toHaveProperty('data', data);
      expect(body).toHaveProperty('valueInputOption', 'USER_ENTERED');
    });
  });

  // -----------------------------------------------------------------------
  // Structure operations
  // -----------------------------------------------------------------------

  describe('createSpreadsheet', () => {
    it('should create a new spreadsheet', async () => {
      const spreadsheet: Spreadsheet = {
        spreadsheetId: 'new-123',
        properties: { title: 'New Spreadsheet' },
        sheets: [{ properties: { sheetId: 0, title: 'Sheet1', index: 0 } }],
        spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/new-123',
      };
      http._setPostResponse(okResponse(spreadsheet));

      const result = await api.createSpreadsheet({ title: 'New Spreadsheet' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.spreadsheetId).toBe('new-123');
        expect(result.value.properties.title).toBe('New Spreadsheet');
      }
    });

    it('should include custom sheet titles in the request', async () => {
      http._setPostResponse(
        okResponse({
          spreadsheetId: 'id',
          properties: { title: 'T' },
          sheets: [],
          spreadsheetUrl: '',
        }),
      );

      await api.createSpreadsheet({
        title: 'Report',
        sheetTitles: ['Q1', 'Q2'],
        locale: 'en_US',
        timeZone: 'America/New_York',
      });

      const body = http._getLastBody() as Record<string, unknown>;
      const bodySheets = body['sheets'] as Array<{ properties: { title: string } }>;
      expect(bodySheets).toHaveLength(2);
      expect(bodySheets[0]?.properties.title).toBe('Q1');
      expect(bodySheets[1]?.properties.title).toBe('Q2');
    });
  });

  describe('addSheet', () => {
    it('should add a new sheet tab', async () => {
      const response: BatchUpdateSpreadsheetResponse = {
        spreadsheetId: 'abc123',
        replies: [{ addSheet: { properties: { sheetId: 42, title: 'Summary', index: 1 } } }],
      };
      http._setPostResponse(okResponse(response));

      const result = await api.addSheet('abc123', 'Summary');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe('Summary');
        expect(result.value.sheetId).toBe(42);
      }
    });

    it('should return an error if reply is missing properties', async () => {
      http._setPostResponse(okResponse({ spreadsheetId: 'abc123', replies: [{}] }));

      const result = await api.addSheet('abc123', 'Bad');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Unexpected response');
      }
    });
  });

  describe('deleteSheet', () => {
    it('should delete a sheet tab', async () => {
      http._setPostResponse(okResponse({ spreadsheetId: 'abc123', replies: [{}] }));

      const result = await api.deleteSheet('abc123', 0);

      expect(result.ok).toBe(true);
    });

    it('should return an error on failure', async () => {
      http._setPostResponse(errResponse('Sheet not found', 404));

      const result = await api.deleteSheet('abc123', 999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Failed to delete sheet');
      }
    });
  });

  describe('insertRows', () => {
    it('should insert rows into a sheet', async () => {
      http._setPostResponse(okResponse({ spreadsheetId: 'abc123', replies: [{}] }));

      const result = await api.insertRows('abc123', 0, 2, 5);

      expect(result.ok).toBe(true);

      const body = http._getLastBody() as Record<string, unknown>;
      const requests = body['requests'] as Array<{ insertDimension: Record<string, unknown> }>;
      const request = requests[0]?.insertDimension;
      expect(request).toBeDefined();

      const range = request?.['range'] as Record<string, unknown>;
      expect(range?.['dimension']).toBe('ROWS');
      expect(range?.['startIndex']).toBe(2);
      expect(range?.['endIndex']).toBe(5);
    });
  });

  describe('insertColumns', () => {
    it('should insert columns into a sheet', async () => {
      http._setPostResponse(okResponse({ spreadsheetId: 'abc123', replies: [{}] }));

      const result = await api.insertColumns('abc123', 0, 1, 4);

      expect(result.ok).toBe(true);

      const body = http._getLastBody() as Record<string, unknown>;
      const requests = body['requests'] as Array<{ insertDimension: Record<string, unknown> }>;
      const request = requests[0]?.insertDimension;
      const range = request?.['range'] as Record<string, unknown>;
      expect(range?.['dimension']).toBe('COLUMNS');
      expect(range?.['startIndex']).toBe(1);
      expect(range?.['endIndex']).toBe(4);
    });
  });

  // -----------------------------------------------------------------------
  // Format operations
  // -----------------------------------------------------------------------

  describe('formatCells', () => {
    it('should apply formatting to a range', async () => {
      const response: BatchUpdateSpreadsheetResponse = {
        spreadsheetId: 'abc123',
        replies: [{}],
      };
      http._setPostResponse(okResponse(response));

      const result = await api.formatCells('abc123', {
        range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
        format: {
          textFormat: { bold: true },
          backgroundColor: { red: 0.9, green: 0.9, blue: 1.0 },
        },
      });

      expect(result.ok).toBe(true);

      const body = http._getLastBody() as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: Record<string, unknown> }>;
      const repeatCell = requests[0]?.repeatCell;
      expect(repeatCell).toBeDefined();
      expect(repeatCell?.['fields']).toContain('userEnteredFormat.textFormat');
      expect(repeatCell?.['fields']).toContain('userEnteredFormat.backgroundColor');
    });

    it('should return an error when no format fields are provided', async () => {
      const result = await api.formatCells('abc123', {
        range: { sheetId: 0 },
        format: {},
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('No format fields specified');
      }
    });

    it('should use a custom fields mask when provided', async () => {
      http._setPostResponse(okResponse({ spreadsheetId: 'abc123', replies: [{}] }));

      await api.formatCells('abc123', {
        range: { sheetId: 0 },
        format: { textFormat: { bold: true } },
        fields: 'userEnteredFormat.textFormat.bold',
      });

      const body = http._getLastBody() as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: Record<string, unknown> }>;
      expect(requests[0]?.repeatCell?.['fields']).toBe('userEnteredFormat.textFormat.bold');
    });
  });

  describe('batchFormatCells', () => {
    it('should apply formatting to multiple ranges', async () => {
      http._setPostResponse(okResponse({ spreadsheetId: 'abc123', replies: [{}, {}] }));

      const result = await api.batchFormatCells('abc123', [
        {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
          format: { textFormat: { bold: true } },
        },
        {
          range: { sheetId: 0, startRowIndex: 1, endRowIndex: 10 },
          format: { numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' } },
        },
      ]);

      expect(result.ok).toBe(true);

      const body = http._getLastBody() as Record<string, unknown>;
      const requests = body['requests'] as unknown[];
      expect(requests).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Plugin factory
  // -----------------------------------------------------------------------

  describe('sheets() plugin factory', () => {
    it('should create a valid plugin', () => {
      const plugin = sheets(http);

      expect(plugin.name).toBe('sheets');
      expect(plugin.version).toBe('0.1.0');
      expect(plugin.setup).toBeTypeOf('function');
      expect(plugin.teardown).toBeTypeOf('function');
    });

    it('should store SheetsApi in metadata on setup', () => {
      const plugin = sheets(http);
      const metadata = new Map<string, unknown>();
      const context = {
        events: {} as never,
        logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
        metadata,
        registerCommand: vi.fn(),
        registerTool: vi.fn(),
      };

      plugin.setup(context);

      expect(metadata.has('sheets')).toBe(true);
      const storedApi = metadata.get('sheets') as SheetsApi;
      expect(storedApi.getSpreadsheet).toBeTypeOf('function');
      expect(storedApi.getValues).toBeTypeOf('function');
      expect(storedApi.updateValues).toBeTypeOf('function');
      expect(storedApi.createSpreadsheet).toBeTypeOf('function');
      expect(storedApi.formatCells).toBeTypeOf('function');
    });

    it('should remove SheetsApi from metadata on teardown', () => {
      const plugin = sheets(http);
      const metadata = new Map<string, unknown>();
      const context = {
        events: {} as never,
        logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
        metadata,
        registerCommand: vi.fn(),
        registerTool: vi.fn(),
      };

      plugin.setup(context);
      expect(metadata.has('sheets')).toBe(true);

      plugin.teardown!(context);
      expect(metadata.has('sheets')).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // URL construction
  // -----------------------------------------------------------------------

  describe('URL construction', () => {
    it('should use correct base URL for all operations', async () => {
      const base = 'https://sheets.googleapis.com/v4/spreadsheets';

      // getSpreadsheet
      http._setGetResponse(okResponse({ spreadsheetId: 'x', properties: { title: '' }, sheets: [], spreadsheetUrl: '' }));
      await api.getSpreadsheet('x');
      expect(http._getLastUrl()).toContain(base);

      // getValues
      http._setGetResponse(okResponse({ range: 'A1', values: [] }));
      await api.getValues('x', 'A1');
      expect(http._getLastUrl()).toContain(`${base}/x/values/`);

      // updateValues
      http._setPutResponse(okResponse({ spreadsheetId: 'x', updatedRange: 'A1', updatedRows: 0, updatedColumns: 0, updatedCells: 0 }));
      await api.updateValues('x', 'A1', [['v']]);
      expect(http._getLastUrl()).toContain(`${base}/x/values/`);

      // createSpreadsheet
      http._setPostResponse(okResponse({ spreadsheetId: 'x', properties: { title: '' }, sheets: [], spreadsheetUrl: '' }));
      await api.createSpreadsheet({ title: 'T' });
      expect(http._getLastUrl()).toBe(base);
    });

    it('should encode spreadsheet IDs in URLs', async () => {
      http._setGetResponse(okResponse({ spreadsheetId: 'a/b', properties: { title: '' }, sheets: [], spreadsheetUrl: '' }));
      await api.getSpreadsheet('a/b');
      expect(http._getLastUrl()).toContain('a%2Fb');
    });
  });
});
