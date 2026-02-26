# @openworkspace/people

> Google People API client for OpenWorkspace -- profiles, manager/reports relations.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/people @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { getProfile, getProfileByEmail, getManager, getDirectReports } from '@openworkspace/people';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Get current user's profile
const result = await getProfile(http, 'people/me');
if (result.ok) {
  const p = result.value;
  console.log(p.names?.[0]?.displayName, p.emailAddresses?.[0]?.value);
}

// Look up by email
const alice = await getProfileByEmail(http, 'alice@example.com');

// Get manager
const mgr = await getManager(http, 'people/me');

// Get direct reports
const reports = await getDirectReports(http, 'people/me');
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Profiles

- `getProfile(http, resourceName)` -- Get a person's profile
- `getProfileByEmail(http, email)` -- Look up profile by email
- `getBatchProfiles(http, resourceNames)` -- Get multiple profiles
- `searchProfiles(http, options)` -- Search directory profiles

### Org Chart

- `getManager(http, resourceName)` -- Get a person's manager
- `getDirectReports(http, resourceName)` -- Get direct reports

## License

[MIT](../../LICENSE)
