/**
 * Type definitions for Google People API v1.
 * Maps Google People/Contacts JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Google People API v1 base URL.
 */
export const BASE_URL = 'https://people.googleapis.com/v1';

/**
 * Default person fields to request from the API.
 */
export const DEFAULT_PERSON_FIELDS = 'names,emailAddresses,phoneNumbers,addresses,organizations,photos';

// ---------------------------------------------------------------------------
// Core Person types
// ---------------------------------------------------------------------------

/**
 * Metadata about a person field.
 */
export type FieldMetadata = {
  /** Whether this field is the primary value. */
  readonly primary?: boolean;
  /** Whether this field is verified. */
  readonly verified?: boolean;
  /** Source of the field. */
  readonly source?: {
    readonly type: string;
    readonly id?: string;
  };
};

/**
 * A person's name.
 */
export type Name = {
  /** Metadata about the name. */
  readonly metadata?: FieldMetadata;
  /** The display name formatted according to locale. */
  readonly displayName?: string;
  /** The family name (last name). */
  readonly familyName?: string;
  /** The given name (first name). */
  readonly givenName?: string;
  /** The middle name. */
  readonly middleName?: string;
  /** The display name with last name first. */
  readonly displayNameLastFirst?: string;
  /** The unstructured display name. */
  readonly unstructuredName?: string;
  /** Honorific prefixes (e.g., "Dr.", "Ms."). */
  readonly honorificPrefix?: string;
  /** Honorific suffixes (e.g., "Jr.", "III"). */
  readonly honorificSuffix?: string;
  /** Phonetic representation of the name. */
  readonly phoneticFullName?: string;
  readonly phoneticFamilyName?: string;
  readonly phoneticGivenName?: string;
};

/**
 * An email address.
 */
export type EmailAddress = {
  /** Metadata about the email. */
  readonly metadata?: FieldMetadata;
  /** The email address value. */
  readonly value: string;
  /** The type of email (e.g., "home", "work"). */
  readonly type?: string;
  /** The display name for the email. */
  readonly displayName?: string;
  /** The formatted type. */
  readonly formattedType?: string;
};

/**
 * A phone number.
 */
export type PhoneNumber = {
  /** Metadata about the phone number. */
  readonly metadata?: FieldMetadata;
  /** The phone number value. */
  readonly value: string;
  /** The canonical form of the phone number. */
  readonly canonicalForm?: string;
  /** The type of phone (e.g., "home", "work", "mobile"). */
  readonly type?: string;
  /** The formatted type. */
  readonly formattedType?: string;
};

/**
 * A physical address.
 */
export type Address = {
  /** Metadata about the address. */
  readonly metadata?: FieldMetadata;
  /** The full formatted address. */
  readonly formattedValue?: string;
  /** The type of address (e.g., "home", "work"). */
  readonly type?: string;
  /** The formatted type. */
  readonly formattedType?: string;
  /** The street address. */
  readonly streetAddress?: string;
  /** The P.O. box. */
  readonly poBox?: string;
  /** The city or locality. */
  readonly city?: string;
  /** The region or state. */
  readonly region?: string;
  /** The postal code. */
  readonly postalCode?: string;
  /** The country. */
  readonly country?: string;
  /** The country code. */
  readonly countryCode?: string;
  /** The extended address (e.g., apartment number). */
  readonly extendedAddress?: string;
};

/**
 * An organization (company, school, etc.).
 */
export type Organization = {
  /** Metadata about the organization. */
  readonly metadata?: FieldMetadata;
  /** The name of the organization. */
  readonly name?: string;
  /** The person's job title. */
  readonly title?: string;
  /** The department within the organization. */
  readonly department?: string;
  /** The symbol associated with the organization (e.g., stock ticker). */
  readonly symbol?: string;
  /** The domain name of the organization. */
  readonly domain?: string;
  /** The type of organization (e.g., "work", "school"). */
  readonly type?: string;
  /** The formatted type. */
  readonly formattedType?: string;
  /** The phonetic name. */
  readonly phoneticName?: string;
  /** The start date. */
  readonly startDate?: {
    readonly year?: number;
    readonly month?: number;
    readonly day?: number;
  };
  /** The end date. */
  readonly endDate?: {
    readonly year?: number;
    readonly month?: number;
    readonly day?: number;
  };
  /** Whether this is the current organization. */
  readonly current?: boolean;
};

/**
 * A biography or "about me" section.
 */
