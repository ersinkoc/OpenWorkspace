/**
 * Calendar service plugin for OpenWorkspace.
 * Wraps all calendar operations into a single CalendarApi facade
 * and exposes a `calendar()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type {
  CalendarEvent,
  CalendarEntry,
  CalendarListResponse,
  EventListResponse,
  AclRule,
  CalendarColors,
  FreeBusyResponse,
  Conflict,
  EventsOptions,
  CreateEventOptions,
  UpdateEventOptions,
  FreeBusyOptions,
} from './types.js';
import type { ListCalendarsOptions, GetAclOptions } from './calendars.js';
import { listEvents, getEvent, createEvent, updateEvent, deleteEvent, searchEvents } from './events.js';
import { listCalendars, getAcl, getColors } from './calendars.js';
import { queryFreeBusy, findConflicts } from './freebusy.js';

// ---------------------------------------------------------------------------
// CalendarApi facade
// ---------------------------------------------------------------------------

/**
 * Unified Calendar API surface that wraps all Google Calendar operations.
 * Created via the {@link calendar} factory function.
 */
export type CalendarApi = {
  // -- Events ---------------------------------------------------------------

  /**
   * Lists events on a calendar.
   * @see {@link listEvents}
   */
  listEvents(
    calendarId: string,
    options?: EventsOptions,
  ): Promise<Result<EventListResponse, WorkspaceError>>;

  /**
   * Gets a single event by id.
   * @see {@link getEvent}
   */
  getEvent(
    calendarId: string,
    eventId: string,
  ): Promise<Result<CalendarEvent, WorkspaceError>>;

  /**
   * Creates a new event.
   * @see {@link createEvent}
   */
  createEvent(
    calendarId: string,
    options: CreateEventOptions,
  ): Promise<Result<CalendarEvent, WorkspaceError>>;

  /**
   * Updates an existing event (PATCH semantics).
   * @see {@link updateEvent}
   */
  updateEvent(
    calendarId: string,
    eventId: string,
    options: UpdateEventOptions,
  ): Promise<Result<CalendarEvent, WorkspaceError>>;

  /**
   * Deletes an event.
   * @see {@link deleteEvent}
   */
  deleteEvent(
    calendarId: string,
    eventId: string,
    sendUpdates?: 'all' | 'externalOnly' | 'none',
  ): Promise<Result<void, WorkspaceError>>;

  /**
   * Searches events by free-text query.
   * @see {@link searchEvents}
   */
  searchEvents(
    calendarId: string,
    query: string,
    options?: Omit<EventsOptions, 'q'>,
  ): Promise<Result<EventListResponse, WorkspaceError>>;

  // -- Calendars ------------------------------------------------------------

  /**
   * Lists calendars in the user's calendar list.
   * @see {@link listCalendars}
   */
  listCalendars(
    options?: ListCalendarsOptions,
  ): Promise<Result<CalendarListResponse, WorkspaceError>>;

  /**
   * Lists ACL rules for a calendar.
   * @see {@link getAcl}
   */
  getAcl(
    calendarId: string,
    options?: GetAclOptions,
  ): Promise<Result<readonly AclRule[], WorkspaceError>>;

  /**
   * Gets the calendar and event color palette.
   * @see {@link getColors}
   */
  getColors(): Promise<Result<CalendarColors, WorkspaceError>>;

  // -- Free / busy ----------------------------------------------------------

  /**
   * Queries free/busy information for calendars.
   * @see {@link queryFreeBusy}
   */
  queryFreeBusy(
    options: FreeBusyOptions,
  ): Promise<Result<FreeBusyResponse, WorkspaceError>>;

  /**
   * Finds scheduling conflicts for a proposed time slot.
   * @see {@link findConflicts}
   */
  findConflicts(
    calendarIds: readonly string[],
    timeMin: string,
    timeMax: string,
  ): Promise<Result<readonly Conflict[], WorkspaceError>>;
};

/**
 * Creates a {@link CalendarApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A CalendarApi facade exposing all calendar operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { calendar } from '@openworkspace/calendar';
 *
 * const http = createHttpClient();
 * const cal = calendar(http);
 *
 * const events = await cal.listEvents('primary', {
 *   timeMin: new Date().toISOString(),
 *   singleEvents: true,
 *   orderBy: 'startTime',
 * });
 * ```
 */
export function calendar(http: HttpClient): CalendarApi {
  return {
    // Events
    listEvents: (calendarId, options) => listEvents(http, calendarId, options),
    getEvent: (calendarId, eventId) => getEvent(http, calendarId, eventId),
    createEvent: (calendarId, options) => createEvent(http, calendarId, options),
    updateEvent: (calendarId, eventId, options) => updateEvent(http, calendarId, eventId, options),
    deleteEvent: (calendarId, eventId, sendUpdates) => deleteEvent(http, calendarId, eventId, sendUpdates),
    searchEvents: (calendarId, query, options) => searchEvents(http, calendarId, query, options),

    // Calendars
    listCalendars: (options) => listCalendars(http, options),
    getAcl: (calendarId, options) => getAcl(http, calendarId, options),
    getColors: () => getColors(http),

    // Free / busy
    queryFreeBusy: (options) => queryFreeBusy(http, options),
    findConflicts: (calendarIds, timeMin, timeMax) => findConflicts(http, calendarIds, timeMin, timeMax),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'calendar';

/**
 * Creates a Calendar kernel plugin.
 * The plugin stores the CalendarApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the calendar service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { calendarPlugin } from '@openworkspace/calendar';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(calendarPlugin(http));
 * await kernel.init();
 * ```
 */
export function calendarPlugin(http: HttpClient): Plugin {
  const api = calendar(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Calendar plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Calendar plugin torn down');
    },
  };
}
