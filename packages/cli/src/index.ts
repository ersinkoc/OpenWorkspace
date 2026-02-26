/**
 * @openworkspace/cli
 * CLI for OpenWorkspace with zero-dependency argument parser.
 */

export type { ParsedArgs, ParserConfig } from './parser.js';
export { parseArgs, getStringFlag, getBooleanFlag, getArrayFlag } from './parser.js';

export type { Command, CommandHandler, CommandRegistry } from './commands.js';
export { createCommandRegistry } from './commands.js';

export type { OutputFormat, FormatterOptions } from './formatter.js';
export { formatOutput, detectFormat } from './formatter.js';

export type { ColorMode, Colors } from './color.js';
export { createColors, detectColorMode } from './color.js';

export type { ShellType } from './completions.js';
export { generateCompletions } from './completions.js';
