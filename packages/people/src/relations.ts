/**
 * Org chart operations for Google People API v1.
 * Functions for finding managers and direct reports.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { PersonProfile } from './types.js';
import { getProfile } from './profiles.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds a relation of a specific type from a profile.
 * @param profile - The person profile.
 * @param relationType - The type of relation to find (e.g., 'manager', 'direct_report').
 * @returns Array of resource names for the matching relations.
 */
function findRelationsByType(profile: PersonProfile, relationType: string): string[] {
  const relations = profile.relations ?? [];
  const matches: string[] = [];

  for (const relation of relations) {
    if (relation.type === relationType && relation.person) {
      matches.push(relation.person);
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Org chart operations
// ---------------------------------------------------------------------------

/**
 * Gets a user's manager.
 *
 * @param http - Authenticated HTTP client.
 * @param resourceName - Resource name of the person. Defaults to "people/me".
 * @returns The manager's profile, or null if no manager is found.
 *
 * @example
 * ```ts
 * const result = await getManager(http);
 * if (result.ok && result.value) {
 *   console.log('Manager:', result.value.names?.[0]?.displayName);
 * } else if (result.ok && !result.value) {
 *   console.log('No manager found');
 * }
 * ```
 */
export async function getManager(
  http: HttpClient,
  resourceName: string = 'people/me',
): Promise<Result<PersonProfile | null, WorkspaceError>> {
  // First, get the user's profile with relations
  const profileResult = await getProfile(http, resourceName, 'relations');

  if (!profileResult.ok) {
    return err(profileResult.error);
  }

  // Find manager relation
  const managerResourceNames = findRelationsByType(profileResult.value, 'manager');

  if (managerResourceNames.length === 0) {
    return ok(null);
  }

  // Get the manager's full profile
  const managerResourceName = managerResourceNames[0];
  if (!managerResourceName) {
    return ok(null);
  }

  const managerResult = await getProfile(http, managerResourceName);

  if (!managerResult.ok) {
    return err(managerResult.error);
  }

  return ok(managerResult.value);
}

/**
 * Gets a user's direct reports.
 *
 * @param http - Authenticated HTTP client.
 * @param resourceName - Resource name of the person. Defaults to "people/me".
 * @returns Array of direct report profiles.
 *
 * @example
 * ```ts
 * const result = await getDirectReports(http);
 * if (result.ok) {
 *   for (const report of result.value) {
 *     console.log('Direct report:', report.names?.[0]?.displayName);
 *   }
 * }
 * ```
 */
export async function getDirectReports(
  http: HttpClient,
  resourceName: string = 'people/me',
): Promise<Result<readonly PersonProfile[], WorkspaceError>> {
  // First, get the user's profile with relations
  const profileResult = await getProfile(http, resourceName, 'relations');

  if (!profileResult.ok) {
    return err(profileResult.error);
  }

  // Find direct report relations
  const reportResourceNames = findRelationsByType(profileResult.value, 'direct_report');

  if (reportResourceNames.length === 0) {
    return ok([]);
  }

  // Fetch all direct reports
  const reports: PersonProfile[] = [];

  for (const reportResourceName of reportResourceNames) {
    const reportResult = await getProfile(http, reportResourceName);

    if (reportResult.ok) {
      reports.push(reportResult.value);
    }
    // Continue fetching other reports even if one fails
  }

  return ok(reports);
}
