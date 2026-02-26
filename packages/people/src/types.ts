/**
 * Type definitions for Google People API v1.
 * Maps Google People API JSON responses to clean TypeScript interfaces.
 * Focused on user profiles and org charts (not contacts CRUD).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Google People API v1 base URL.
 */
export const BASE_URL = 'https://people.googleapis.com/v1';

/**
 * Default profile fields to request when fetching user profiles.
 */
export const DEFAULT_PROFILE_FIELDS = 'names,emailAddresses,phoneNumbers,photos,organizations,locations,relations';

// ---------------------------------------------------------------------------
// Core People types
// ---------------------------------------------------------------------------

/**
 * A date value used in birthdays and other date fields.
 */
export type DateValue = {
  /** Year of the date. */
  readonly year?: number;
  /** Month of the date (1-12). */
  readonly month?: number;
  /** Day of the date (1-31). */
  readonly day?: number;
};

/**
 * A person's name.
 */
export type ProfileName = {
  /** Display name formatted for display. */
  readonly displayName?: string;
  /** Family name (surname). */
  readonly familyName?: string;
  /** Given name (first name). */
  readonly givenName?: string;
  /** Middle name. */
  readonly middleName?: string;
  /** Display name with last name first. */
  readonly displayNameLastFirst?: string;
};

/**
 * An email address.
 */
export type ProfileEmail = {
  /** The email address. */
  readonly value?: string;
  /** Type of email (work, home, other). */
  readonly type?: string;
  /** Human-readable type (e.g., "Work", "Personal"). */
  readonly formattedType?: string;
  /** Display name for the email. */
  readonly displayName?: string;
};

/**
 * A phone number.
 */
export type ProfilePhone = {
  /** The phone number. */
  readonly value?: string;
  /** Type of phone (mobile, work, home, etc.). */
  readonly type?: string;
  /** Human-readable type. */
  readonly formattedType?: string;
  /** Canonicalized form of the phone number. */
  readonly canonicalForm?: string;
};

/**
 * A photo or avatar image.
 */
export type ProfilePhoto = {
  /** URL of the photo. */
  readonly url?: string;
  /** Whether this is the default photo. */
  readonly default?: boolean;
};

/**
 * An organization or workplace.
 */
export type ProfileOrganization = {
  /** Name of the organization. */
  readonly name?: string;
  /** Job title. */
  readonly title?: string;
  /** Department. */
  readonly department?: string;
  /** Type of organization. */
  readonly type?: string;
  /** Human-readable type. */
  readonly formattedType?: string;
  /** Start date. */
  readonly startDate?: DateValue;
  /** End date. */
  readonly endDate?: DateValue;
  /** Whether this is the current organization. */
  readonly current?: boolean;
  /** Physical location of the organization. */
  readonly location?: string;
  /** Stock symbol of the organization. */
  readonly symbol?: string;
  /** Domain name of the organization. */
  readonly domain?: string;
};

/**
 * A relationship to another person.
 */
export type ProfileRelation = {
  /** Resource name or name of the related person. */
  readonly person?: string;
  /** Type of relation (manager, direct_report, etc.). */
  readonly type?: string;
  /** Human-readable type. */
  readonly formattedType?: string;
};

/**
 * A physical location.
 */
export type ProfileLocation = {
  /** The location value (address or description). */
  readonly value?: string;
  /** Type of location (desk, etc.). */
  readonly type?: string;
  /** Human-readable type. */
  readonly formattedType?: string;
  /** Whether this is the current location. */
  readonly current?: boolean;
  /** Building ID. */
  readonly buildingId?: string;
  /** Floor number. */
  readonly floor?: string;
  /** Floor section. */
  readonly floorSection?: string;
  /** Desk code or number. */
  readonly deskCode?: string;
};

/**
 * A birthday.
 */
export type ProfileBirthday = {
  /** Date of birth. */
  readonly date?: DateValue;
  /** Textual representation of the birthday. */
  readonly text?: string;
};

/**
 * A URL.
 */
export type ProfileUrl = {
  /** The URL value. */
  readonly value?: string;
  /** Type of URL. */
  readonly type?: string;
  /** Human-readable type. */
  readonly formattedType?: string;
};

/**
 * A biography or about section.
 */
export type ProfileBiography = {
  /** The biography text. */
  readonly value?: string;
  /** Content type (e.g., TEXT_PLAIN, TEXT_HTML). */
  readonly contentType?: string;
};

/**
 * A cover photo.
 */
export type ProfileCoverPhoto = {
  /** URL of the cover photo. */
  readonly url?: string;
  /** Whether this is the default cover photo. */
  readonly default?: boolean;
};

/**
 * Source information for a field.
 */
