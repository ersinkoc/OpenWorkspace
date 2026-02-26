/**
 * @openworkspace/people
 * Google People API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 * Focused on user profiles and org charts (not contacts CRUD).
 */

// Types
export type {
  PersonProfile,
  ProfileName,
  ProfileEmail,
  ProfilePhone,
  ProfilePhoto,
  ProfileOrganization,
  ProfileRelation,
  ProfileLocation,
  ProfileBirthday,
  ProfileUrl,
  ProfileBiography,
  ProfileCoverPhoto,
  DateValue,
  ProfileMetadata,
  Source,
  GetPeopleResponse,
  PersonResponse,
  SearchProfilesOptions,
  SearchDirectoryResponse,
  PeopleApi,
} from './types.js';

export { BASE_URL, DEFAULT_PROFILE_FIELDS } from './types.js';

// Profile operations
export {
  getProfile,
  getProfileByEmail,
  getBatchProfiles,
  searchProfiles,
} from './profiles.js';

// Org chart operations
export {
  getManager,
  getDirectReports,
} from './relations.js';

// Plugin & facade
export { people, peoplePlugin } from './plugin.js';
