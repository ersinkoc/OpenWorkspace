# @openworkspace/contacts

> Google Contacts API client for OpenWorkspace -- search, list, create, directory.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/contacts @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { searchContacts, createContact, listDirectoryPeople } from '@openworkspace/contacts';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Search contacts
const result = await searchContacts(http, { query: 'Alice' });
if (result.ok) {
  for (const person of result.value.results ?? []) {
    const name = person.person?.names?.[0]?.displayName;
    const email = person.person?.emailAddresses?.[0]?.value;
    console.log(name, email);
  }
}

// Create a contact
await createContact(http, {
  names: [{ givenName: 'Bob', familyName: 'Smith' }],
  emailAddresses: [{ value: 'bob@example.com' }],
});

// List directory (Workspace domain)
const dir = await listDirectoryPeople(http, { sources: ['DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE'] });
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

- `listContacts(http, options)` -- List contacts
- `getContact(http, resourceName)` -- Get a contact
- `createContact(http, options)` -- Create a contact
- `updateContact(http, options)` -- Update a contact
- `deleteContact(http, resourceName)` -- Delete a contact
- `searchContacts(http, options)` -- Search contacts by query
- `listDirectoryPeople(http, options)` -- List domain directory
- `searchDirectoryPeople(http, query)` -- Search domain directory
- `listOtherContacts(http, options)` -- List "other" contacts
- `searchOtherContacts(http, query)` -- Search "other" contacts

## License

[MIT](../../LICENSE)