export type Biography = {
  /** Metadata about the biography. */
  readonly metadata?: FieldMetadata;
  /** The biography text. */
  readonly value: string;
  /** The content type. */
  readonly contentType?: 'TEXT_PLAIN' | 'TEXT_HTML';
};

/**
 * A photo.
 */
export type Photo = {
  /** Metadata about the photo. */
  readonly metadata?: FieldMetadata;
  /** The URL of the photo. */
  readonly url: string;
  /** Whether this is the default photo. */
  readonly default?: boolean;
};

/**
 * Metadata about a person resource.
 */
export type PersonMetadata = {
  /** Sources of person data. */
  readonly sources?: readonly {
    readonly type: string;
    readonly id?: string;
    readonly etag?: string;
    readonly updateTime?: string;
  }[];
  /** Object type (e.g., "PERSON"). */
  readonly objectType?: string;
  /** Whether the person is deleted. */
  readonly deleted?: boolean;
  /** Linked person info. */
  readonly linkedPeopleResourceNames?: readonly string[];
};

/**
 * A person resource representing a contact or directory entry.
 */
export type Person = {
  /** The resource name (e.g., "people/c1234567890"). */
  readonly resourceName: string;
  /** The ETag of the resource. */
  readonly etag?: string;
  /** Metadata about the person. */
  readonly metadata?: PersonMetadata;
  /** The person's names. */
  readonly names?: readonly Name[];
  /** The person's email addresses. */
  readonly emailAddresses?: readonly EmailAddress[];
  /** The person's phone numbers. */
  readonly phoneNumbers?: readonly PhoneNumber[];
  /** The person's physical addresses. */
  readonly addresses?: readonly Address[];
  /** The person's organizations. */
  readonly organizations?: readonly Organization[];
  /** The person's biographies. */
  readonly biographies?: readonly Biography[];
  /** The person's photos. */
  readonly photos?: readonly Photo[];
};

// ---------------------------------------------------------------------------
// Contact Group types
// ---------------------------------------------------------------------------

/**
 * A contact group (label).
 */
export type ContactGroup = {
  /** The resource name (e.g., "contactGroups/myContacts"). */
  readonly resourceName: string;
  /** The ETag of the resource. */
  readonly etag?: string;
  /** The contact group name. */
  readonly name?: string;
  /** The formatted name of the group. */
  readonly formattedName?: string;
  /** The group type. */
  readonly groupType?: 'USER_CONTACT_GROUP' | 'SYSTEM_CONTACT_GROUP';
  /** The number of contacts in the group. */
  readonly memberCount?: number;
  /** The resource names of the members. */
  readonly memberResourceNames?: readonly string[];
  /** Metadata about the group. */
  readonly metadata?: {
    readonly updateTime?: string;
    readonly deleted?: boolean;
  };
};

// ---------------------------------------------------------------------------
// API Response types
// ---------------------------------------------------------------------------

/**
 * Response from listing connections (contacts).
 */
export type ListConnectionsResponse = {
  /** The list of people (connections). */
  readonly connections?: readonly Person[];
  /** Token for the next page of results. */
  readonly nextPageToken?: string;
  /** Sync token for incremental sync. */
  readonly nextSyncToken?: string;
  /** Total number of people in the list. */
  readonly totalPeople?: number;
  /** Total number of items available. */
  readonly totalItems?: number;
};

/**
 * A search result containing a person.
 */
export type SearchResult = {
  /** The person matching the search. */
  readonly person: Person;
};

/**
 * Response from searching contacts.
 */
export type SearchResponse = {
  /** The search results. */
  readonly results?: readonly SearchResult[];
};

// ---------------------------------------------------------------------------
// Options types
// ---------------------------------------------------------------------------

/**
 * Options for listing contacts.
 */
export type ListContactsOptions = {
  /** The number of contacts to return (max 1000). */
  readonly pageSize?: number;
  /** Token for pagination. */
  readonly pageToken?: string;
  /** Fields to request. */
  readonly personFields?: string;
  /** Sort order for the results. */
  readonly sortOrder?: 'LAST_NAME_ASCENDING' | 'FIRST_NAME_ASCENDING';
  /** Sync token for incremental sync. */
  readonly syncToken?: string;
  /** Sources to read from. */
  readonly sources?: readonly string[];
};

/**
 * Options for searching contacts.
 */
export type SearchContactsOptions = {
  /** The number of results to return (max 30). */
  readonly pageSize?: number;
  /** Fields to request. */
  readonly personFields?: string;
  /** Sources to read from. */
  readonly sources?: readonly string[];
};

/**
 * Options for listing directory people.
 */
