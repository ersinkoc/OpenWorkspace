/**
 * Event operations for Google Calendar API v3.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, HttpResponse, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  CalendarEvent,
  EventListResponse,
  EventsOptions,
  CreateEventOptions,
  UpdateEventOptions,
} from './types.js';

/**
 * Google Calendar API v3 base URL.
 */
const BASE = 'https://www.googleapis.com/calendar/v3';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query-string from an options object.
 * Drops `undefined` values and correctly encodes all values.
 */
function toQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 * The HttpClient returns NetworkError which already extends WorkspaceError.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'CALENDAR_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Event operations
// ---------------------------------------------------------------------------

/**
 * Lists events on the specified calendar.
 *
 * @param http  - Authenticated HTTP client.
 * @param calendarId - Calendar identifier (use `"primary"` for the user's primary calendar).
 * @param options - Optional filtering / pagination parameters.
 * @returns A paginated list of calendar events.
 *
 * @example
 * ```ts
 * const result = await listEvents(http, 'primary', {
 *   timeMin: new Date().toISOString(),
 *   maxResults: 10,
 *   singleEvents: true,
 *   orderBy: 'startTime',
 * });
 * if (result.ok) {
 *   for (const event of result.value.items) {
 *     console.log(event.summary);
 *   }
 * }
 * ```
 */
export async function listEvents(
  http: HttpClient,
  calendarId: string,
  options: EventsOptions = {},
): Promise<Result<EventListResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE}/calendars/${encodeURIComponent(calendarId)}/events${qs}`;

  const result = await http.get<EventListResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Gets a single event by its identifier.
 *
 * @param http  - Authenticated HTTP client.
 * @param calendarId - Calendar identifier.
 * @param eventId - Event identifier.
 * @returns The requested calendar event.
 *
 * @example
 * ```ts
 * const result = await getEvent(http, 'primary', 'abc123');
 * if (result.ok) console.log(result.value.summary);
 * ```
 */
export async function getEvent(
  http: HttpClient,
  calendarId: string,
  eventId: string,
): Promise<Result<CalendarEvent, WorkspaceError>> {
  const url = `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;

  const result = await http.get<CalendarEvent>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new event on the specified calendar.
 *
 * @param http  - Authenticated HTTP client.
 * @param calendarId - Calendar identifier.
 * @param options - Event details.
 * @returns The newly created calendar event.
 *
 * @example
 * ```ts
 * const result = await createEvent(http, 'primary', {
 *   summary: 'Team sync',
 *   start: { dateTime: '2025-06-01T10:00:00Z' },
 *   end:   { dateTime: '2025-06-01T11:00:00Z' },
 * });
 * if (result.ok) console.log('Created:', result.value.id);
 * ```
 */
export async function createEvent(
  http: HttpClient,
  calendarId: string,
  options: CreateEventOptions,
): Promise<Result<CalendarEvent, WorkspaceError>> {
  const { sendUpdates, ...body } = options;
  const qs = toQueryString({ sendUpdates });
  const url = `${BASE}/calendars/${encodeURIComponent(calendarId)}/events${qs}`;

  const result = await http.post<CalendarEvent>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Updates an existing event on the specified calendar.
 * Uses PATCH semantics -- only the provided fields are modified.
 *
 * @param http  - Authenticated HTTP client.
 * @param calendarId - Calendar identifier.
 * @param eventId - Event identifier.
 * @param options - Fields to update.
 * @returns The updated calendar event.
 *
 * @example
 * ```ts
 * const result = await updateEvent(http, 'primary', 'abc123', {
 *   summary: 'Updated title',
 * });
 * if (result.ok) console.log('Updated:', result.value.summary);
 * ```
 */
export async function updateEvent(
  http: HttpClient,
  calendarId: string,
  eventId: string,
  options: UpdateEventOptions,
): Promise<Result<CalendarEvent, WorkspaceError>> {
  const { sendUpdates, ...body } = options;
  const qs = toQueryString({ sendUpdates });
  const url = `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${qs}`;

  const result = await http.patch<CalendarEvent>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Deletes an event from the specified calendar.
 *
 * @param http  - Authenticated HTTP client.
 * @param calendarId - Calendar identifier.
 * @param eventId - Event identifier.
 * @param sendUpdates - Whether to send cancellation notifications to attendees.
 * @returns `void` on success.
 *
 * @example
 * ```ts
 * const result = await deleteEvent(http, 'primary', 'abc123');
 * if (result.ok) console.log('Deleted');
 * ```
 */
export async function deleteEvent(
  http: HttpClient,
  calendarId: string,
  eventId: string,
  sendUpdates?: 'all' | 'externalOnly' | 'none',
): Promise<Result<void, WorkspaceError>> {
  const qs = toQueryString({ sendUpdates });
  const url = `${BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${qs}`;

  const result = await http.delete(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(undefined);
}

/**
 * Searches for events matching a free-text query.
 * This is a convenience wrapper around {@link listEvents} that sets the `q`
 * parameter and defaults to `singleEvents: true` with `orderBy: 'startTime'`.
 *
 * @param http  - Authenticated HTTP client.
 * @param calendarId - Calendar identifier.
 * @param query - Free-text search string.
 * @param options - Additional filtering / pagination parameters.
 * @returns A paginated list of matching calendar events.
 *
 * @example
 * ```ts
 * const result = await searchEvents(http, 'primary', 'standup', {
 *   timeMin: new Date().toISOString(),
 *   maxResults: 5,
 * });
 * if (result.ok) {
 *   console.log(`Found ${result.value.items.length} events`);
 * }
 * ```
 */
export async function searchEvents(
  http: HttpClient,
  calendarId: string,
  query: string,
  options: Omit<EventsOptions, 'q'> = {},
): Promise<Result<EventListResponse, WorkspaceError>> {
  return listEvents(http, calendarId, {
    singleEvents: true,
    orderBy: 'startTime',
    ...options,
    q: query,
  });
}
