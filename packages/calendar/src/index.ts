/**
 * @openworkspace/calendar
 * Google Calendar API v3 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  CalendarEvent,
  CalendarEntry,
  EventDateTime,
  Attendee,
  ReminderOverride,
  EventReminders,
  ConferenceData,
  AclRule,
  AclScope,
  ColorDefinition,
  CalendarColors,
  BusySlot,
  FreeBusyCalendar,
  FreeBusyResponse,
  Conflict,
  EventsOptions,
  CreateEventOptions,
  UpdateEventOptions,
  FreeBusyOptions,
  EventListResponse,
  CalendarListResponse,
  AclListResponse,
} from './types.js';

// Event operations
export {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  searchEvents,
} from './events.js';

// Calendar list operations
export type { ListCalendarsOptions, GetAclOptions } from './calendars.js';
export { listCalendars, getAcl, getColors } from './calendars.js';

// Free/busy operations
export { queryFreeBusy, findConflicts } from './freebusy.js';

// Plugin & facade
export type { CalendarApi } from './plugin.js';
export { calendar, calendarPlugin } from './plugin.js';