export type ListDirectoryPeopleOptions = {
  /** The number of people to return (max 1000). */
  readonly pageSize?: number;
  /** Token for pagination. */
  readonly pageToken?: string;
  /** Fields to request. */
  readonly personFields?: string;
  /** Sources to read from (must include "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE"). */
  readonly sources?: readonly string[];
  /** Merge person data from multiple sources. */
  readonly mergeSources?: readonly string[];
};

/**
 * Options for listing other contacts.
 */
export type ListOtherContactsOptions = {
  /** The number of contacts to return (max 1000). */
  readonly pageSize?: number;
  /** Token for pagination. */
  readonly pageToken?: string;
  /** Fields to request. */
  readonly personFields?: string;
};

/**
 * Options for creating a contact.
 */
export type CreateContactOptions = {
  /** The person data to create. */
  readonly names?: readonly Omit<Name, 'metadata'>[];
  readonly emailAddresses?: readonly Omit<EmailAddress, 'metadata'>[];
  readonly phoneNumbers?: readonly Omit<PhoneNumber, 'metadata'>[];
  readonly addresses?: readonly Omit<Address, 'metadata'>[];
  readonly organizations?: readonly Omit<Organization, 'metadata'>[];
  readonly biographies?: readonly Omit<Biography, 'metadata'>[];
  /** Fields to request in the response. */
  readonly personFields?: string;
  /** Sources to mutate. */
  readonly sources?: readonly string[];
};

/**
 * Options for updating a contact.
 */
export type UpdateContactOptions = {
  /** The person data to update. */
  readonly names?: readonly Omit<Name, 'metadata'>[];
  readonly emailAddresses?: readonly Omit<EmailAddress, 'metadata'>[];
  readonly phoneNumbers?: readonly Omit<PhoneNumber, 'metadata'>[];
  readonly addresses?: readonly Omit<Address, 'metadata'>[];
  readonly organizations?: readonly Omit<Organization, 'metadata'>[];
  readonly biographies?: readonly Omit<Biography, 'metadata'>[];
  /** Sources to mutate. */
  readonly sources?: readonly string[];
};

// ---------------------------------------------------------------------------
// ContactsApi type
// ---------------------------------------------------------------------------

/**
 * Unified Contacts API surface that wraps all Google People API operations.
 */
export type ContactsApi = {
  // -- Contacts -------------------------------------------------------------

  /**
   * Lists the authenticated user's contacts.
   */
  listContacts(
    options?: ListContactsOptions,
  ): Promise<Result<ListConnectionsResponse, WorkspaceError>>;

  /**
   * Gets a single contact by resource name.
   */
  getContact(
    resourceName: string,
    personFields?: string,
  ): Promise<Result<Person, WorkspaceError>>;

  /**
   * Creates a new contact.
   */
  createContact(
    person: CreateContactOptions,
  ): Promise<Result<Person, WorkspaceError>>;

  /**
   * Updates an existing contact.
   */
  updateContact(
    resourceName: string,
    person: UpdateContactOptions,
    updatePersonFields: string,
  ): Promise<Result<Person, WorkspaceError>>;

  /**
   * Deletes a contact.
   */
  deleteContact(
    resourceName: string,
  ): Promise<Result<void, WorkspaceError>>;

  /**
   * Searches contacts by name or email.
   */
  searchContacts(
    query: string,
    options?: SearchContactsOptions,
  ): Promise<Result<SearchResponse, WorkspaceError>>;

  // -- Directory ------------------------------------------------------------

  /**
   * Lists people in the organization's directory.
   */
  listDirectoryPeople(
    options?: ListDirectoryPeopleOptions,
  ): Promise<Result<ListConnectionsResponse, WorkspaceError>>;

  /**
   * Searches the organization's directory.
   */
  searchDirectoryPeople(
    query: string,
    options?: SearchContactsOptions,
  ): Promise<Result<SearchResponse, WorkspaceError>>;

  // -- Other Contacts -------------------------------------------------------

  /**
   * Lists other contacts (from interactions).
   */
  listOtherContacts(
    options?: ListOtherContactsOptions,
  ): Promise<Result<ListConnectionsResponse, WorkspaceError>>;

  /**
   * Searches other contacts.
   */
  searchOtherContacts(
    query: string,
  ): Promise<Result<SearchResponse, WorkspaceError>>;
};

// Re-export Result and WorkspaceError types for convenience
import type { Result, WorkspaceError } from '@openworkspace/core';
export type { Result, WorkspaceError };
