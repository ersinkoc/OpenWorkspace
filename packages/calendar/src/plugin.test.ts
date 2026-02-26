/**
 * Tests for @openworkspace/calendar.
 * Uses mock HttpClient to verify all operations without network access.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, NetworkError } from '@openworkspace/core';
import { calendar, calendarPlugin } from './plugin.js';
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent, searchEvents } from './events.js';
import { listCalendars, getAcl, getColors } from './calendars.js';
import { queryFreeBusy, findConflicts } from './freebusy.js';
import type {
  CalendarEvent,
  EventListResponse,
  CalendarListResponse,
  AclListResponse,
  CalendarColors,
  FreeBusyResponse,
} from './types.js';

// ---------------------------------------------------------------------------
// Mock HttpClient factory
// ---------------------------------------------------------------------------

type MockHttpClient = HttpClient & {
  _getHandler: ReturnType<typeof vi.fn>;
  _postHandler: ReturnType<typeof vi.fn>;
  _patchHandler: ReturnType<typeof vi.fn>;
  _putHandler: ReturnType<typeof vi.fn>;
  _deleteHandler: ReturnType<typeof vi.fn>;
};

function mockResponse<T>(data: T, status = 200): Result<HttpResponse<T>, NetworkError> {
  return ok({
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    data,
  });
}

function mockError(message: string, status = 500): Result<never, NetworkError> {
  return err(new NetworkError(message, { status }, status));
}

function createMockHttp(): MockHttpClient {
  const getHandler = vi.fn();
  const postHandler = vi.fn();
  const patchHandler = vi.fn();
  const putHandler = vi.fn();
  const deleteHandler = vi.fn();

  return {
    request: vi.fn(),
    get: getHandler,
    post: postHandler,
    put: putHandler,
    patch: patchHandler,
    delete: deleteHandler,
    interceptors: { request: [], response: [], error: [] },
    _getHandler: getHandler,
    _postHandler: postHandler,
    _patchHandler: patchHandler,
    _putHandler: putHandler,
    _deleteHandler: deleteHandler,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const EVENT_FIXTURE: CalendarEvent = {
  id: 'evt-1',
  summary: 'Team sync',
  start: { dateTime: '2025-06-01T10:00:00Z' },
  end: { dateTime: '2025-06-01T11:00:00Z' },
  status: 'confirmed',
  attendees: [
    { email: 'alice@example.com', responseStatus: 'accepted' },
    { email: 'bob@example.com', responseStatus: 'needsAction' },
  ],
};

const EVENT_LIST_FIXTURE: EventListResponse = {
  kind: 'calendar#events',
  summary: 'My Calendar',
  updated: '2025-06-01T00:00:00Z',
  timeZone: 'America/New_York',
  accessRole: 'owner',
  items: [EVENT_FIXTURE],
};

const CALENDAR_LIST_FIXTURE: CalendarListResponse = {
  kind: 'calendar#calendarList',
  items: [
    {
      id: 'primary',
      summary: 'My Calendar',
      accessRole: 'owner',
      primary: true,
    },
    {
      id: 'holidays@group.v.calendar.google.com',
      summary: 'Holidays',
      accessRole: 'reader',
    },
  ],
};

const ACL_LIST_FIXTURE: AclListResponse = {
  kind: 'calendar#acl',
  items: [
    {
      id: 'user:alice@example.com',
      role: 'writer',
      scope: { type: 'user', value: 'alice@example.com' },
    },
  ],
};

const COLORS_FIXTURE: CalendarColors = {
  calendar: {
    '1': { background: '#ac725e', foreground: '#1d1d1d' },
  },
  event: {
    '1': { background: '#a4bdfc', foreground: '#1d1d1d' },
  },
  updated: '2025-01-01T00:00:00Z',
};

const FREEBUSY_FIXTURE: FreeBusyResponse = {
  kind: 'calendar#freeBusy',
  timeMin: '2025-06-01T00:00:00Z',
  timeMax: '2025-06-02T00:00:00Z',
  calendars: {
    primary: {
      busy: [
        { start: '2025-06-01T09:00:00Z', end: '2025-06-01T10:00:00Z' },
        { start: '2025-06-01T14:00:00Z', end: '2025-06-01T15:00:00Z' },
      ],
    },
    'colleague@example.com': {
      busy: [
        { start: '2025-06-01T10:30:00Z', end: '2025-06-01T11:30:00Z' },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Tests: Plugin creation
// ---------------------------------------------------------------------------

describe('calendar()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a CalendarApi with all expected methods', () => {
    const api = calendar(http);

    expect(typeof api.listEvents).toBe('function');
    expect(typeof api.getEvent).toBe('function');
    expect(typeof api.createEvent).toBe('function');
    expect(typeof api.updateEvent).toBe('function');
    expect(typeof api.deleteEvent).toBe('function');
    expect(typeof api.searchEvents).toBe('function');
    expect(typeof api.listCalendars).toBe('function');
    expect(typeof api.getAcl).toBe('function');
    expect(typeof api.getColors).toBe('function');
    expect(typeof api.queryFreeBusy).toBe('function');
    expect(typeof api.findConflicts).toBe('function');
  });
});

describe('calendarPlugin()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates a plugin with the correct name and version', () => {
    const plugin = calendarPlugin(http);

    expect(plugin.name).toBe('calendar');
    expect(plugin.version).toBe('0.1.0');
    expect(typeof plugin.setup).toBe('function');
    expect(typeof plugin.teardown).toBe('function');
  });

  it('stores CalendarApi in metadata on setup', () => {
    const plugin = calendarPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);

    expect(metadata.has('calendar')).toBe(true);
    const api = metadata.get('calendar') as ReturnType<typeof calendar>;
    expect(typeof api.listEvents).toBe('function');
  });

  it('removes CalendarApi from metadata on teardown', () => {
    const plugin = calendarPlugin(http);
    const metadata = new Map<string, unknown>();
    const ctx = {
      events: {} as never,
      logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
      metadata,
      registerCommand: vi.fn(),
      registerTool: vi.fn(),
    };

    plugin.setup(ctx);
    expect(metadata.has('calendar')).toBe(true);

    plugin.teardown!(ctx);
    expect(metadata.has('calendar')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: Event operations
// ---------------------------------------------------------------------------

describe('listEvents()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of events on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_LIST_FIXTURE));

    const result = await listEvents(http, 'primary', {
      timeMin: '2025-06-01T00:00:00Z',
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      const first = result.value.items[0];
      expect(first?.summary).toBe('Team sync');
    }

    expect(http._getHandler).toHaveBeenCalledOnce();
    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/calendars/primary/events');
    expect(url).toContain('timeMin=');
    expect(url).toContain('singleEvents=true');
    expect(url).toContain('orderBy=startTime');
  });

  it('returns error on network failure', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Connection refused'));

    const result = await listEvents(http, 'primary');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Connection refused');
    }
  });

  it('does not append query string when no options provided', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_LIST_FIXTURE));

    await listEvents(http, 'primary');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toBe('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  });
});

describe('getEvent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a single event on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_FIXTURE));

    const result = await getEvent(http, 'primary', 'evt-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('evt-1');
      expect(result.value.summary).toBe('Team sync');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/calendars/primary/events/evt-1');
  });

  it('returns error when event not found', async () => {
    http._getHandler.mockResolvedValueOnce(mockError('Not Found', 404));

    const result = await getEvent(http, 'primary', 'nonexistent');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Not Found');
    }
  });
});

describe('createEvent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('creates an event and returns it', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(EVENT_FIXTURE));

    const result = await createEvent(http, 'primary', {
      summary: 'Team sync',
      start: { dateTime: '2025-06-01T10:00:00Z' },
      end: { dateTime: '2025-06-01T11:00:00Z' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('evt-1');
    }

    expect(http._postHandler).toHaveBeenCalledOnce();
    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/calendars/primary/events');
  });

  it('includes sendUpdates in query string when provided', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(EVENT_FIXTURE));

    await createEvent(http, 'primary', {
      summary: 'Team sync',
      start: { dateTime: '2025-06-01T10:00:00Z' },
      end: { dateTime: '2025-06-01T11:00:00Z' },
      sendUpdates: 'all',
    });

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('sendUpdates=all');
  });

  it('sends event body in request config', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(EVENT_FIXTURE));

    await createEvent(http, 'primary', {
      summary: 'Standup',
      description: 'Daily standup meeting',
      start: { dateTime: '2025-06-01T10:00:00Z' },
      end: { dateTime: '2025-06-01T10:15:00Z' },
    });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      summary: 'Standup',
      description: 'Daily standup meeting',
    });
  });
});

describe('updateEvent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('patches an event and returns the updated version', async () => {
    const updatedEvent = { ...EVENT_FIXTURE, summary: 'Updated sync' };
    http._patchHandler.mockResolvedValueOnce(mockResponse(updatedEvent));

    const result = await updateEvent(http, 'primary', 'evt-1', {
      summary: 'Updated sync',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.summary).toBe('Updated sync');
    }

    expect(http._patchHandler).toHaveBeenCalledOnce();
    const url = http._patchHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/calendars/primary/events/evt-1');
  });
});

describe('deleteEvent()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('deletes an event successfully', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    const result = await deleteEvent(http, 'primary', 'evt-1');

    expect(result.ok).toBe(true);
    expect(http._deleteHandler).toHaveBeenCalledOnce();
  });

  it('passes sendUpdates as query parameter', async () => {
    http._deleteHandler.mockResolvedValueOnce(mockResponse(null, 204));

    await deleteEvent(http, 'primary', 'evt-1', 'externalOnly');

    const url = http._deleteHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('sendUpdates=externalOnly');
  });
});

describe('searchEvents()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates to listEvents with q parameter and defaults', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_LIST_FIXTURE));

    const result = await searchEvents(http, 'primary', 'standup');

    expect(result.ok).toBe(true);

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('q=standup');
    expect(url).toContain('singleEvents=true');
    expect(url).toContain('orderBy=startTime');
  });

  it('allows overriding default options', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_LIST_FIXTURE));

    await searchEvents(http, 'primary', 'meeting', {
      maxResults: 5,
      singleEvents: false,
    });

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('q=meeting');
    expect(url).toContain('maxResults=5');
    // singleEvents=false from options should override the default true
    expect(url).toContain('singleEvents=false');
  });
});

// ---------------------------------------------------------------------------
// Tests: Calendar list operations
// ---------------------------------------------------------------------------

describe('listCalendars()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns a list of calendars on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(CALENDAR_LIST_FIXTURE));

    const result = await listCalendars(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(2);
      const primary = result.value.items[0];
      expect(primary?.summary).toBe('My Calendar');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/users/me/calendarList');
  });
});

describe('getAcl()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns ACL rules on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(ACL_LIST_FIXTURE));

    const result = await getAcl(http, 'primary');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      const rule = result.value[0];
      expect(rule?.role).toBe('writer');
      expect(rule?.scope.value).toBe('alice@example.com');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/calendars/primary/acl');
  });
});

describe('getColors()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns color definitions on success', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COLORS_FIXTURE));

    const result = await getColors(http);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.calendar).toBeDefined();
      expect(result.value.event).toBeDefined();
      expect(result.value.calendar['1']?.background).toBe('#ac725e');
    }

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/colors');
  });
});

// ---------------------------------------------------------------------------
// Tests: Free/busy operations
// ---------------------------------------------------------------------------

describe('queryFreeBusy()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns free/busy data on success', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FREEBUSY_FIXTURE));

    const result = await queryFreeBusy(http, {
      timeMin: '2025-06-01T00:00:00Z',
      timeMax: '2025-06-02T00:00:00Z',
      items: [{ id: 'primary' }, { id: 'colleague@example.com' }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const primaryBusy = result.value.calendars['primary'];
      expect(primaryBusy?.busy).toHaveLength(2);
    }

    const url = http._postHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/freeBusy');
  });

  it('sends body with calendar items', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FREEBUSY_FIXTURE));

    await queryFreeBusy(http, {
      timeMin: '2025-06-01T00:00:00Z',
      timeMax: '2025-06-02T00:00:00Z',
      items: [{ id: 'primary' }],
    });

    const config = http._postHandler.mock.calls[0]?.[1] as { body: Record<string, unknown> };
    expect(config.body).toMatchObject({
      timeMin: '2025-06-01T00:00:00Z',
      timeMax: '2025-06-02T00:00:00Z',
      items: [{ id: 'primary' }],
    });
  });
});

describe('findConflicts()', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('returns conflicts when proposed time overlaps busy slots', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FREEBUSY_FIXTURE));

    // Proposed time 09:30-10:30 overlaps with primary's 09:00-10:00
    // and colleague's 10:30-11:30 is at the exact boundary
    const result = await findConflicts(
      http,
      ['primary', 'colleague@example.com'],
      '2025-06-01T09:30:00Z',
      '2025-06-01T10:30:00Z',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      // primary has busy 09:00-10:00 which overlaps with 09:30-10:30
      // colleague has busy 10:30-11:30 which starts exactly when we end (no overlap)
      expect(result.value.length).toBeGreaterThanOrEqual(1);

      const primaryConflict = result.value.find((c) => c.calendarId === 'primary');
      expect(primaryConflict).toBeDefined();
      expect(primaryConflict?.start).toBe('2025-06-01T09:30:00Z');
      expect(primaryConflict?.end).toBe('2025-06-01T10:00:00Z');
    }
  });

  it('returns no conflicts when proposed time is free', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FREEBUSY_FIXTURE));

    // Proposed time 12:00-13:00 -- no one is busy then
    const result = await findConflicts(
      http,
      ['primary', 'colleague@example.com'],
      '2025-06-01T12:00:00Z',
      '2025-06-01T13:00:00Z',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });

  it('returns error when queryFreeBusy fails', async () => {
    http._postHandler.mockResolvedValueOnce(mockError('Forbidden', 403));

    const result = await findConflicts(
      http,
      ['primary'],
      '2025-06-01T09:00:00Z',
      '2025-06-01T10:00:00Z',
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('Forbidden');
    }
  });

  it('handles calendars not present in response gracefully', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FREEBUSY_FIXTURE));

    // 'unknown@example.com' is not in the fixture response
    const result = await findConflicts(
      http,
      ['unknown@example.com'],
      '2025-06-01T09:00:00Z',
      '2025-06-01T10:00:00Z',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: CalendarApi facade (via plugin)
// ---------------------------------------------------------------------------

describe('CalendarApi facade', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('delegates listEvents through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_LIST_FIXTURE));

    const api = calendar(http);
    const result = await api.listEvents('primary', { maxResults: 5 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
    }
  });

  it('delegates createEvent through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(EVENT_FIXTURE));

    const api = calendar(http);
    const result = await api.createEvent('primary', {
      summary: 'Test',
      start: { dateTime: '2025-06-01T10:00:00Z' },
      end: { dateTime: '2025-06-01T11:00:00Z' },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe('evt-1');
    }
  });

  it('delegates getColors through the facade', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(COLORS_FIXTURE));

    const api = calendar(http);
    const result = await api.getColors();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.calendar['1']?.background).toBe('#ac725e');
    }
  });

  it('delegates findConflicts through the facade', async () => {
    http._postHandler.mockResolvedValueOnce(mockResponse(FREEBUSY_FIXTURE));

    const api = calendar(http);
    const result = await api.findConflicts(
      ['primary'],
      '2025-06-01T09:30:00Z',
      '2025-06-01T10:30:00Z',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Tests: URL encoding
// ---------------------------------------------------------------------------

describe('URL encoding', () => {
  let http: MockHttpClient;

  beforeEach(() => {
    http = createMockHttp();
  });

  it('encodes special characters in calendarId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_LIST_FIXTURE));

    await listEvents(http, 'user@example.com');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/calendars/user%40example.com/events');
  });

  it('encodes special characters in eventId', async () => {
    http._getHandler.mockResolvedValueOnce(mockResponse(EVENT_FIXTURE));

    await getEvent(http, 'primary', 'evt/with/slashes');

    const url = http._getHandler.mock.calls[0]?.[0] as string;
    expect(url).toContain('/events/evt%2Fwith%2Fslashes');
  });
});