export type Source = {
  /** Source type (ACCOUNT, PROFILE, DOMAIN_PROFILE, CONTACT). */
  readonly type?: 'ACCOUNT' | 'PROFILE' | 'DOMAIN_PROFILE' | 'CONTACT';
  /** Source ID. */
  readonly id?: string;
  /** ETag of the source. */
  readonly etag?: string;
  /** Profile metadata for the source. */
  readonly profileMetadata?: {
    readonly objectType?: 'PERSON' | 'PAGE';
    readonly userTypes?: readonly string[];
  };
};

/**
 * Metadata about a person resource.
 */
export type ProfileMetadata = {
  /** Sources contributing to this profile. */
  readonly sources?: readonly Source[];
  /** Object type (PERSON or PAGE). */
  readonly objectType?: 'PERSON' | 'PAGE';
  /** Previous resource names if the resource was renamed. */
  readonly previousResourceNames?: readonly string[];
};

/**
 * A person profile from the Google People API.
 */
export type PersonProfile = {
  /** Resource name of the person (e.g., "people/123456789"). */
  readonly resourceName?: string;
  /** ETag of the resource. */
  readonly etag?: string;
  /** Metadata about this person resource. */
  readonly metadata?: ProfileMetadata;
  /** Names of the person. */
  readonly names?: readonly ProfileName[];
  /** Email addresses. */
  readonly emailAddresses?: readonly ProfileEmail[];
  /** Phone numbers. */
  readonly phoneNumbers?: readonly ProfilePhone[];
  /** Photos. */
  readonly photos?: readonly ProfilePhoto[];
  /** Organizations. */
  readonly organizations?: readonly ProfileOrganization[];
  /** Locations. */
  readonly locations?: readonly ProfileLocation[];
  /** Relations to other people. */
  readonly relations?: readonly ProfileRelation[];
  /** Birthdays. */
  readonly birthdays?: readonly ProfileBirthday[];
  /** URLs. */
  readonly urls?: readonly ProfileUrl[];
  /** Biographies. */
  readonly biographies?: readonly ProfileBiography[];
  /** Cover photos. */
  readonly coverPhotos?: readonly ProfileCoverPhoto[];
};

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

/**
 * Response from a single person request.
 */
export type PersonResponse = {
  /** HTTP status code. */
  readonly httpStatusCode?: number;
  /** The person resource. */
  readonly person?: PersonProfile;
  /** Resource name that was requested. */
  readonly requestedResourceName?: string;
  /** Status message. */
  readonly status?: {
    readonly code?: number;
    readonly message?: string;
  };
};

/**
 * Response from a batch people get request.
 */
export type GetPeopleResponse = {
  /** Individual person responses. */
  readonly responses?: readonly PersonResponse[];
};

// ---------------------------------------------------------------------------
// Options types
// ---------------------------------------------------------------------------

/**
 * Options for searching profiles.
 */
export type SearchProfilesOptions = {
  /** Maximum number of results to return. */
  readonly pageSize?: number;
  /** Page token for pagination. */
  readonly pageToken?: string;
  /** Person fields to return. */
  readonly readMask?: string;
};

/**
 * Response from a directory people search.
 */
export type SearchDirectoryResponse = {
  /** List of matching people. */
  readonly people?: readonly PersonProfile[];
  /** Token for the next page of results. */
  readonly nextPageToken?: string;
  /** Total size of the result set (may be approximate). */
  readonly totalSize?: number;
};

// ---------------------------------------------------------------------------
// PeopleApi facade
// ---------------------------------------------------------------------------

/**
 * Unified People API surface that wraps all Google People operations.
 * Created via the {@link people} factory function.
 */
export type PeopleApi = {
  /**
   * Gets the authenticated user's profile.
   */
  getProfile(
    resourceName?: string,
    personFields?: string,
  ): Promise<import('@openworkspace/core').Result<PersonProfile, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Gets a profile by email address.
   */
  getProfileByEmail(
    email: string,
  ): Promise<import('@openworkspace/core').Result<PersonProfile, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Gets multiple profiles in a single batch request.
   */
  getBatchProfiles(
    resourceNames: readonly string[],
    personFields?: string,
  ): Promise<import('@openworkspace/core').Result<GetPeopleResponse, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Searches directory profiles.
   */
  searchProfiles(
    query: string,
    options?: SearchProfilesOptions,
  ): Promise<import('@openworkspace/core').Result<SearchDirectoryResponse, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Gets a user's manager.
   */
  getManager(
    resourceName?: string,
  ): Promise<import('@openworkspace/core').Result<PersonProfile | null, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Gets a user's direct reports.
   */
  getDirectReports(
    resourceName?: string,
  ): Promise<import('@openworkspace/core').Result<readonly PersonProfile[], import('@openworkspace/core').WorkspaceError>>;
};
