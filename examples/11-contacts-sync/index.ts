/**
 * Example: Contacts Sync
 * Sync contacts from a source account to a target account.
 */
import {
  createHttpClient,
  createAuthEngine,
  createFileTokenStore,
  type HttpClient,
} from '@openworkspace/core';
import { listContacts, searchContacts, createContact } from '@openworkspace/contacts';

async function createClientForAccount(label: string): Promise<HttpClient> {
  const tokenStore = createFileTokenStore({ path: `~/.openworkspace/tokens-${label}.json` });
  const auth = createAuthEngine({ tokenStore });
  return createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });
}

async function main() {
  const sourceHttp = await createClientForAccount('source');
  const targetHttp = await createClientForAccount('target');

  // Step 1: List all contacts from the source account
  const sourceResult = await listContacts(sourceHttp, { pageSize: 100 });
  if (!sourceResult.ok) {
    console.error('Failed to list source contacts:', sourceResult.error.message);
    return;
  }

  const sourceContacts = sourceResult.value.connections ?? [];
  console.log(`Source contacts: ${sourceContacts.length}`);

  let created = 0;
  let skipped = 0;

  // Step 2: For each source contact, check if it exists in target
  for (const person of sourceContacts) {
    const email = person.emailAddresses?.[0]?.value;
    if (!email) {
      skipped++;
      continue;
    }

    // Search for matching contact in target account
    const searchResult = await searchContacts(targetHttp, { query: email });
    if (searchResult.ok && (searchResult.value.results?.length ?? 0) > 0) {
      skipped++;
      continue;
    }

    // Step 3: Create the contact in the target account
    const createResult = await createContact(targetHttp, {
      names: person.names ?? [],
      emailAddresses: person.emailAddresses ?? [],
      phoneNumbers: person.phoneNumbers ?? [],
    });

    if (createResult.ok) {
      const name = person.names?.[0]?.displayName ?? email;
      console.log(`  Created: ${name}`);
      created++;
    }
  }

  console.log(`\nSync complete. Created: ${created}, Skipped: ${skipped}`);
}

main().catch(console.error);
