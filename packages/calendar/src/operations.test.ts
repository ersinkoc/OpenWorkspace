/**
 * Operation-level tests for @openworkspace/calendar.
 * Covers events, calendars, and freebusy modules.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';

import { listEvents, getEvent, createEvent, updateEvent, deleteEvent, searchEvents } from './events.js';
import { listCalendars, getAcl, getColors } from './calendars.js';
import { queryFreeBusy, findConflicts } from './freebusy.js';

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
// events.ts
// ---------------------------------------------------------------------------

describe('events operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listEvents', () => {
    it('should GET events for a calendar', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [{ id: 'e1', summary: 'Meeting' }] }));
      const result = await listEvents(http, 'primary');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.items[0]?.summary).toBe('Meeting');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/calendars/primary/events');
    });

    it('should include query params', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [] }));
      await listEvents(http, 'primary', { maxResults: 10, singleEvents: true });
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('maxResults=10');
      expect(url).toContain('singleEvents=true');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listEvents(http, 'primary');
      expect(result.ok).toBe(false);
    });
  });

  describe('getEvent', () => {
    it('should GET a single event', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ id: 'e1', summary: 'Standup' }));
      const result = await getEvent(http, 'primary', 'e1');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('e1');
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/calendars/primary/events/e1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('not found', 404));
      const result = await getEvent(http, 'primary', 'x');
      expect(result.ok).toBe(false);
    });
  });

  describe('createEvent', () => {
    it('should POST event data', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({ id: 'e2', summary: 'New' }));
      const result = await createEvent(http, 'primary', {
        summary: 'New',
        start: { dateTime: '2025-06-01T10:00:00Z' },
        end: { dateTime: '2025-06-01T11:00:00Z' },
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.id).toBe('e2');
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/calendars/primary/events');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 400));
      const result = await createEvent(http, 'primary', { summary: 'X', start: { dateTime: '' }, end: { dateTime: '' } });
      expect(result.ok).toBe(false);
    });
  });

  describe('updateEvent', () => {
    it('should PATCH event data', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockOk({ id: 'e1', summary: 'Updated' }));
      const result = await updateEvent(http, 'primary', 'e1', { summary: 'Updated' });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.summary).toBe('Updated');
      expect(vi.mocked(http.patch).mock.calls[0]?.[0]).toContain('/calendars/primary/events/e1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.patch).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await updateEvent(http, 'primary', 'e1', { summary: 'X' });
      expect(result.ok).toBe(false);
    });
  });

  describe('deleteEvent', () => {
    it('should DELETE an event', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockOk(undefined));
      const result = await deleteEvent(http, 'primary', 'e1');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.delete).mock.calls[0]?.[0]).toContain('/calendars/primary/events/e1');
    });

    it('should propagate error', async () => {
      vi.mocked(http.delete).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await deleteEvent(http, 'primary', 'e1');
      expect(result.ok).toBe(false);
    });
  });

  describe('searchEvents', () => {
    it('should delegate to listEvents with q param', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [] }));
      await searchEvents(http, 'primary', 'standup');
      const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
      expect(url).toContain('q=standup');
      expect(url).toContain('singleEvents=true');
      expect(url).toContain('orderBy=startTime');
    });
  });
});

// ---------------------------------------------------------------------------
// calendars.ts
// ---------------------------------------------------------------------------

describe('calendars operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('listCalendars', () => {
    it('should GET calendar list', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [{ id: 'primary', summary: 'Main' }] }));
      const result = await listCalendars(http);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/users/me/calendarList');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await listCalendars(http);
      expect(result.ok).toBe(false);
    });
  });

  describe('getAcl', () => {
    it('should GET ACL rules for a calendar', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [{ role: 'owner', scope: { type: 'user' } }] }));
      const result = await getAcl(http, 'primary');
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/calendars/primary/acl');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 403));
      const result = await getAcl(http, 'primary');
      expect(result.ok).toBe(false);
    });
  });

  describe('getColors', () => {
    it('should GET color definitions', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockOk({ calendar: {}, event: {} }));
      const result = await getColors(http);
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.get).mock.calls[0]?.[0]).toContain('/colors');
    });

    it('should propagate error', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await getColors(http);
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// freebusy.ts
// ---------------------------------------------------------------------------

describe('freebusy operations', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  describe('queryFreeBusy', () => {
    it('should POST freebusy query', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        calendars: { primary: { busy: [{ start: 'a', end: 'b' }] } },
      }));
      const result = await queryFreeBusy(http, {
        timeMin: '2025-06-01T00:00:00Z',
        timeMax: '2025-06-02T00:00:00Z',
        items: [{ id: 'primary' }],
      });
      expect(result.ok).toBe(true);
      expect(vi.mocked(http.post).mock.calls[0]?.[0]).toContain('/freeBusy');
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await queryFreeBusy(http, { timeMin: '', timeMax: '', items: [] });
      expect(result.ok).toBe(false);
    });
  });

  describe('findConflicts', () => {
    it('should return conflicts when busy slots overlap', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        calendars: {
          primary: {
            busy: [{ start: '2025-06-01T09:00:00Z', end: '2025-06-01T10:30:00Z' }],
          },
        },
      }));
      const result = await findConflicts(http, ['primary'], '2025-06-01T10:00:00Z', '2025-06-01T11:00:00Z');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.length).toBe(1);
        expect(result.value[0]?.calendarId).toBe('primary');
      }
    });

    it('should return empty when no conflicts', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockOk({
        calendars: { primary: { busy: [] } },
      }));
      const result = await findConflicts(http, ['primary'], '2025-06-01T10:00:00Z', '2025-06-01T11:00:00Z');
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.length).toBe(0);
    });

    it('should propagate error', async () => {
      vi.mocked(http.post).mockResolvedValueOnce(mockErr('fail', 500));
      const result = await findConflicts(http, ['primary'], '', '');
      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Coverage: toWorkspaceError fallbacks & toQueryString with parameters
// ---------------------------------------------------------------------------

describe('calendars toWorkspaceError fallback (line 32)', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  it('should wrap a non-WorkspaceError into WorkspaceError', async () => {
    vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw cal error') as unknown as NetworkError));
    const result = await listCalendars(http);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('raw cal error');
    }
  });
});

describe('calendars toQueryString with parameters (lines 64-67)', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  it('should include showDeleted, showHidden, and syncToken in query string', async () => {
    vi.mocked(http.get).mockResolvedValueOnce(mockOk({ items: [] }));
    await listCalendars(http, {
      showDeleted: true,
      showHidden: true,
      syncToken: 'token123',
      maxResults: 50,
      pageToken: 'page2',
    });
    const url = vi.mocked(http.get).mock.calls[0]?.[0] as string;
    expect(url).toContain('showDeleted=true');
    expect(url).toContain('showHidden=true');
    expect(url).toContain('syncToken=token123');
    expect(url).toContain('maxResults=50');
    expect(url).toContain('pageToken=page2');
  });
});

describe('events toWorkspaceError fallback (line 47)', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  it('should wrap a non-WorkspaceError into WorkspaceError', async () => {
    vi.mocked(http.get).mockResolvedValueOnce(err(new Error('raw event error') as unknown as NetworkError));
    const result = await listEvents(http, 'primary');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('raw event error');
    }
  });
});

describe('freebusy toWorkspaceError fallback (line 31)', () => {
  let http: HttpClient;
  beforeEach(() => { http = createMockHttp(); });

  it('should wrap a non-WorkspaceError into WorkspaceError', async () => {
    vi.mocked(http.post).mockResolvedValueOnce(err(new Error('raw fb error') as unknown as NetworkError));
    const result = await queryFreeBusy(http, { timeMin: '', timeMax: '', items: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('raw fb error');
    }
  });
});
