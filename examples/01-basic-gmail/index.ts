/**
 * Example: Basic Gmail
 * Search for messages and read their contents using the Gmail API.
 */
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { searchMessages, getMessage } from '@openworkspace/gmail';

async function main() {
  // Set up authenticated HTTP client
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Search for recent messages from a specific sender
  const searchResult = await searchMessages(http, {
    q: 'from:notifications@github.com',
    maxResults: 5,
  });

  if (!searchResult.ok) {
    console.error('Search failed:', searchResult.error.message);
    return;
  }

  const messages = searchResult.value.messages ?? [];
  console.log(`Found ${messages.length} messages`);

  // Fetch full details for each message
  for (const stub of messages) {
    const msgResult = await getMessage(http, { id: stub.id, format: 'full' });

    if (!msgResult.ok) {
      console.error(`Failed to fetch message ${stub.id}:`, msgResult.error.message);
      continue;
    }

    const msg = msgResult.value;
    const subject = msg.payload?.headers?.find((h) => h.name === 'Subject')?.value ?? '(no subject)';
    const from = msg.payload?.headers?.find((h) => h.name === 'From')?.value ?? '(unknown)';

    console.log(`  [${msg.id}] ${subject}`);
    console.log(`    From: ${from}`);
    console.log(`    Snippet: ${msg.snippet?.slice(0, 80)}...`);
  }
}

main().catch(console.error);
