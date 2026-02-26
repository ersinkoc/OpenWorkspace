import { describe, it, expect } from 'vitest';
import { generateCompletions } from './completions.js';

const ALL_COMMANDS = [
  'auth', 'config', 'gmail', 'calendar', 'drive', 'sheets', 'docs',
  'slides', 'contacts', 'tasks', 'chat', 'classroom', 'forms',
  'appscript', 'people', 'groups', 'keep', 'pipeline', 'mcp',
];

describe('generateCompletions', () => {
  describe('bash', () => {
    const output = generateCompletions('bash');

    it('is a non-empty string', () => {
      expect(output).toBeTruthy();
      expect(typeof output).toBe('string');
    });

    it('contains _ows function definition', () => {
      expect(output).toContain('_ows()');
    });

    it('contains complete registration', () => {
      expect(output).toContain('complete -F _ows ows');
    });

    it('contains COMPREPLY', () => {
      expect(output).toContain('COMPREPLY');
    });

    it('contains compgen', () => {
      expect(output).toContain('compgen');
    });

    it('contains all top-level commands', () => {
      for (const cmd of ALL_COMMANDS) {
        expect(output).toContain(cmd);
      }
    });

    it('contains auth subcommands', () => {
      expect(output).toContain('credentials');
      expect(output).toContain('remove');
      expect(output).toContain('status');
    });

    it('contains global flags', () => {
      expect(output).toContain('--help');
      expect(output).toContain('--version');
      expect(output).toContain('--json');
    });
  });

  describe('zsh', () => {
    const output = generateCompletions('zsh');

    it('is a non-empty string', () => {
      expect(output).toBeTruthy();
      expect(typeof output).toBe('string');
    });

    it('starts with #compdef ows', () => {
      expect(output.trimStart().startsWith('#compdef ows')).toBe(true);
    });

    it('contains _ows function', () => {
      expect(output).toContain('_ows()');
    });

    it('contains _describe for commands', () => {
      expect(output).toContain('_describe');
    });

    it('contains all top-level commands', () => {
      for (const cmd of ALL_COMMANDS) {
        expect(output).toContain(cmd);
      }
    });

    it('contains command descriptions', () => {
      expect(output).toContain('Authentication commands');
      expect(output).toContain('Gmail commands');
      expect(output).toContain('Google Calendar commands');
    });

    it('contains subcommand descriptions', () => {
      expect(output).toContain('Search Gmail messages');
      expect(output).toContain('List calendar events');
    });

    it('contains global flags with descriptions', () => {
      expect(output).toContain('--help');
      expect(output).toContain('Show help');
    });
  });

  describe('fish', () => {
    const output = generateCompletions('fish');

    it('is a non-empty string', () => {
      expect(output).toBeTruthy();
      expect(typeof output).toBe('string');
    });

    it('contains complete -c ows statements', () => {
      expect(output).toContain('complete -c ows');
    });

    it('disables file completions', () => {
      expect(output).toContain('complete -c ows -f');
    });

    it('contains __fish_seen_subcommand_from gating', () => {
      expect(output).toContain('__fish_seen_subcommand_from');
    });

    it('contains -d descriptions', () => {
      expect(output).toContain("-d '");
    });

    it('contains all top-level commands', () => {
      for (const cmd of ALL_COMMANDS) {
        expect(output).toContain(cmd);
      }
    });

    it('contains subcommand completions for auth', () => {
      expect(output).toContain("__fish_seen_subcommand_from auth");
      expect(output).toContain('credentials');
    });

    it('contains global flag completions', () => {
      expect(output).toContain("'help'");
      expect(output).toContain("'version'");
      expect(output).toContain("'json'");
    });
  });

  describe('cross-shell consistency', () => {
    it('all shells contain the same command count', () => {
      const bash = generateCompletions('bash');
      const zsh = generateCompletions('zsh');
      const fish = generateCompletions('fish');

      for (const cmd of ALL_COMMANDS) {
        expect(bash).toContain(cmd);
        expect(zsh).toContain(cmd);
        expect(fish).toContain(cmd);
      }
    });

    it('all shells contain key subcommands', () => {
      const subcommands = ['search', 'send', 'create', 'upload', 'download', 'events'];

      for (const sub of subcommands) {
        expect(generateCompletions('bash')).toContain(sub);
        expect(generateCompletions('zsh')).toContain(sub);
        expect(generateCompletions('fish')).toContain(sub);
      }
    });
  });
});
