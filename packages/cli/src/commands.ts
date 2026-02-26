/**
 * Command registry and execution for CLI.
 */

import type { Result } from '@openworkspace/core';
import { ok, err, ValidationError } from '@openworkspace/core';
import type { ParsedArgs } from './parser.js';

/**
 * Command handler function type.
 */
export type CommandHandler = (args: ParsedArgs) => Promise<number>;

/**
 * Command definition.
 */
export type Command = {
  /**
   * Command name.
   */
  name: string;

  /**
   * Command description.
   */
  description: string;

  /**
   * Command usage string.
   */
  usage?: string;

  /**
   * Command handler.
   */
  handler: CommandHandler;

  /**
   * Subcommands.
   */
  subcommands?: Command[];
};

/**
 * Command registry.
 */
export type CommandRegistry = {
  /**
   * Register a command.
   */
  register(command: Command): Result<void, ValidationError>;

  /**
   * Get a command by name.
   */
  get(name: string): Command | undefined;

  /**
   * List all registered commands.
   */
  list(): Command[];

  /**
   * Execute a command by name.
   */
  execute(name: string, args: ParsedArgs): Promise<number>;

  /**
   * Show help for a command.
   */
  showHelp(command?: Command): string;
};

/**
 * Creates a new command registry.
 */
export function createCommandRegistry(): CommandRegistry {
  const commands = new Map<string, Command>();

  return {
    register(command: Command): Result<void, ValidationError> {
      if (!command.name || typeof command.name !== 'string') {
        return err(new ValidationError('Command name is required'));
      }

      if (!command.description || typeof command.description !== 'string') {
        return err(new ValidationError('Command description is required'));
      }

      if (typeof command.handler !== 'function') {
        return err(new ValidationError('Command handler must be a function'));
      }

      if (commands.has(command.name)) {
        return err(new ValidationError(`Command '${command.name}' is already registered`));
      }

      commands.set(command.name, command);
      return ok(undefined);
    },

    get(name: string): Command | undefined {
      return commands.get(name);
    },

    list(): Command[] {
      return Array.from(commands.values());
    },

    async execute(name: string, args: ParsedArgs): Promise<number> {
      const command = commands.get(name);
      if (!command) {
        console.error(`Unknown command: ${name}`);
        return 1;
      }

      try {
        return await command.handler(args);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Command failed: ${message}`);
        return 1;
      }
    },

    showHelp(command?: Command): string {
      if (command) {
        let help = `${command.name} - ${command.description}\n`;
        if (command.usage) {
          help += `\nUsage: ${command.usage}\n`;
        }
        if (command.subcommands && command.subcommands.length > 0) {
          help += '\nSubcommands:\n';
          for (const sub of command.subcommands) {
            help += `  ${sub.name.padEnd(15)} ${sub.description}\n`;
          }
        }
        return help;
      }

      let help = 'OpenWorkspace CLI (ows)\n\n';
      help += 'Usage: ows <command> [options]\n\n';
      help += 'Commands:\n';

      for (const cmd of commands.values()) {
        help += `  ${cmd.name.padEnd(15)} ${cmd.description}\n`;
      }

      help += '\nGlobal Options:\n';
      help += '  --help, -h     Show help\n';
      help += '  --version, -v  Show version\n';
      help += '  --json         Output as JSON\n';
      help += '  --plain        Output as plain text\n';
      help += '  --verbose      Enable verbose output\n';

      return help;
    },
  };
}
