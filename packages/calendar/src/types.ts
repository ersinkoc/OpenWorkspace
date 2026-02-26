/**
 * Type definitions for Google Calendar API v3.
 * Maps Google Calendar JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Core Calendar types
// ---------------------------------------------------------------------------

/**
 * A calendar entry from the user's calendar list.
 * Corresponds to `CalendarListEntry` in the Google Calendar API.
 */
export type CalendarEntry = {
  /** Calendar identifier (e.g. `primary` or an email address). */
  readonly id: string;
  /** Title of the calendar. */
  readonly summary: string;
  /** Description of the calendar. */
  readonly description?: string;
  /** Geographic location of the calendar. */
  readonly location?: string;
  /** The effective time zone of the calendar (IANA identifier). */
  readonly timeZone?: string;
  /** The foreground color of the calendar (hex). */
  readonly foregroundColor?: string;
  /** The background color of the calendar (hex). */
  readonly backgroundColor?: string;
  /** Whether the calendar is selected in the UI. */
  readonly selected?: boolean;
  /** The access role the authenticated user has for this calendar. */
  readonly accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  /** Whether the calendar is the primary calendar of the authenticated user. */
  readonly primary?: boolean;
  /** Whether the calendar is hidden from the list. */
  readonly hidden?: boolean;
};

/**
 * Date-time wrapper used in event start/end fields.
 */
export type EventDateTime = {
  /** Combined date-time value (RFC 3339). Present for timed events. */
  readonly dateTime?: string;
  /** Date value (yyyy-MM-dd). Present for all-day events. */
  readonly date?: string;
  /** IANA time zone identifier. */
  readonly timeZone?: string;
};

/**
 * An event attendee.
 */
export type Attendee = {
  /** Email address of the attendee. */
  readonly email: string;
  /** Display name of the attendee. */
  readonly displayName?: string;
  /** Whether the attendee is the organizer. */
  readonly organizer?: boolean;
  /** Whether this entry represents the calendar on which this event appears. */
  readonly self?: boolean;
  /** RSVP status. */
  readonly responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  /** Whether this is an optional attendee. */
  readonly optional?: boolean;
  /** Number of additional guests the attendee has invited. */
  readonly additionalGuests?: number;
  /** Comment from the attendee. */
  readonly comment?: string;
};

/**
 * Event reminder override.
 */
export type ReminderOverride = {
  /** Reminder delivery method. */
  readonly method: 'email' | 'popup';
  /** Minutes before the event to trigger the reminder. */
  readonly minutes: number;
};

/**
 * Event reminders configuration.
 */
export type EventReminders = {
  /** Whether the default reminders apply. */
  readonly useDefault: boolean;
  /** Reminder overrides (only when `useDefault` is false). */
  readonly overrides?: readonly ReminderOverride[];
};

/**
 * Conference solution details for an event.
 */
export type ConferenceData = {
  /** Conference solution type (e.g. `hangoutsMeet`). */
  readonly conferenceSolution?: {
    readonly name: string;
    readonly iconUri?: string;
    readonly key: { readonly type: string };
  };
  /** Entry points for the conference (e.g. video URI). */
  readonly entryPoints?: readonly {
    readonly entryPointType: string;
    readonly uri: string;
    readonly label?: string;
  }[];
  /** Conference identifier. */
  readonly conferenceId?: string;
};

/**
 * A calendar event.
 * Corresponds to the `Event` resource in the Google Calendar API.
 */
