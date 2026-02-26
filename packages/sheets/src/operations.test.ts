/**
 * Operation-level tests for @openworkspace/sheets.
 * Covers read, write, format, and structure modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { getSpreadsheet, getValues, batchGetValues, getMetadata } from './read.js';
import { updateValues, appendValues, clearValues, batchUpdateValues } from './write.js';
import { formatCells, batchFormatCells } from './format.js';
import { createSpreadsheet, addSheet, deleteSheet, insertRows, insertColumns } from './structure.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createMockHttp(): HttpClient {
  const methods = ['request', 'get', 'post', 'put', 'patch', 'delete'] as const;
  const mock = { interceptors: { request: [], response: [], error: [] } } as unknown as HttpClient;
  for (const method of methods) {
    (mock as Record<string, unknown>)[method] = vi.fn();
  }
  return mock;
}

function mockOk<T>(data: T): Result<HttpResponse<T>, NetworkError> {
  return ok({ status: 200, statusText: 'OK', headers: {}, data });
}

function mockErr(message: string, statusCode?: number): Result<never, NetworkError> {
  return err(new NetworkError(message, { url: 'test' }, statusCode));
}

// ---------------------------------------------------------------------------
// read.ts
// ---------------------------------------------------------------------------

describe('read operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('getSpreadsheet', () => {
    it('should GET spreadsheet by id', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ spreadsheetId: 'abc', properties: { title: 'My Sheet' } }));
      const result = await getSpreadsheet(http, 'abc');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.properties.title).toBe('My Sheet');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/spreadsheets/abc');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 404));
      const result = await getSpreadsheet(http, 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('getValues', () => {
    it('should GET values for a range', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ range: 'Sheet1!A1:B2', values: [['a', 'b']] }));
      const result = await getValues(http, 'abc', 'Sheet1!A1:B2');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.values?.[0]?.[0]).toBe('a');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getValues(http, 'x', 'A1');
      expect(result.ok).toBe(false);
    });
  });

  describe('batchGetValues', () => {
    it('should GET multiple ranges', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ valueRanges: [{ range: 'A1:B2', values: [] }] }));
      const result = await batchGetValues(http, 'abc', ['A1:B2', 'C1:D2']);
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('ranges=');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchGetValues(http, 'x', []);
      expect(result.ok).toBe(false);
    });
  });

  describe('getMetadata', () => {
    it('should GET sheet metadata', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }] }));
      const result = await getMetadata(http, 'abc');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value[0]?.title).toBe('Sheet1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getMetadata(http, 'x');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// write.ts
// ---------------------------------------------------------------------------

describe('write operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('updateValues', () => {
    it('should PUT values to a range', async () => {
      vi.mocked(http.put).mockResolvedValueOnce(mockOk({ updatedCells: 4, updatedRows: 2 }));
      const result = await updateValues(http, 'abc', 'Sheet1!A1', [['a', 'b'], [1, 2]]);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.updatedCells).toBe(4);
      const url = vi.mocked(http.put).mock.calls[0]?.[0] as string;
      expect(url).toContain('/values/');
      expect(url).toContain('valueInputOption=USER_ENTERED');
    });

    it('should propagate error', async () => {
      vi.mocked(http.put).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateValues(http, 'x', 'A1', []);
      expect(result.ok).toBe(false);
    });
  });

  describe('appendValues', () => {
    it('should POST values to append', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ updates: { updatedCells: 2 } }));
      const result = await appendValues(http, 'abc', 'Sheet1!A:D', [['c', 'd']]);
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain(':append');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await appendValues(http, 'x', 'A:D', []);
      expect(result.ok).toBe(false);
    });
  });

  describe('clearValues', () => {
    it('should POST to clear endpoint', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ clearedRange: 'Sheet1!A1:D10' }));
      const result = await clearValues(http, 'abc', 'Sheet1!A1:D10');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.clearedRange).toBe('Sheet1!A1:D10');
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain(':clear');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await clearValues(http, 'x', 'A1');
      expect(result.ok).toBe(false);
    });
  });

  describe('batchUpdateValues', () => {
    it('should POST batch update', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ totalUpdatedCells: 8 }));
      const result = await batchUpdateValues(http, 'abc', [
        { range: 'A1:B2', values: [['a', 'b']] },
      ]);
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain('/values:batchUpdate');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchUpdateValues(http, 'x', []);
      expect(result.ok).toBe(false);
    });

    it('should include optional response properties in body', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ totalUpdatedCells: 4 }));
      const result = await batchUpdateValues(http, 'abc', [
        { range: 'A1:B2', values: [['a', 'b']] },
      ], {
        includeValuesInResponse: true,
        responseDateTimeRenderOption: 'FORMATTED_STRING',
        responseValueRenderOption: 'UNFORMATTED_VALUE',
      });
      expect(result.ok).toBe(true);
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      expect(body['includeValuesInResponse']).toBe(true);
      expect(body['responseDateTimeRenderOption']).toBe('FORMATTED_STRING');
      expect(body['responseValueRenderOption']).toBe('UNFORMATTED_VALUE');
    });
  });
});

// ---------------------------------------------------------------------------
// format.ts
// ---------------------------------------------------------------------------

describe('format operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('formatCells', () => {
    it('should POST batchUpdate with repeatCell request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await formatCells(http, 'abc', {
        range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
        format: { textFormat: { bold: true } },
      });
      expect(result.ok).toBe(true);
      const url = vi.mocked(http.post).mock.calls[0]?.[0] as string;
      expect(url).toContain(':batchUpdate');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await formatCells(http, 'x', {
        range: { sheetId: 0 },
        format: { textFormat: { bold: true } },
      });
      expect(result.ok).toBe(false);
    });

    it('should build field mask for numberFormat', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await formatCells(http, 'abc', {
        range: { sheetId: 0 },
        format: { numberFormat: { type: 'NUMBER', pattern: '#,##0' } },
      });
      expect(result.ok).toBe(true);
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: { fields: string } }>;
      expect(requests[0]?.repeatCell.fields).toContain('userEnteredFormat.numberFormat');
    });

    it('should build field mask for borders', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await formatCells(http, 'abc', {
        range: { sheetId: 0 },
        format: { borders: { top: { style: 'SOLID' } } },
      });
      expect(result.ok).toBe(true);
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: { fields: string } }>;
      expect(requests[0]?.repeatCell.fields).toContain('userEnteredFormat.borders');
    });

    it('should build field mask for padding', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await formatCells(http, 'abc', {
        range: { sheetId: 0 },
        format: { padding: { top: 5 } },
      });
      expect(result.ok).toBe(true);
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: { fields: string } }>;
      expect(requests[0]?.repeatCell.fields).toContain('userEnteredFormat.padding');
    });

    it('should build field mask for verticalAlignment', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await formatCells(http, 'abc', {
        range: { sheetId: 0 },
        format: { verticalAlignment: 'MIDDLE' },
      });
      expect(result.ok).toBe(true);
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: { fields: string } }>;
      expect(requests[0]?.repeatCell.fields).toContain('userEnteredFormat.verticalAlignment');
    });

    it('should build field mask for wrapStrategy', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await formatCells(http, 'abc', {
        range: { sheetId: 0 },
        format: { wrapStrategy: 'WRAP' },
      });
      expect(result.ok).toBe(true);
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: { fields: string } }>;
      expect(requests[0]?.repeatCell.fields).toContain('userEnteredFormat.wrapStrategy');
    });

    it('should build field mask for textFormat', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await formatCells(http, 'abc', {
        range: { sheetId: 0 },
        format: { textFormat: { bold: true } },
      });
      expect(result.ok).toBe(true);
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      const requests = body['requests'] as Array<{ repeatCell: { fields: string } }>;
      expect(requests[0]?.repeatCell.fields).toContain('userEnteredFormat.textFormat');
    });
  });

  describe('batchFormatCells', () => {
    it('should POST batchUpdate with multiple repeatCell requests', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await batchFormatCells(http, 'abc', [
        { range: { sheetId: 0 }, format: { textFormat: { bold: true } } },
        { range: { sheetId: 0 }, format: { horizontalAlignment: 'CENTER' } },
      ]);
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await batchFormatCells(http, 'x', []);
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// structure.ts
// ---------------------------------------------------------------------------

describe('structure operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('createSpreadsheet', () => {
    it('should POST new spreadsheet', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ spreadsheetId: 'new1', properties: { title: 'Q4' } }));
      const result = await createSpreadsheet(http, { title: 'Q4', sheetTitles: ['Sheet1'] });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.spreadsheetId).toBe('new1');
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/spreadsheets');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await createSpreadsheet(http, { title: 'X' });
      expect(result.ok).toBe(false);
    });
  });

  describe('addSheet', () => {
    it('should POST batchUpdate with addSheet request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        replies: [{ addSheet: { properties: { sheetId: 1, title: 'Summary' } } }],
      }));
      const result = await addSheet(http, 'abc', 'Summary');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('Summary');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await addSheet(http, 'x', 'Y');
      expect(result.ok).toBe(false);
    });

    it('should include index in properties when provided', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        replies: [{ addSheet: { properties: { sheetId: 2, title: 'AtIndex', index: 1 } } }],
      }));
      const result = await addSheet(http, 'abc', 'AtIndex', 1);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.title).toBe('AtIndex');
      const body = vi.mocked(http.post).mock.calls[0]?.[1]?.body as Record<string, unknown>;
      const requests = body['requests'] as Array<{ addSheet: { properties: Record<string, unknown> } }>;
      expect(requests[0]?.addSheet.properties['index']).toBe(1);
    });
  });

  describe('deleteSheet', () => {
    it('should POST batchUpdate with deleteSheet request', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await deleteSheet(http, 'abc', 0);
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteSheet(http, 'x', 0);
      expect(result.ok).toBe(false);
    });
  });

  describe('insertRows', () => {
    it('should POST batchUpdate with insertDimension ROWS', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await insertRows(http, 'abc', 0, 2, 7);
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await insertRows(http, 'x', 0, 0, 1);
      expect(result.ok).toBe(false);
    });
  });

  describe('insertColumns', () => {
    it('should POST batchUpdate with insertDimension COLUMNS', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ replies: [] }));
      const result = await insertColumns(http, 'abc', 0, 1, 4);
      expect(result.ok).toBe(true);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await insertColumns(http, 'x', 0, 0, 1);
      expect(result.ok).toBe(false);
    });
  });
});
