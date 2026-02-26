#!/usr/bin/env node
/**
 * CLI entry point for OpenWorkspace.
 */

import { createCommandRegistry } from './commands.js';
import type { Command } from './commands.js';
import { parseArgs, getBooleanFlag, getStringFlag } from './parser.js';
import type { ParsedArgs } from './parser.js';
import { createToolRegistry } from '@openworkspace/mcp';
import { parseYaml, executePipeline, createBuiltinActions } from '@openworkspace/pipeline';
import {
  createAuthEngine,
  loadCredentialsFile,
  createTokenStore,
  createConfigStore,
  SCOPES,
  getDefaultConfigDir,
  getScopeDescription,
  loadServiceAccountKey,
  createServiceAccountAuth,
  createMemoryTokenStore,
} from '@openworkspace/core';
import * as fs from 'fs/promises';
import * as path from 'path';

// Note: Service packages are available but require authenticated HttpClient
// import { createGmailApi } from '@openworkspace/gmail';
// import { calendar } from '@openworkspace/calendar';
// import { createDriveApi } from '@openworkspace/drive';
// import { createSheetsApi } from '@openworkspace/sheets';

const VERSION = '0.1.0';

/**
 * Generic subcommand dispatcher used by commands with subcommands.
 */
function createSubcommandDispatcher(
  commandName: string,
  subcommands: Command[]
): (args: ParsedArgs) => Promise<number> {
  return async (args: ParsedArgs) => {
    const subName = args._[0];
    const sub = subcommands.find(s => s.name === subName);
    if (sub) {
      return sub.handler({ ...args, _: args._.slice(1) });
    }
    console.log(`Usage: ows ${commandName} <subcommand>`);
    console.log('\nSubcommands:');
    for (const s of subcommands) {
      console.log(`  ${s.name.padEnd(20)} ${s.description}`);
    }
    return 1;
  };
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args, {
    boolean: ['help', 'version', 'verbose', 'json', 'plain', 'headless', 'device', 'check', 'html', 'today', 'week'],
    alias: { h: 'help', v: 'version', o: 'output' },
  });

  if (!parsed.ok) {
    console.error(`Error: ${parsed.error.message}`);
    return 1;
  }

  const { flags, _: positional } = parsed.value;

  // Handle global flags
  if (getBooleanFlag(flags, 'version')) {
    console.log(VERSION);
    return 0;
  }

  if (getBooleanFlag(flags, 'help') && positional.length === 0) {
    console.log(createCommandRegistry().showHelp());
    return 0;
  }

  // Create command registry
  const registry = createCommandRegistry();

  // ── Auth commands ──────────────────────────────────
  const authSubcommands: Command[] = [
    {
      name: 'credentials',
      description: 'Store OAuth client credentials file',
      usage: 'ows auth credentials <path>',
      async handler(args) {
        const filePath = args._[0];
        if (!filePath) {
          console.error('Error: Credentials file path is required');
          return 1;
        }

        const resolved = path.resolve(filePath);
        const result = await loadCredentialsFile(resolved);
        if (!result.ok) {
          console.error(`Error: ${result.error.message}`);
          return 1;
        }

        // Copy credentials to config directory
        const configDir = getDefaultConfigDir();
        await fs.mkdir(configDir, { recursive: true });
        const destPath = path.join(configDir, 'credentials.json');
        await fs.copyFile(resolved, destPath);

        console.log(`Credentials stored at: ${destPath}`);
        console.log(`Client ID: ${result.value.clientId}`);
        return 0;
      },
    },
    {
      name: 'add',
      description: 'Authorize a Google account',
      usage: 'ows auth add <email> [--headless] [--device]',
      async handler(args) {
        const email = args._[0];
        if (!email) {
          console.error('Error: Account email is required');
          return 1;
        }

        // Load credentials
        const configDir = getDefaultConfigDir();
        const credsPath = path.join(configDir, 'credentials.json');
        const creds = await loadCredentialsFile(credsPath);
        if (!creds.ok) {
          console.error('Error: No credentials found. Run `ows auth credentials <path>` first.');
          return 1;
        }

        const store = createTokenStore(
          'file',
          process.env['OWS_KEYRING_PASSWORD'] ?? 'openworkspace-default-key'
        );

        const auth = createAuthEngine({
          credentials: creds.value,
          scopes: [SCOPES.GMAIL.MODIFY, SCOPES.CALENDAR.FULL, SCOPES.DRIVE.FULL],
          tokenStore: store,
        });

        if (getBooleanFlag(args.flags, 'device')) {
          // Device code flow
          const result = await auth.deviceCodeFlow(email);
          if (!result.ok) {
            console.error(`Error: ${result.error.message}`);
            return 1;
          }
          console.log(`Go to: ${result.value.verificationUrl}`);
          console.log(`Enter code: ${result.value.userCode}`);
          console.log('Waiting for authorization...');

          const tokenResult = await result.value.poll();
          if (!tokenResult.ok) {
            console.error(`Error: ${tokenResult.error.message}`);
            return 1;
          }
          console.log(`Account ${email} authorized successfully.`);
          return 0;
        }

        if (getBooleanFlag(args.flags, 'headless')) {
          // Headless flow
          const result = await auth.headlessFlow(email);
          if (!result.ok) {
            console.error(`Error: ${result.error.message}`);
            return 1;
          }
          console.log(`Open this URL in your browser:\n${result.value.authUrl}`);
          console.log('\nPaste the authorization code here and press Enter.');
          // Note: In production, we'd read from stdin here
          return 0;
        }

        // Browser flow (default)
        console.log(`Opening browser for ${email} authorization...`);
        const result = await auth.browserFlow(email);
        if (!result.ok) {
          console.error(`Error: ${result.error.message}`);
          return 1;
        }
        console.log(`Account ${email} authorized successfully.`);
        return 0;
      },
    },
    {
      name: 'list',
      description: 'List authorized accounts',
      usage: 'ows auth list [--check] [--json]',
      async handler(args) {
        const store = createTokenStore(
          'file',
          process.env['OWS_KEYRING_PASSWORD'] ?? 'openworkspace-default-key'
        );

        const configDir = getDefaultConfigDir();
        const credsPath = path.join(configDir, 'credentials.json');
        const creds = await loadCredentialsFile(credsPath);

        if (!creds.ok) {
          if (getBooleanFlag(args.flags, 'json')) {
            console.log(JSON.stringify({ accounts: [] }));
          } else {
            console.log('No credentials configured. Run `ows auth credentials <path>` first.');
          }
          return 0;
        }

        const auth = createAuthEngine({
          credentials: creds.value,
          scopes: [],
          tokenStore: store,
        });

        const accounts = await auth.listAccounts();
        if (!accounts.ok) {
          console.error(`Error: ${accounts.error.message}`);
          return 1;
        }

        if (accounts.value.length === 0) {
          if (getBooleanFlag(args.flags, 'json')) {
            console.log(JSON.stringify({ accounts: [] }));
          } else {
            console.log('No authorized accounts. Run `ows auth add <email>` to add one.');
          }
          return 0;
        }

        if (getBooleanFlag(args.flags, 'json')) {
          const details = [];
          for (const account of accounts.value) {
            const valid = await auth.isTokenValid(account);
            details.push({ account, valid: valid.ok ? valid.value : false });
          }
          console.log(JSON.stringify({ accounts: details }, null, 2));
        } else {
          console.log('Authorized Accounts:\n');
          for (const account of accounts.value) {
            if (getBooleanFlag(args.flags, 'check')) {
              const valid = await auth.isTokenValid(account);
              const status = valid.ok && valid.value ? 'valid' : 'expired';
              console.log(`  ${account} [${status}]`);
            } else {
              console.log(`  ${account}`);
            }
          }
        }
        return 0;
      },
    },
    {
      name: 'remove',
      description: 'Remove an authorized account',
      usage: 'ows auth remove <email>',
      async handler(args) {
        const email = args._[0];
        if (!email) {
          console.error('Error: Account email is required');
          return 1;
        }

        const store = createTokenStore(
          'file',
          process.env['OWS_KEYRING_PASSWORD'] ?? 'openworkspace-default-key'
        );

        const result = await store.remove(email);
        if (!result.ok) {
          console.error(`Error: ${result.error.message}`);
          return 1;
        }

        console.log(`Account ${email} removed.`);
        return 0;
      },
    },
    {
      name: 'status',
      description: 'Show current authentication status',
      usage: 'ows auth status',
      async handler(args) {
        const configDir = getDefaultConfigDir();
        const credsPath = path.join(configDir, 'credentials.json');

        let hasCreds = false;
        try {
          await fs.access(credsPath);
          hasCreds = true;
        } catch {
          // no credentials file
        }

        if (getBooleanFlag(args.flags, 'json')) {
          console.log(JSON.stringify({ credentialsConfigured: hasCreds, configDir }));
        } else {
          console.log(`Config directory: ${configDir}`);
          console.log(`Credentials: ${hasCreds ? 'configured' : 'not configured'}`);
        }
        return 0;
      },
    },
  ];

  registry.register({
    name: 'auth',
    description: 'Authentication commands',
    subcommands: authSubcommands,
    handler: createSubcommandDispatcher('auth', authSubcommands),
  });

  // ── Config commands ────────────────────────────────
  const configSubcommands: Command[] = [
    {
      name: 'path',
      description: 'Show config file path',
      usage: 'ows config path',
      async handler() {
        const config = await createConfigStore();
        console.log(config.getPath());
        return 0;
      },
    },
    {
      name: 'list',
      description: 'List all configuration values',
      usage: 'ows config list [--json]',
      async handler(args) {
        const config = await createConfigStore();

        if (getBooleanFlag(args.flags, 'json')) {
          console.log(JSON.stringify(config.getAll(), null, 2));
        } else {
          const keys = config.list();
          for (const key of keys) {
            const value = config.get(key);
            console.log(`${key} = ${JSON.stringify(value)}`);
          }
        }
        return 0;
      },
    },
    {
      name: 'get',
      description: 'Get a configuration value',
      usage: 'ows config get <key>',
      async handler(args) {
        const key = args._[0];
        if (!key) {
          console.error('Error: Configuration key is required');
          return 1;
        }

        const config = await createConfigStore();
        const value = config.get(key);

        if (value === undefined) {
          console.error(`Configuration key not found: ${key}`);
          return 1;
        }

        if (getBooleanFlag(args.flags, 'json')) {
          console.log(JSON.stringify({ [key]: value }));
        } else {
          console.log(JSON.stringify(value));
        }
        return 0;
      },
    },
    {
      name: 'set',
      description: 'Set a configuration value',
      usage: 'ows config set <key> <value>',
      async handler(args) {
        const key = args._[0];
        const rawValue = args._[1];

        if (!key) {
          console.error('Error: Configuration key is required');
          return 1;
        }
        if (rawValue === undefined) {
          console.error('Error: Configuration value is required');
          return 1;
        }

        // Try to parse as JSON, otherwise use as string
        let value: unknown = rawValue;
        try {
          value = JSON.parse(rawValue);
        } catch {
          // Use as string
        }

        const config = await createConfigStore();
        config.set(key, value);
        const saveResult = await config.save();

        if (!saveResult.ok) {
          console.error(`Error saving config: ${saveResult.error.message}`);
          return 1;
        }

        console.log(`${key} = ${JSON.stringify(value)}`);
        return 0;
      },
    },
  ];

  registry.register({
    name: 'config',
    description: 'Configuration commands',
    subcommands: configSubcommands,
    handler: createSubcommandDispatcher('config', configSubcommands),
  });

  // ── MCP commands ───────────────────────────────────
  const mcpSubcommands: Command[] = [
    {
      name: 'tools',
      description: 'List available MCP tools',
      async handler(args) {
        const toolRegistry = createToolRegistry();
        const tools = toolRegistry.list();

        if (getBooleanFlag(args.flags, 'json')) {
          console.log(JSON.stringify(tools, null, 2));
        } else {
          console.log('Available Tools:\n');
          for (const tool of tools) {
            console.log(`  ${tool.name}`);
            console.log(`    ${tool.description}`);
            if (Object.keys(tool.parameters).length > 0) {
              console.log('    Parameters:');
              for (const [key, param] of Object.entries(tool.parameters)) {
                const required = param.required ? ' (required)' : '';
                console.log(`      ${key}: ${param.type}${required}`);
              }
            }
            console.log();
          }
        }
        return 0;
      },
    },
  ];

  registry.register({
    name: 'mcp',
    description: 'MCP server commands',
    subcommands: mcpSubcommands,
    handler: createSubcommandDispatcher('mcp', mcpSubcommands),
  });

  // ── Pipeline commands ──────────────────────────────
  const pipelineSubcommands: Command[] = [
    {
      name: 'run',
      description: 'Run a pipeline from a YAML file',
      usage: 'ows pipeline run <file> [options]',
      async handler(args) {
        const file = args._[0];
        if (!file) {
          console.error('Error: Pipeline file is required');
          return 1;
        }

        try {
          const content = await fs.readFile(path.resolve(file), 'utf-8');
          const yamlResult = parseYaml(content);

          if (!yamlResult.ok) {
            console.error(`Error parsing pipeline: ${yamlResult.error.message}`);
            return 1;
          }

          const pipeline = yamlResult.value as { steps: unknown[] };
          if (!pipeline.steps || !Array.isArray(pipeline.steps)) {
            console.error('Error: Invalid pipeline format');
            return 1;
          }

          const actions = createBuiltinActions();
          const result = await executePipeline(
            pipeline as { steps: { action: string; with?: Record<string, unknown>; output?: string }[] },
            actions
          );

          if (getBooleanFlag(args.flags, 'json')) {
            console.log(JSON.stringify(result, null, 2));
          } else {
            if (result.success) {
              console.log('Pipeline completed successfully');
              if (Object.keys(result.outputs).length > 0) {
                console.log('\nOutputs:');
                for (const [key, value] of Object.entries(result.outputs)) {
                  console.log(`  ${key}: ${JSON.stringify(value)}`);
                }
              }
            } else {
              console.error(`Pipeline failed: ${result.error}`);
            }
          }

          return result.success ? 0 : 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Error: ${message}`);
          return 1;
        }
      },
    },
  ];

  registry.register({
    name: 'pipeline',
    description: 'Pipeline execution commands',
    subcommands: pipelineSubcommands,
    handler: createSubcommandDispatcher('pipeline', pipelineSubcommands),
  });

  // ── Gmail commands ───────────────────────────────
  const gmailSubcommands: Command[] = [
    {
      name: 'search',
      description: 'Search Gmail messages',
      usage: 'ows gmail search <query> [--max N]',
      async handler(args) {
        const query = args._[0];
        if (!query) {
          console.error('Error: Search query is required');
          console.log('Usage: ows gmail search <query> [--max N]');
          return 1;
        }
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'read',
      description: 'Read a Gmail thread',
      usage: 'ows gmail read <threadId>',
      async handler(args) {
        const threadId = args._[0];
        if (!threadId) {
          console.error('Error: Thread ID is required');
          console.log('Usage: ows gmail read <threadId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'send',
      description: 'Send an email',
      usage: 'ows gmail send --to <email> --subject <subject> --body <body> [--html]',
      async handler(args) {
        const to = getStringFlag(args.flags, 'to');
        const subject = getStringFlag(args.flags, 'subject');
        const body = getStringFlag(args.flags, 'body');
        if (!to || !subject || !body) {
          console.error('Error: --to, --subject, and --body are required');
          console.log('Usage: ows gmail send --to <email> --subject <subject> --body <body> [--html]');
          return 1;
        }
        const _html = getBooleanFlag(args.flags, 'html');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'labels',
      description: 'List Gmail labels',
      usage: 'ows gmail labels',
      async handler() {
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'drafts',
      description: 'List Gmail drafts',
      usage: 'ows gmail drafts',
      async handler() {
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'gmail',
    description: 'Gmail commands',
    subcommands: gmailSubcommands,
    handler: createSubcommandDispatcher('gmail', gmailSubcommands),
  });

  // ── Calendar commands ────────────────────────────
  const calendarSubcommands: Command[] = [
    {
      name: 'events',
      description: 'List calendar events',
      usage: 'ows calendar events [calendarId] [--today] [--week]',
      async handler(args) {
        const _calendarId = args._[0] ?? 'primary';
        const _today = getBooleanFlag(args.flags, 'today');
        const _week = getBooleanFlag(args.flags, 'week');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'create',
      description: 'Create a calendar event',
      usage: 'ows calendar create <calendarId> --summary <text> --start <datetime> --end <datetime>',
      async handler(args) {
        const calendarId = args._[0];
        const summary = getStringFlag(args.flags, 'summary');
        const start = getStringFlag(args.flags, 'start');
        const end = getStringFlag(args.flags, 'end');
        if (!calendarId || !summary || !start || !end) {
          console.error('Error: calendarId, --summary, --start, and --end are required');
          console.log('Usage: ows calendar create <calendarId> --summary <text> --start <datetime> --end <datetime>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'freebusy',
      description: 'Query free/busy information',
      usage: 'ows calendar freebusy --calendars <list> [--today]',
      async handler(args) {
        const calendars = getStringFlag(args.flags, 'calendars');
        if (!calendars) {
          console.error('Error: --calendars is required');
          console.log('Usage: ows calendar freebusy --calendars <list> [--today]');
          return 1;
        }
        const _today = getBooleanFlag(args.flags, 'today');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'calendar',
    description: 'Google Calendar commands',
    subcommands: calendarSubcommands,
    handler: createSubcommandDispatcher('calendar', calendarSubcommands),
  });

  // ── Drive commands ───────────────────────────────
  const driveSubcommands: Command[] = [
    {
      name: 'ls',
      description: 'List files in Google Drive',
      usage: 'ows drive ls [--max N]',
      async handler(args) {
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'search',
      description: 'Search files in Google Drive',
      usage: 'ows drive search <query> [--max N]',
      async handler(args) {
        const query = args._[0];
        if (!query) {
          console.error('Error: Search query is required');
          console.log('Usage: ows drive search <query> [--max N]');
          return 1;
        }
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'upload',
      description: 'Upload a file to Google Drive',
      usage: 'ows drive upload <path> [--folder <name>]',
      async handler(args) {
        const filePath = args._[0];
        if (!filePath) {
          console.error('Error: File path is required');
          console.log('Usage: ows drive upload <path> [--folder <name>]');
          return 1;
        }
        const _folder = getStringFlag(args.flags, 'folder');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'download',
      description: 'Download a file from Google Drive',
      usage: 'ows drive download <fileId> [-o <path>]',
      async handler(args) {
        const fileId = args._[0];
        if (!fileId) {
          console.error('Error: File ID is required');
          console.log('Usage: ows drive download <fileId> [-o <path>]');
          return 1;
        }
        const _output = getStringFlag(args.flags, 'output');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'drive',
    description: 'Google Drive commands',
    subcommands: driveSubcommands,
    handler: createSubcommandDispatcher('drive', driveSubcommands),
  });

  // ── Sheets commands ──────────────────────────────
  const sheetsSubcommands: Command[] = [
    {
      name: 'get',
      description: 'Read values from a spreadsheet',
      usage: 'ows sheets get <spreadsheetId> <range>',
      async handler(args) {
        const spreadsheetId = args._[0];
        const range = args._[1];
        if (!spreadsheetId || !range) {
          console.error('Error: spreadsheetId and range are required');
          console.log('Usage: ows sheets get <spreadsheetId> <range>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'update',
      description: 'Write values to a spreadsheet',
      usage: 'ows sheets update <spreadsheetId> <range> <values>',
      async handler(args) {
        const spreadsheetId = args._[0];
        const range = args._[1];
        const values = args._[2];
        if (!spreadsheetId || !range || !values) {
          console.error('Error: spreadsheetId, range, and values are required');
          console.log('Usage: ows sheets update <spreadsheetId> <range> <values>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'create',
      description: 'Create a new spreadsheet',
      usage: 'ows sheets create <title> [--sheets <names>]',
      async handler(args) {
        const title = args._[0];
        if (!title) {
          console.error('Error: Spreadsheet title is required');
          console.log('Usage: ows sheets create <title> [--sheets <names>]');
          return 1;
        }
        const _sheets = getStringFlag(args.flags, 'sheets');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'sheets',
    description: 'Google Sheets commands',
    subcommands: sheetsSubcommands,
    handler: createSubcommandDispatcher('sheets', sheetsSubcommands),
  });

  // ── Docs commands ─────────────────────────────────
  const docsSubcommands: Command[] = [
    {
      name: 'get',
      description: 'Get a Google Doc',
      usage: 'ows docs get <documentId>',
      async handler(args) {
        const documentId = args._[0];
        if (!documentId) {
          console.error('Error: Document ID is required');
          console.log('Usage: ows docs get <documentId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'create',
      description: 'Create a Google Doc',
      usage: 'ows docs create <title>',
      async handler(args) {
        const title = args._[0];
        if (!title) {
          console.error('Error: Document title is required');
          console.log('Usage: ows docs create <title>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'export',
      description: 'Export a Google Doc',
      usage: 'ows docs export <documentId> --format pdf|docx|txt',
      async handler(args) {
        const documentId = args._[0];
        const format = getStringFlag(args.flags, 'format');
        if (!documentId || !format) {
          console.error('Error: documentId and --format are required');
          console.log('Usage: ows docs export <documentId> --format pdf|docx|txt');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'docs',
    description: 'Google Docs commands',
    subcommands: docsSubcommands,
    handler: createSubcommandDispatcher('docs', docsSubcommands),
  });

  // ── Slides commands ───────────────────────────────
  const slidesSubcommands: Command[] = [
    {
      name: 'get',
      description: 'Get a Google Slides presentation',
      usage: 'ows slides get <presentationId>',
      async handler(args) {
        const presentationId = args._[0];
        if (!presentationId) {
          console.error('Error: Presentation ID is required');
          console.log('Usage: ows slides get <presentationId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'create',
      description: 'Create a Google Slides presentation',
      usage: 'ows slides create <title>',
      async handler(args) {
        const title = args._[0];
        if (!title) {
          console.error('Error: Presentation title is required');
          console.log('Usage: ows slides create <title>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'export',
      description: 'Export a Google Slides presentation',
      usage: 'ows slides export <presentationId> --format pdf|pptx',
      async handler(args) {
        const presentationId = args._[0];
        const format = getStringFlag(args.flags, 'format');
        if (!presentationId || !format) {
          console.error('Error: presentationId and --format are required');
          console.log('Usage: ows slides export <presentationId> --format pdf|pptx');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'slides',
    description: 'Google Slides commands',
    subcommands: slidesSubcommands,
    handler: createSubcommandDispatcher('slides', slidesSubcommands),
  });

  // ── Contacts commands ─────────────────────────────
  const contactsSubcommands: Command[] = [
    {
      name: 'list',
      description: 'List contacts',
      usage: 'ows contacts list [--max N]',
      async handler(args) {
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'search',
      description: 'Search contacts',
      usage: 'ows contacts search <query> [--max N]',
      async handler(args) {
        const query = args._[0];
        if (!query) {
          console.error('Error: Search query is required');
          console.log('Usage: ows contacts search <query> [--max N]');
          return 1;
        }
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'create',
      description: 'Create a contact',
      usage: 'ows contacts create --name <name> --email <email>',
      async handler(args) {
        const name = getStringFlag(args.flags, 'name');
        const email = getStringFlag(args.flags, 'email');
        if (!name || !email) {
          console.error('Error: --name and --email are required');
          console.log('Usage: ows contacts create --name <name> --email <email>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'contacts',
    description: 'Google Contacts commands',
    subcommands: contactsSubcommands,
    handler: createSubcommandDispatcher('contacts', contactsSubcommands),
  });

  // ── Tasks commands ────────────────────────────────
  const tasksSubcommands: Command[] = [
    {
      name: 'lists',
      description: 'List task lists',
      usage: 'ows tasks lists',
      async handler() {
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'list',
      description: 'List tasks in a task list',
      usage: 'ows tasks list <tasklistId> [--max N]',
      async handler(args) {
        const tasklistId = args._[0];
        if (!tasklistId) {
          console.error('Error: Task list ID is required');
          console.log('Usage: ows tasks list <tasklistId> [--max N]');
          return 1;
        }
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'create',
      description: 'Create a task',
      usage: 'ows tasks create <tasklistId> --title <title>',
      async handler(args) {
        const tasklistId = args._[0];
        const title = getStringFlag(args.flags, 'title');
        if (!tasklistId || !title) {
          console.error('Error: tasklistId and --title are required');
          console.log('Usage: ows tasks create <tasklistId> --title <title>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'complete',
      description: 'Complete a task',
      usage: 'ows tasks complete <tasklistId> <taskId>',
      async handler(args) {
        const tasklistId = args._[0];
        const taskId = args._[1];
        if (!tasklistId || !taskId) {
          console.error('Error: tasklistId and taskId are required');
          console.log('Usage: ows tasks complete <tasklistId> <taskId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'tasks',
    description: 'Google Tasks commands',
    subcommands: tasksSubcommands,
    handler: createSubcommandDispatcher('tasks', tasksSubcommands),
  });

  // ── Chat commands ─────────────────────────────────
  const chatSubcommands: Command[] = [
    {
      name: 'spaces',
      description: 'List chat spaces',
      usage: 'ows chat spaces',
      async handler() {
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'messages',
      description: 'List messages in a space',
      usage: 'ows chat messages <spaceName> [--max N]',
      async handler(args) {
        const spaceName = args._[0];
        if (!spaceName) {
          console.error('Error: Space name is required');
          console.log('Usage: ows chat messages <spaceName> [--max N]');
          return 1;
        }
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'send',
      description: 'Send a chat message',
      usage: 'ows chat send <spaceName> --text <text>',
      async handler(args) {
        const spaceName = args._[0];
        const text = getStringFlag(args.flags, 'text');
        if (!spaceName || !text) {
          console.error('Error: spaceName and --text are required');
          console.log('Usage: ows chat send <spaceName> --text <text>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'chat',
    description: 'Google Chat commands',
    subcommands: chatSubcommands,
    handler: createSubcommandDispatcher('chat', chatSubcommands),
  });

  // ── Classroom commands ────────────────────────────
  const classroomSubcommands: Command[] = [
    {
      name: 'courses',
      description: 'List courses',
      usage: 'ows classroom courses [--max N]',
      async handler(args) {
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'students',
      description: 'List students in a course',
      usage: 'ows classroom students <courseId>',
      async handler(args) {
        const courseId = args._[0];
        if (!courseId) {
          console.error('Error: Course ID is required');
          console.log('Usage: ows classroom students <courseId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'coursework',
      description: 'List coursework in a course',
      usage: 'ows classroom coursework <courseId>',
      async handler(args) {
        const courseId = args._[0];
        if (!courseId) {
          console.error('Error: Course ID is required');
          console.log('Usage: ows classroom coursework <courseId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'classroom',
    description: 'Google Classroom commands',
    subcommands: classroomSubcommands,
    handler: createSubcommandDispatcher('classroom', classroomSubcommands),
  });

  // ── Forms commands ────────────────────────────────
  const formsSubcommands: Command[] = [
    {
      name: 'get',
      description: 'Get a Google Form',
      usage: 'ows forms get <formId>',
      async handler(args) {
        const formId = args._[0];
        if (!formId) {
          console.error('Error: Form ID is required');
          console.log('Usage: ows forms get <formId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'responses',
      description: 'List form responses',
      usage: 'ows forms responses <formId> [--max N]',
      async handler(args) {
        const formId = args._[0];
        if (!formId) {
          console.error('Error: Form ID is required');
          console.log('Usage: ows forms responses <formId> [--max N]');
          return 1;
        }
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'forms',
    description: 'Google Forms commands',
    subcommands: formsSubcommands,
    handler: createSubcommandDispatcher('forms', formsSubcommands),
  });

  // ── Apps Script commands ──────────────────────────
  const appscriptSubcommands: Command[] = [
    {
      name: 'get',
      description: 'Get an Apps Script project',
      usage: 'ows appscript get <scriptId>',
      async handler(args) {
        const scriptId = args._[0];
        if (!scriptId) {
          console.error('Error: Script ID is required');
          console.log('Usage: ows appscript get <scriptId>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'run',
      description: 'Run an Apps Script function',
      usage: 'ows appscript run <scriptId> --function <name>',
      async handler(args) {
        const scriptId = args._[0];
        const fn = getStringFlag(args.flags, 'function');
        if (!scriptId || !fn) {
          console.error('Error: scriptId and --function are required');
          console.log('Usage: ows appscript run <scriptId> --function <name>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'appscript',
    description: 'Google Apps Script commands',
    subcommands: appscriptSubcommands,
    handler: createSubcommandDispatcher('appscript', appscriptSubcommands),
  });

  // ── People commands ───────────────────────────────
  const peopleSubcommands: Command[] = [
    {
      name: 'me',
      description: 'Get own profile',
      usage: 'ows people me',
      async handler() {
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'search',
      description: 'Search profiles',
      usage: 'ows people search <query>',
      async handler(args) {
        const query = args._[0];
        if (!query) {
          console.error('Error: Search query is required');
          console.log('Usage: ows people search <query>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'people',
    description: 'Google People commands',
    subcommands: peopleSubcommands,
    handler: createSubcommandDispatcher('people', peopleSubcommands),
  });

  // ── Groups commands ───────────────────────────────
  const groupsSubcommands: Command[] = [
    {
      name: 'list',
      description: 'List groups',
      usage: 'ows groups list [--max N]',
      async handler(args) {
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'members',
      description: 'List group members',
      usage: 'ows groups members <groupName>',
      async handler(args) {
        const groupName = args._[0];
        if (!groupName) {
          console.error('Error: Group name is required');
          console.log('Usage: ows groups members <groupName>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'groups',
    description: 'Google Groups commands',
    subcommands: groupsSubcommands,
    handler: createSubcommandDispatcher('groups', groupsSubcommands),
  });

  // ── Keep commands ─────────────────────────────────
  const keepSubcommands: Command[] = [
    {
      name: 'list',
      description: 'List Keep notes',
      usage: 'ows keep list [--max N]',
      async handler(args) {
        const _max = getStringFlag(args.flags, 'max', '20');
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
    {
      name: 'get',
      description: 'Get a Keep note',
      usage: 'ows keep get <noteName>',
      async handler(args) {
        const noteName = args._[0];
        if (!noteName) {
          console.error('Error: Note name is required');
          console.log('Usage: ows keep get <noteName>');
          return 1;
        }
        console.log('Not yet connected. Run `ows auth add <email>` to authenticate first.');
        return 0;
      },
    },
  ];

  registry.register({
    name: 'keep',
    description: 'Google Keep commands',
    subcommands: keepSubcommands,
    handler: createSubcommandDispatcher('keep', keepSubcommands),
  });

  // Dispatch command
  const commandName = positional[0];
  if (!commandName) {
    console.log(registry.showHelp());
    return 0;
  }

  const command = registry.get(commandName);
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.log('\n' + registry.showHelp());
    return 1;
  }

  if (getBooleanFlag(flags, 'help')) {
    console.log(registry.showHelp(command));
    return 0;
  }

  return command.handler({ ...parsed.value, _: positional.slice(1) });
}

main().then(code => process.exit(code)).catch(error => {
  console.error(error);
  process.exit(1);
});
