# @openworkspace/calendar

> Google Calendar API client for OpenWorkspace -- events, create, free/busy.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/calendar @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { listEvents, createEvent, queryFreeBusy } from '@openworkspace/calendar';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// List upcoming events
const result = await listEvents(http, {
  timeMin: new Date().toISOString(),
  maxResults: 10,
});
if (result.ok) {
  for (const event of result.value.items ?? []) {
    console.log(event.summary, event.start?.dateTime);
  }
}

// Create an event
await createEvent(http, {
  summary: 'Team Standup',
  start: { dateTime: '2025-01-15T09:00:00Z' },
  end: { dateTime: '2025-01-15T09:30:00Z' },
  attendees: [{ email: 'alice@example.com' }],
});

// Check free/busy
const busy = await queryFreeBusy(http, {
  timeMin: '2025-01-15T00:00:00Z',
  timeMax: '2025-01-15T23:59:59Z',
  items: [{ id: 'primary' }],
});
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

- `listEvents(http, options)` -- List calendar events
- `getEvent(http, eventId)` -- Get event by ID
- `createEvent(http, options)` -- Create a new event
- `updateEvent(http, options)` -- Update an existing event
- `deleteEvent(http, eventId)` -- Delete an event
- `searchEvents(http, query)` -- Search events by text
- `listCalendars(http)` -- List calendars
- `getAcl(http, options)` -- Get calendar ACL rules
- `getColors(http)` -- Get calendar color definitions
- `queryFreeBusy(http, options)` -- Query free/busy information
- `findConflicts(http, options)` -- Find scheduling conflicts

## License

[MIT](../../LICENSE)
