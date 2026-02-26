/**
 * @openworkspace/contacts
 * Google People/Contacts API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  Person,
  Name,
  EmailAddress,
  PhoneNumber,
  Address,
  Organization,
  Biography,
  Photo,
  PersonMetadata,
  FieldMetadata,
  ContactGroup,
  ListConnectionsResponse,
  SearchResponse,
  SearchResult,
  ListContactsOptions,
  SearchContactsOptions,
  ListDirectoryPeopleOptions,
  ListOtherContactsOptions,
  CreateContactOptions,
  UpdateContactOptions,
  ContactsApi,
} from './types.js';

export { BASE_URL, DEFAULT_PERSON_FIELDS } from './types.js';

// Contact operations
export {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  searchContacts,
} from './contacts.js';

// Directory operations
export { listDirectoryPeople, searchDirectoryPeople } from './directory.js';

// Other contacts operations
export { listOtherContacts, searchOtherContacts } from './other-contacts.js';

// Plugin & facade
export { contacts, contactsPlugin } from './plugin.js';
