# @openworkspace/appscript

> Google Apps Script API client for OpenWorkspace -- run scripts, manage projects.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/appscript @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { getProject, runFunction, listProcesses } from '@openworkspace/appscript';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Get a project
const result = await getProject(http, 'scriptId');
if (result.ok) {
  console.log(result.value.title);
}

// Run a function
const output = await runFunction(http, 'scriptId', {
  function: 'myFunction',
  parameters: ['arg1', 42],
});
if (output.ok) {
  console.log('Result:', output.value.response?.result);
}

// List recent executions
const procs = await listProcesses(http, { scriptId: 'scriptId' });
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Projects

- `getProject(http, scriptId)` -- Get project metadata
- `createProject(http, options)` -- Create a new project
- `getContent(http, scriptId)` -- Get project source files
- `updateContent(http, scriptId, content)` -- Update project source

### Execution

- `runFunction(http, scriptId, request)` -- Run a script function
- `listProcesses(http, options)` -- List execution processes

## License

[MIT](../../LICENSE)
