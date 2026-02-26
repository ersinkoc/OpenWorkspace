/**
 * Example: Calendar Conflicts
 * Detect scheduling conflicts for a proposed meeting time.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { findConflicts, queryFreeBusy, listEvents } from '@openworkspace/calendar';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Calendars to check
  const calendars = ['primary', 'colleague@example.com', 'team-room@example.com'];

  // Proposed meeting: tomorrow 10:00-11:00
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  const proposedStart = tomorrow.toISOString();
  const proposedEnd = new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString();

  console.log(`Checking availability for: ${proposedStart} to ${proposedEnd}\n`);

  // Method 1: Use findConflicts for a simple yes/no + details
  const conflictsResult = await findConflicts(http, calendars, proposedStart, proposedEnd);

  if (!conflictsResult.ok) {
    console.error('Conflict check failed:', conflictsResult.error.message);
    return;
  }

  const conflicts = conflictsResult.value;

  if (conflicts.length === 0) {
    console.log('No conflicts found -- the time slot is available.');
  } else {
    console.log(`Found ${conflicts.length} conflict(s):\n`);
    for (const conflict of conflicts) {
      console.log(`  Calendar: ${conflict.calendarId}`);
      console.log(`  Overlap:  ${conflict.overlapStart} to ${conflict.overlapEnd}`);
      console.log();
    }
  }

  // Method 2: Use queryFreeBusy for raw busy slot data
  const freeBusyResult = await queryFreeBusy(http, {
    timeMin: proposedStart,
    timeMax: proposedEnd,
    items: calendars.map((id) => ({ id })),
  });

  if (freeBusyResult.ok) {
    console.log('Free/busy data:');
    for (const [calId, data] of Object.entries(freeBusyResult.value.calendars ?? {})) {
      const busyCount = data.busy?.length ?? 0;
      const status = busyCount > 0 ? `${busyCount} busy slot(s)` : 'free';
      console.log(`  ${calId}: ${status}`);
    }
  }
}

main().catch(console.error);
