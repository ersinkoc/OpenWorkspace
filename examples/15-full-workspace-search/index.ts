/**
 * Example: Full Workspace Search
 * Search across Gmail, Drive, and Calendar in parallel.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { searchMessages } from '@openworkspace/gmail';
import { listFiles } from '@openworkspace/drive';
import { searchEvents } from '@openworkspace/calendar';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  const query = process.argv[2] ?? 'quarterly review';
  console.log(`Searching across workspace for: "${query}"\n`);

  // Run all searches in parallel
  const [mailResult, driveResult, calResult] = await Promise.all([
    searchMessages(http, { q: query, maxResults: 5 }),
    listFiles(http, {
      q: `name contains '${query}' or fullText contains '${query}'`,
      pageSize: 5,
    }),
    searchEvents(http, 'primary', { q: query, maxResults: 5 }),
  ]);

  // Display Gmail results
  console.log('--- Gmail ---');
  if (mailResult.ok) {
    const messages = mailResult.value.messages ?? [];
    console.log(`  ${messages.length} message(s) found`);
    for (const msg of messages) {
      console.log(`  - ${msg.id} (thread: ${msg.threadId})`);
    }
  } else {
    console.error(`  Error: ${mailResult.error.message}`);
  }

  // Display Drive results
  console.log('\n--- Drive ---');
  if (driveResult.ok) {
    const files = driveResult.value.files ?? [];
    console.log(`  ${files.length} file(s) found`);
    for (const file of files) {
      console.log(`  - ${file.name} (${file.mimeType})`);
    }
  } else {
    console.error(`  Error: ${driveResult.error.message}`);
  }

  // Display Calendar results
  console.log('\n--- Calendar ---');
  if (calResult.ok) {
    const events = calResult.value.items ?? [];
    console.log(`  ${events.length} event(s) found`);
    for (const event of events) {
      const when = event.start?.dateTime ?? event.start?.date ?? 'unknown';
      console.log(`  - ${event.summary ?? '(no title)'} on ${when}`);
    }
  } else {
    console.error(`  Error: ${calResult.error.message}`);
  }
}

main().catch(console.error);
