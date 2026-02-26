# @openworkspace/forms

> Google Forms API client for OpenWorkspace -- get, create, responses.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/forms @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { getForm, createForm, addQuestion, listResponses } from '@openworkspace/forms';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Get a form
const result = await getForm(http, 'formId');
if (result.ok) {
  console.log(result.value.info?.title);
  for (const item of result.value.items ?? []) {
    console.log(item.title);
  }
}

// Create a form
const form = await createForm(http, { info: { title: 'Feedback Survey' } });

// Add a question
await addQuestion(http, 'formId', {
  title: 'How was your experience?',
  questionItem: {
    question: { choiceQuestion: { type: 'RADIO', options: [{ value: 'Great' }, { value: 'OK' }, { value: 'Poor' }] } },
  },
});

// List responses
const responses = await listResponses(http, 'formId');
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

- `getForm(http, formId)` -- Get form metadata and items
- `createForm(http, form)` -- Create a new form
- `batchUpdateForm(http, formId, requests)` -- Batch update a form
- `addQuestion(http, formId, item)` -- Add a question item
- `deleteItem(http, formId, index)` -- Delete an item by index
- `listResponses(http, formId, options)` -- List form responses
- `getResponse(http, formId, responseId)` -- Get a single response

## License

[MIT](../../LICENSE)
