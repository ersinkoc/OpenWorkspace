/**
 * Example: Interactive Send
 * Compose and send an email with HTML content and attachments.
 */
import { readFileSync } from 'node:fs';
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { sendMessage, createDraft, sendDraft } from '@openworkspace/gmail';

async function main() {
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Option A: Send directly
  const sendResult = await sendMessage(http, {
    to: 'recipient@example.com',
    subject: 'Monthly Status Report',
    body: 'Please find the status report attached. See the HTML version for formatting.',
    html: '<h1>Monthly Status Report</h1><p>All projects are <strong>on track</strong>.</p>',
    cc: ['manager@example.com'],
    attachments: [
      {
        filename: 'report.csv',
        mimeType: 'text/csv',
        content: Buffer.from('Project,Status\nAlpha,Complete\nBeta,In Progress').toString('base64'),
      },
    ],
  });

  if (sendResult.ok) {
    console.log(`Email sent. Message ID: ${sendResult.value.id}`);
  } else {
    console.error('Send failed:', sendResult.error.message);
  }

  // Option B: Create as draft first, then send after review
  const draftResult = await createDraft(http, {
    to: 'team@example.com',
    subject: 'Draft: Weekly Update',
    body: 'This is a draft that can be reviewed before sending.',
  });

  if (draftResult.ok) {
    console.log(`Draft created: ${draftResult.value.id}`);

    // Send the draft when ready
    const draftSendResult = await sendDraft(http, draftResult.value.id);
    if (draftSendResult.ok) {
      console.log(`Draft sent as message: ${draftSendResult.value.id}`);
    } else {
      console.error('Failed to send draft:', draftSendResult.error.message);
    }
  } else {
    console.error('Draft creation failed:', draftResult.error.message);
  }
}

main().catch(console.error);
