/**
 * Example: Sheets Read and Write
 * Read data from a Google Sheet, then write new rows to it.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { getValues, updateValues, appendValues, getSpreadsheet } from '@openworkspace/sheets';

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Step 1: Read spreadsheet metadata
  const metaResult = await getSpreadsheet(http, SPREADSHEET_ID);
  if (metaResult.ok) {
    console.log(`Spreadsheet: ${metaResult.value.properties?.title}`);
    const sheets = metaResult.value.sheets ?? [];
    console.log(`Sheets: ${sheets.map((s) => s.properties?.title).join(', ')}`);
  }

  // Step 2: Read existing data from Sheet1!A1:C10
  const readResult = await getValues(http, SPREADSHEET_ID, 'Sheet1!A1:C10');
  if (readResult.ok) {
    const rows = readResult.value.values ?? [];
    console.log(`\nRead ${rows.length} rows:`);
    for (const row of rows) {
      console.log(`  ${row.join(' | ')}`);
    }
  } else {
    console.error('Read failed:', readResult.error.message);
  }

  // Step 3: Write new data to a specific range
  const writeResult = await updateValues(http, SPREADSHEET_ID, 'Sheet1!A1:C2', [
    ['Name', 'Email', 'Role'],
    ['Alice', 'alice@example.com', 'Engineer'],
  ]);
  if (writeResult.ok) {
    console.log(`\nUpdated ${writeResult.value.updatedCells} cells`);
  } else {
    console.error('Write failed:', writeResult.error.message);
  }

  // Step 4: Append a new row at the end
  const appendResult = await appendValues(http, SPREADSHEET_ID, 'Sheet1!A:C', [
    ['Bob', 'bob@example.com', 'Designer'],
  ]);
  if (appendResult.ok) {
    console.log(`Appended to: ${appendResult.value.tableRange}`);
  } else {
    console.error('Append failed:', appendResult.error.message);
  }
}

main().catch(console.error);
