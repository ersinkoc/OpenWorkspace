# @openworkspace/sheets

> Google Sheets API client for OpenWorkspace -- read, write, append, format, structure.

Part of the [OpenWorkspace](https://github.com/ersinkoc/openworkspace) monorepo.

## Install

```bash
npm install @openworkspace/sheets @openworkspace/core
```

## Usage

```typescript
import { createHttpClient } from '@openworkspace/core';
import { getValues, updateValues, appendValues, createSpreadsheet } from '@openworkspace/sheets';

const http = createHttpClient({ auth: { accessToken: 'token' } });

// Read values
const result = await getValues(http, 'spreadsheetId', 'Sheet1!A1:D10');
if (result.ok) {
  for (const row of result.value.values ?? []) {
    console.log(row.join('\t'));
  }
}

// Write values
await updateValues(http, 'spreadsheetId', 'Sheet1!A1', {
  values: [['Name', 'Score'], ['Alice', 95], ['Bob', 87]],
});

// Append rows
await appendValues(http, 'spreadsheetId', 'Sheet1!A:D', {
  values: [['Charlie', 92]],
});

// Create a new spreadsheet
await createSpreadsheet(http, { title: 'Q1 Report' });
```

## API

All functions take an `HttpClient` as the first parameter and return `Result<T, E>`.

### Read

- `getSpreadsheet(http, id)` -- Get spreadsheet metadata
- `getValues(http, id, range)` -- Read cell values
- `batchGetValues(http, id, ranges)` -- Read multiple ranges
- `getMetadata(http, id)` -- Get sheet metadata

### Write

- `updateValues(http, id, range, options)` -- Write cell values
- `appendValues(http, id, range, options)` -- Append rows
- `clearValues(http, id, range)` -- Clear cell values
- `batchUpdateValues(http, id, options)` -- Write multiple ranges

### Structure

- `createSpreadsheet(http, options)` -- Create a spreadsheet
- `addSheet(http, id, title)` -- Add a sheet tab
- `deleteSheet(http, id, sheetId)` -- Delete a sheet tab
- `insertRows(http, id, options)` -- Insert rows
- `insertColumns(http, id, options)` -- Insert columns

### Format

- `formatCells(http, id, options)` -- Format a cell range
- `batchFormatCells(http, id, options)` -- Batch format cells

## License

[MIT](../../LICENSE)