export type CalendarEvent = {
  /** Opaque identifier of the event. */
  readonly id: string;
  /** Status of the event. */
  readonly status?: 'confirmed' | 'tentative' | 'cancelled';
  /** URL to the event in Google Calendar. */
  readonly htmlLink?: string;
  /** Title of the event. */
  readonly summary?: string;
  /** Description / notes for the event. */
  readonly description?: string;
  /** Geographic location of the event (free-form text). */
  readonly location?: string;
  /** Creator of the event. */
  readonly creator?: {
    readonly email?: string;
    readonly displayName?: string;
    readonly self?: boolean;
  };
  /** Organizer of the event. */
  readonly organizer?: {
    readonly email?: string;
    readonly displayName?: string;
    readonly self?: boolean;
  };
  /** Start time of the event. */
  readonly start: EventDateTime;
  /** End time of the event. */
  readonly end: EventDateTime;
  /** Whether the event is an all-day event. */
  readonly endTimeUnspecified?: boolean;
  /** Recurrence rules (RRULE, EXRULE, RDATE, EXDATE). */
  readonly recurrence?: readonly string[];
  /** For recurring event instances, the id of the recurring event. */
  readonly recurringEventId?: string;
  /** Transparency (whether the event blocks time). */
  readonly transparency?: 'opaque' | 'transparent';
  /** Visibility of the event. */
  readonly visibility?: 'default' | 'public' | 'private' | 'confidential';
  /** List of attendees. */
  readonly attendees?: readonly Attendee[];
  /** Whether attendees may have been omitted from the response. */
  readonly attendeesOmitted?: boolean;
  /** Reminders configuration. */
  readonly reminders?: EventReminders;
  /** Conference data (Google Meet, etc.). */
  readonly conferenceData?: ConferenceData;
  /** Creation timestamp (RFC 3339). */
  readonly created?: string;
  /** Last modification timestamp (RFC 3339). */
  readonly updated?: string;
  /** Sequence number (used for optimistic concurrency). */
  readonly sequence?: number;
  /** iCalendar UID. */
  readonly iCalUID?: string;
  /** ETag of the event resource. */
  readonly etag?: string;
  /** Color id referencing the calendar color palette. */
  readonly colorId?: string;
  /** Whether this is a locked event. */
  readonly locked?: boolean;
  /** Extended properties. */
  readonly extendedProperties?: {
    readonly private?: Readonly<Record<string, string>>;
    readonly shared?: Readonly<Record<string, string>>;
  };
};

// ---------------------------------------------------------------------------
// ACL types
// ---------------------------------------------------------------------------

/**
 * Scope of an ACL rule.
 */
export type AclScope = {
  /** Scope type. */
  readonly type: 'default' | 'user' | 'group' | 'domain';
  /** Value depending on type (email, domain name, etc.). */
  readonly value?: string;
};

/**
 * An access control list rule for a calendar.
 */
export type AclRule = {
  /** Identifier of the ACL rule. */
  readonly id: string;
  /** ETag of the resource. */
  readonly etag?: string;
  /** The access role granted by this rule. */
  readonly role: 'none' | 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  /** The scope of this rule. */
  readonly scope: AclScope;
};

// ---------------------------------------------------------------------------
// Color types
// ---------------------------------------------------------------------------

/**
 * A single color definition with background and foreground values.
 */
export type ColorDefinition = {
  readonly background: string;
  readonly foreground: string;
};

/**
 * Calendar and event color palette returned by the Colors endpoint.
 */
export type CalendarColors = {
  /** Color definitions keyed by color id for calendars. */
  readonly calendar: Readonly<Record<string, ColorDefinition>>;
  /** Color definitions keyed by color id for events. */
  readonly event: Readonly<Record<string, ColorDefinition>>;
  /** Last modification time of the color palette (RFC 3339). */
  readonly updated?: string;
};

// ---------------------------------------------------------------------------
// Free / busy types
// ---------------------------------------------------------------------------

/**
 * A single busy time range.
 */
export type BusySlot = {
  /** Start of the busy period (RFC 3339). */
  readonly start: string;
  /** End of the busy period (RFC 3339). */
  readonly end: string;
};

/**
 * Free/busy information for a single calendar.
 */
export type FreeBusyCalendar = {
  /** List of busy time ranges. */
  readonly busy: readonly BusySlot[];
  /** Errors for this calendar, if any. */
  readonly errors?: readonly { readonly domain: string; readonly reason: string }[];
};

/**
 * Response from a free/busy query.
 */
export type FreeBusyResponse = {
  /** The kind of resource (`calendar#freeBusy`). */
  readonly kind: string;
  /** Start of the time range queried (RFC 3339). */
  readonly timeMin: string;
  /** End of the time range queried (RFC 3339). */
  readonly timeMax: string;
  /** Free/busy data keyed by calendar id. */
  readonly calendars: Readonly<Record<string, FreeBusyCalendar>>;
};

/**
 * A detected scheduling conflict between two calendars or events.
 */
export type Conflict = {
  /** Calendar id that has the conflict. */
  readonly calendarId: string;
  /** Start of the overlapping period (RFC 3339). */
  readonly start: string;
  /** End of the overlapping period (RFC 3339). */
  readonly end: string;
};

// ---------------------------------------------------------------------------
// Options / parameter types
// ---------------------------------------------------------------------------

/**
 * Options for listing events.
 */
