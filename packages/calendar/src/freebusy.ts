/**
 * Free/busy query operations for Google Calendar API v3.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  FreeBusyResponse,
  FreeBusyOptions,
  Conflict,
  BusySlot,
} from './types.js';

/**
 * Google Calendar API v3 base URL.
 */
const BASE = 'https://www.googleapis.com/calendar/v3';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a WorkspaceError from an HttpClient error result.
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
// Free/busy operations
// ---------------------------------------------------------------------------

/**
 * Queries free/busy information for one or more calendars.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Time range and calendar ids to query.
 * @returns Free/busy data keyed by calendar id.
 *
 * @example
 * ```ts
 * const result = await queryFreeBusy(http, {
 *   timeMin: '2025-06-01T00:00:00Z',
 *   timeMax: '2025-06-02T00:00:00Z',
 *   items: [{ id: 'primary' }, { id: 'colleague@example.com' }],
 * });
 * if (result.ok) {
 *   for (const [calId, data] of Object.entries(result.value.calendars)) {
 *     console.log(`${calId}: ${data.busy.length} busy slots`);
 *   }
 * }
 * ```
 */
export async function queryFreeBusy(
  http: HttpClient,
  options: FreeBusyOptions,
): Promise<Result<FreeBusyResponse, WorkspaceError>> {
  const url = `${BASE}/freeBusy`;

  const result = await http.post<FreeBusyResponse>(url, {
    body: options as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Checks whether two time ranges overlap.
 */
function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Computes the overlap interval between two time ranges.
 * Returns `undefined` if there is no overlap.
 */
function overlapInterval(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): { start: string; end: string } | undefined {
  if (!rangesOverlap(aStart, aEnd, bStart, bEnd)) {
    return undefined;
  }
  return {
    start: aStart > bStart ? aStart : bStart,
    end: aEnd < bEnd ? aEnd : bEnd,
  };
}

/**
 * Finds scheduling conflicts for a proposed time slot across one or more calendars.
 *
 * This is a higher-level helper that calls {@link queryFreeBusy} and then
 * inspects the returned busy slots to determine whether any calendar has a
 * conflict with the proposed time range.
 *
 * @param http - Authenticated HTTP client.
 * @param calendarIds - Calendar ids to check for conflicts.
 * @param timeMin - Start of the proposed time slot (RFC 3339).
 * @param timeMax - End of the proposed time slot (RFC 3339).
 * @returns A list of conflicts (empty if no conflicts).
 *
 * @example
 * ```ts
 * const result = await findConflicts(
 *   http,
 *   ['primary', 'colleague@example.com'],
 *   '2025-06-01T10:00:00Z',
 *   '2025-06-01T11:00:00Z',
 * );
 * if (result.ok && result.value.length > 0) {
 *   console.log('Conflicts found:', result.value);
 * }
 * ```
 */
export async function findConflicts(
  http: HttpClient,
  calendarIds: readonly string[],
  timeMin: string,
  timeMax: string,
): Promise<Result<readonly Conflict[], WorkspaceError>> {
  const fbResult = await queryFreeBusy(http, {
    timeMin,
    timeMax,
    items: calendarIds.map((id) => ({ id })),
  });

  if (!fbResult.ok) {
    return fbResult;
  }

  const conflicts: Conflict[] = [];
  const calendars = fbResult.value.calendars;

  for (const calendarId of calendarIds) {
    const calData = calendars[calendarId];
    if (!calData) {
      continue;
    }

    for (const slot of calData.busy) {
      const overlap = overlapInterval(timeMin, timeMax, slot.start, slot.end);
      if (overlap) {
        conflicts.push({
          calendarId,
          start: overlap.start,
          end: overlap.end,
        });
      }
    }
  }

  return ok(conflicts);
}
