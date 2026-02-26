# @openworkspace/groups

> Google Groups API client for OpenWorkspace -- list, members, settings.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/groups @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { listGroups, searchGroups, listMembers, addMember } from '@openworkspace/groups';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// List groups
const result = await listGroups(http, { parent: 'customers/my_customer' });
if (result.ok) {
  for (const group of result.value.groups ?? []) {
    console.log(group.displayName, group.groupKey?.id);
  }
}

// Search groups
const found = await searchGroups(http, { query: "displayName='Engineering'" });

// List members
const members = await listMembers(http, 'groups/GROUP_ID');

// Add a member
await addMember(http, 'groups/GROUP_ID', { preferredMemberKey: { id: 'alice@example.com' }, roles: [{ name: 'MEMBER' }] });
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Groups

- `listGroups(http, options)` -- List groups
- `getGroup(http, name)` -- Get a group
- `createGroup(http, group)` -- Create a group
- `updateGroup(http, name, group)` -- Update a group
- `deleteGroup(http, name)` -- Delete a group
- `searchGroups(http, options)` -- Search groups by query
- `lookupGroup(http, email)` -- Look up a group by email

### Members

- `listMembers(http, groupName, options)` -- List group members
- `addMember(http, groupName, membership)` -- Add a member
- `removeMember(http, membershipName)` -- Remove a member
- `getMembership(http, membershipName)` -- Get membership details

## License

[MIT](../../LICENSE)