export type EventsOptions = {
  /** Lower bound (exclusive) for an event's end time (RFC 3339). */
  readonly timeMin?: string;
  /** Upper bound (exclusive) for an event's start time (RFC 3339). */
  readonly timeMax?: string;
  /** Maximum number of events returned. */
  readonly maxResults?: number;
  /** Token for paginating through results. */
  readonly pageToken?: string;
  /** Whether to expand recurring events into instances. */
  readonly singleEvents?: boolean;
  /** Sort order (`startTime` requires `singleEvents: true`). */
  readonly orderBy?: 'startTime' | 'updated';
  /** Free text search query. */
  readonly q?: string;
  /** Whether to include deleted events. */
  readonly showDeleted?: boolean;
  /** Whether to include hidden invitations. */
  readonly showHiddenInvitations?: boolean;
  /** Time zone used in the response. */
  readonly timeZone?: string;
  /** Sync token from a previous list response for incremental sync. */
  readonly syncToken?: string;
};

/**
 * Options for creating a new event.
 */
export type CreateEventOptions = {
  /** Title of the event. */
  readonly summary: string;
  /** Description / notes. */
  readonly description?: string;
  /** Geographic location (free-form text). */
  readonly location?: string;
  /** Start time of the event. */
  readonly start: EventDateTime;
  /** End time of the event. */
  readonly end: EventDateTime;
  /** List of attendee email addresses. */
  readonly attendees?: readonly { readonly email: string }[];
  /** Recurrence rules. */
  readonly recurrence?: readonly string[];
  /** Reminders configuration. */
  readonly reminders?: EventReminders;
  /** Event visibility. */
  readonly visibility?: 'default' | 'public' | 'private' | 'confidential';
  /** Event transparency. */
  readonly transparency?: 'opaque' | 'transparent';
  /** Color id. */
  readonly colorId?: string;
  /** Whether to send notifications to attendees. */
  readonly sendUpdates?: 'all' | 'externalOnly' | 'none';
  /** Conference data request. */
  readonly conferenceData?: ConferenceData;
};

/**
 * Options for updating an existing event.
 * All fields are optional; only provided fields are updated.
 */
export type UpdateEventOptions = {
  /** Title of the event. */
  readonly summary?: string;
  /** Description / notes. */
  readonly description?: string;
  /** Geographic location (free-form text). */
  readonly location?: string;
  /** Start time of the event. */
  readonly start?: EventDateTime;
  /** End time of the event. */
  readonly end?: EventDateTime;
  /** List of attendee email addresses. */
  readonly attendees?: readonly { readonly email: string }[];
  /** Recurrence rules. */
  readonly recurrence?: readonly string[];
  /** Reminders configuration. */
  readonly reminders?: EventReminders;
  /** Event visibility. */
  readonly visibility?: 'default' | 'public' | 'private' | 'confidential';
  /** Event transparency. */
  readonly transparency?: 'opaque' | 'transparent';
  /** Color id. */
  readonly colorId?: string;
  /** Whether to send notifications to attendees. */
  readonly sendUpdates?: 'all' | 'externalOnly' | 'none';
  /** Event status. */
  readonly status?: 'confirmed' | 'tentative' | 'cancelled';
};

/**
 * Options for querying free/busy information.
 */
export type FreeBusyOptions = {
  /** Start of the interval (RFC 3339). */
  readonly timeMin: string;
  /** End of the interval (RFC 3339). */
  readonly timeMax: string;
  /** Calendar ids to query. */
  readonly items: readonly { readonly id: string }[];
  /** Time zone for the results. */
  readonly timeZone?: string;
  /** Maximum expansion of calendar ids (for groups). */
  readonly calendarExpansionMax?: number;
  /** Maximum expansion of group members. */
  readonly groupExpansionMax?: number;
};

// ---------------------------------------------------------------------------
// API list response wrappers
// ---------------------------------------------------------------------------

/**
 * Paginated list response for events.
 */
export type EventListResponse = {
  readonly kind: string;
  readonly summary: string;
  readonly updated: string;
  readonly timeZone: string;
  readonly accessRole: string;
  readonly nextPageToken?: string;
  readonly nextSyncToken?: string;
  readonly items: readonly CalendarEvent[];
};

/**
 * Paginated list response for calendar list entries.
 */
export type CalendarListResponse = {
  readonly kind: string;
  readonly nextPageToken?: string;
  readonly nextSyncToken?: string;
  readonly items: readonly CalendarEntry[];
};

/**
 * ACL list response.
 */
export type AclListResponse = {
  readonly kind: string;
  readonly nextPageToken?: string;
  readonly nextSyncToken?: string;
  readonly items: readonly AclRule[];
};
