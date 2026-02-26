# @openworkspace/pipeline

> YAML workflow engine with expressions, forEach, parallel, and retries.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/pipeline @openworkspace/core
```

## Usage

### YAML Pipeline

```yaml
name: daily-report
steps:
  - id: emails
    action: gmail.search
    params:
      query: "is:unread after:{{ today }}"

  - id: notify
    action: gmail.send
    forEach: "{{ steps.emails.result.messages }}"
    params:
      to: manager@example.com
      subject: "FW: {{ item.subject }}"
      body: "{{ item.snippet }}"

  - id: backup
    action: drive.upload
    parallel:
      - params: { name: "report-a.pdf", content: "{{ steps.genA.result }}" }
      - params: { name: "report-b.pdf", content: "{{ steps.genB.result }}" }
```

### TypeScript API

```typescript
import { parseYaml, executePipeline, createContext, createBuiltinActions } from '@openworkspace/pipeline';
import { createHttpClient } from '@openworkspace/core';

const http = createHttpClient({ auth: { accessToken: 'token' } });
const yaml = parseYaml(yamlString);
const actions = createBuiltinActions(http);
const ctx = createContext({ today: '2025-01-15' });

const result = await executePipeline(yaml, ctx, actions);
if (result.ok) {
  console.log('Pipeline completed:', result.value);
}
```

## API

- `parseYaml(str)` -- Parse YAML string into a pipeline definition
- `executePipeline(pipeline, context, actions)` -- Execute a pipeline
- `createContext(vars)` -- Create an execution context with variables
- `createBuiltinActions(http)` -- Register built-in service actions
- `evaluateExpression(expr, context)` -- Evaluate a `{{ }}` expression
- `createPipelineBuilder()` -- Fluent builder for pipelines

## Features

- **Expressions** -- `{{ steps.id.result.field }}` interpolation
- **forEach** -- Iterate over arrays from previous steps
- **parallel** -- Run multiple variants of a step concurrently
- **Retries** -- Configurable retry with backoff per step
- **Conditions** -- `when: "{{ steps.check.result.count > 0 }}"` guards

## License

[MIT](../../LICENSE)
