/**
 * Example: Calendar Today
 * List all events on the primary calendar for today.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { listEvents } from '@openworkspace/calendar';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Build today's time boundaries
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const result = await listEvents(http, 'primary', {
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });

  if (!result.ok) {
    console.error('Failed to list events:', result.error.message);
    return;
  }

  const events = result.value.items ?? [];

  if (events.length === 0) {
    console.log('No events scheduled for today.');
    return;
  }

  console.log(`Today's events (${events.length}):\n`);

  for (const event of events) {
    const start = event.start?.dateTime ?? event.start?.date ?? 'unknown';
    const end = event.end?.dateTime ?? event.end?.date ?? '';
    const time = event.start?.dateTime
      ? `${new Date(start).toLocaleTimeString()} - ${new Date(end).toLocaleTimeString()}`
      : 'All day';

    console.log(`  ${time}  ${event.summary ?? '(no title)'}`);
    if (event.location) {
      console.log(`           Location: ${event.location}`);
    }
  }
}

main().catch(console.error);
