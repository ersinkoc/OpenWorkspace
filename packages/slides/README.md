# @openworkspace/slides

> Google Slides API client for OpenWorkspace -- presentations, slides, speaker notes, export.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/slides @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { getPresentation, createPresentation, addSlide, replaceAllText, exportPresentation } from '@openworkspace/slides';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Get a presentation
const result = await getPresentation(http, 'presentationId');
if (result.ok) {
  console.log(result.value.title, `(${result.value.slides?.length} slides)`);
}

// Create a presentation
const pres = await createPresentation(http, 'Q1 Review');

// Add a slide
await addSlide(http, 'presentationId');

// Find and replace text across all slides
await replaceAllText(http, 'presentationId', { find: '{{date}}', replaceWith: '2025-01-15' });

// Export as PDF
const pdf = await exportPresentation(http, 'presentationId', 'application/pdf');
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

- `getPresentation(http, id)` -- Get presentation metadata and slides
- `createPresentation(http, title)` -- Create a new presentation
- `getSlide(http, presentationId, slideId)` -- Get a single slide
- `batchUpdate(http, id, requests)` -- Send batch update requests
- `addSlide(http, id)` -- Add a new slide
- `deleteSlide(http, id, slideId)` -- Delete a slide
- `replaceAllText(http, id, params)` -- Find and replace text
- `updateSpeakerNotes(http, id, slideId, notes)` -- Update speaker notes
- `exportPresentation(http, id, format)` -- Export as PDF, PPTX, etc.

## License

[MIT](../../LICENSE)
