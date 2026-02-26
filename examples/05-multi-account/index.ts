/**
 * Example: Multi-Account
 * Work with multiple Google accounts using separate auth contexts.
 */
import {
  createHttpClient,
  createAuthEngine,
  createFileTokenStore,
  type HttpClient,
} from '@openworkspace/core';
import { searchMessages } from '@openworkspace/gmail';
import { listEvents } from '@openworkspace/calendar';

/** Creates an authenticated HTTP client for a given account label. */
async function createClientForAccount(accountLabel: string): Promise<HttpClient> {
  const tokenStore = createFileTokenStore({ path: `~/.openworkspace/tokens-${accountLabel}.json` });
  const auth = createAuthEngine({ tokenStore });
  return createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });
}

async function main() {
  // Set up clients for two different accounts
  const workHttp = await createClientForAccount('work');
  const personalHttp = await createClientForAccount('personal');

  // Search unread emails across both accounts in parallel
  const [workMail, personalMail] = await Promise.all([
    searchMessages(workHttp, { q: 'is:unread', maxResults: 10 }),
    searchMessages(personalHttp, { q: 'is:unread', maxResults: 10 }),
  ]);

  if (workMail.ok) {
    console.log(`Work account: ${workMail.value.messages?.length ?? 0} unread messages`);
  }
  if (personalMail.ok) {
    console.log(`Personal account: ${personalMail.value.messages?.length ?? 0} unread messages`);
  }

  // List today's events from both calendars
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const calOpts = {
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime' as const,
  };

  const [workCal, personalCal] = await Promise.all([
    listEvents(workHttp, 'primary', calOpts),
    listEvents(personalHttp, 'primary', calOpts),
  ]);

  if (workCal.ok) {
    console.log(`\nWork calendar: ${workCal.value.items?.length ?? 0} events today`);
  }
  if (personalCal.ok) {
    console.log(`Personal calendar: ${personalCal.value.items?.length ?? 0} events today`);
  }
}

main().catch(console.error);
