/**
 * Shell completion script generator for the OpenWorkspace CLI.
 *
 * Generates ready-to-use completion scripts for bash, zsh, and fish
 * from a single source of truth: the COMMANDS data structure.
 *
 * Usage:
 *   ows completions bash > ~/.bash_completion.d/ows
 *   ows completions zsh  > ~/.zsh/completions/_ows
 *   ows completions fish > ~/.config/fish/completions/ows.fish
 */

/**
 * Supported shell types for completion generation.
 */
export type ShellType = 'bash' | 'zsh' | 'fish';

/**
 * Internal command definition used as the single source of truth
 * for all generated completion scripts.
 */
type CommandDef = {
  readonly name: string;
  readonly description: string;
  readonly subcommands: readonly SubcommandDef[];
};

type SubcommandDef = {
  readonly name: string;
  readonly description: string;
};

/**
 * All commands and their subcommands. This is the single source of truth
 * from which every shell completion script is generated.
 */
const COMMANDS: readonly CommandDef[] = [
  {
    name: 'auth',
    description: 'Authentication commands',
    subcommands: [
      { name: 'credentials', description: 'Store OAuth client credentials file' },
      { name: 'add', description: 'Authorize a Google account' },
      { name: 'list', description: 'List authorized accounts' },
      { name: 'remove', description: 'Remove an authorized account' },
      { name: 'status', description: 'Show current authentication status' },
    ],
  },
  {
    name: 'config',
    description: 'Configuration commands',
    subcommands: [
      { name: 'path', description: 'Show config file path' },
      { name: 'list', description: 'List all configuration values' },
      { name: 'get', description: 'Get a configuration value' },
      { name: 'set', description: 'Set a configuration value' },
    ],
  },
  {
    name: 'gmail',
    description: 'Gmail commands',
    subcommands: [
      { name: 'search', description: 'Search Gmail messages' },
      { name: 'read', description: 'Read a Gmail thread' },
      { name: 'send', description: 'Send an email' },
      { name: 'labels', description: 'List Gmail labels' },
      { name: 'drafts', description: 'List Gmail drafts' },
    ],
  },
  {
    name: 'calendar',
    description: 'Google Calendar commands',
    subcommands: [
      { name: 'events', description: 'List calendar events' },
      { name: 'create', description: 'Create a calendar event' },
      { name: 'freebusy', description: 'Query free/busy information' },
    ],
  },
  {
    name: 'drive',
    description: 'Google Drive commands',
    subcommands: [
      { name: 'ls', description: 'List files in Google Drive' },
      { name: 'search', description: 'Search files in Google Drive' },
      { name: 'upload', description: 'Upload a file to Google Drive' },
      { name: 'download', description: 'Download a file from Google Drive' },
    ],
  },
  {
    name: 'sheets',
    description: 'Google Sheets commands',
    subcommands: [
      { name: 'get', description: 'Read values from a spreadsheet' },
      { name: 'update', description: 'Write values to a spreadsheet' },
      { name: 'create', description: 'Create a new spreadsheet' },
    ],
  },
  {
    name: 'docs',
    description: 'Google Docs commands',
    subcommands: [
      { name: 'get', description: 'Get a Google Doc' },
      { name: 'create', description: 'Create a Google Doc' },
      { name: 'export', description: 'Export a Google Doc' },
    ],
  },
  {
    name: 'slides',
    description: 'Google Slides commands',
    subcommands: [
      { name: 'get', description: 'Get a Google Slides presentation' },
      { name: 'create', description: 'Create a Google Slides presentation' },
      { name: 'export', description: 'Export a Google Slides presentation' },
    ],
  },
  {
    name: 'contacts',
    description: 'Google Contacts commands',
    subcommands: [
      { name: 'list', description: 'List contacts' },
      { name: 'search', description: 'Search contacts' },
      { name: 'create', description: 'Create a contact' },
    ],
  },
  {
    name: 'tasks',
    description: 'Google Tasks commands',
    subcommands: [
      { name: 'lists', description: 'List task lists' },
      { name: 'list', description: 'List tasks in a task list' },
      { name: 'create', description: 'Create a task' },
      { name: 'complete', description: 'Complete a task' },
    ],
  },
  {
    name: 'chat',
    description: 'Google Chat commands',
    subcommands: [
      { name: 'spaces', description: 'List chat spaces' },
      { name: 'messages', description: 'List messages in a space' },
      { name: 'send', description: 'Send a chat message' },
    ],
  },
  {
    name: 'classroom',
    description: 'Google Classroom commands',
    subcommands: [
      { name: 'courses', description: 'List courses' },
      { name: 'students', description: 'List students in a course' },
      { name: 'coursework', description: 'List coursework in a course' },
    ],
  },
  {
    name: 'forms',
    description: 'Google Forms commands',
    subcommands: [
      { name: 'get', description: 'Get a Google Form' },
      { name: 'responses', description: 'List form responses' },
    ],
  },
  {
    name: 'appscript',
    description: 'Google Apps Script commands',
    subcommands: [
      { name: 'get', description: 'Get an Apps Script project' },
      { name: 'run', description: 'Run an Apps Script function' },
    ],
  },
  {
    name: 'people',
    description: 'Google People commands',
    subcommands: [
      { name: 'me', description: 'Get own profile' },
      { name: 'search', description: 'Search profiles' },
    ],
  },
  {
    name: 'groups',
    description: 'Google Groups commands',
    subcommands: [
      { name: 'list', description: 'List groups' },
      { name: 'members', description: 'List group members' },
    ],
  },
  {
    name: 'keep',
    description: 'Google Keep commands',
    subcommands: [
      { name: 'list', description: 'List Keep notes' },
      { name: 'get', description: 'Get a Keep note' },
    ],
  },
  {
    name: 'pipeline',
    description: 'Pipeline execution commands',
    subcommands: [
      { name: 'run', description: 'Run a pipeline from a YAML file' },
    ],
  },
  {
    name: 'mcp',
    description: 'MCP server commands',
    subcommands: [
      { name: 'tools', description: 'List available MCP tools' },
    ],
  },
] as const;

/**
 * Global flags available on every command.
 */
const GLOBAL_FLAGS = [
  '--help',
  '--version',
  '--json',
  '--plain',
  '--csv',
  '--verbose',
  '--account',
  '--color',
] as const;

// ── Bash ──────────────────────────────────────────────────────────────

function generateBash(): string {
  const commandNames = COMMANDS.map(c => c.name).join(' ');
  const flags = GLOBAL_FLAGS.join(' ');

  // Build a case block for each command's subcommands
  const cases = COMMANDS.map(cmd => {
    const subs = cmd.subcommands.map(s => s.name).join(' ');
    return `      ${cmd.name}) COMPREPLY=( $(compgen -W "${subs} ${flags}" -- "$cur") ) ;;`;
  }).join('\n');

  return `# bash completion for ows (OpenWorkspace CLI)
# Source this file or place it in ~/.bash_completion.d/

_ows() {
  local cur prev words cword
  _init_completion || return

  local commands="${commandNames}"
  local global_flags="${flags}"

  # Determine position: find the first non-flag positional argument (the command)
  local cmd=""
  local i
  for (( i=1; i < cword; i++ )); do
    case "\${words[i]}" in
      -*) ;;
      *)
        if [[ -z "$cmd" ]]; then
          cmd="\${words[i]}"
        fi
        ;;
    esac
  done

  # If no command has been typed yet, complete commands and global flags
  if [[ -z "$cmd" ]]; then
    COMPREPLY=( $(compgen -W "$commands $global_flags" -- "$cur") )
    return
  fi

  # Complete subcommands for the active command
  case "$cmd" in
${cases}
      *) COMPREPLY=( $(compgen -W "$global_flags" -- "$cur") ) ;;
  esac
}

complete -F _ows ows
`;
}

// ── Zsh ───────────────────────────────────────────────────────────────

function generateZsh(): string {
  // Build the top-level command descriptions for _describe
  const commandDescriptions = COMMANDS.map(cmd => {
    const escaped = cmd.description.replace(/'/g, "'\\''");
    return `    '${cmd.name}:${escaped}'`;
  }).join('\n');

  // Build a case branch per command that completes its subcommands with descriptions
  const cases = COMMANDS.map(cmd => {
    const subDescs = cmd.subcommands.map(s => {
      const escaped = s.description.replace(/'/g, "'\\''");
      return `        '${s.name}:${escaped}'`;
    }).join('\n');
    return `    ${cmd.name})\n      local -a subcmds=(\n${subDescs}\n      )\n      _describe 'subcommand' subcmds\n      ;;`;
  }).join('\n');

  const flagLines = GLOBAL_FLAGS.map(f => `    '${f}[${flagDescription(f)}]'`).join('\n');

  return `#compdef ows
# zsh completion for ows (OpenWorkspace CLI)
# Place this file in a directory listed in $fpath as _ows

_ows() {
  local -a global_flags=(
${flagLines}
  )

  # If we are still on the first argument, complete commands and global flags
  if (( CURRENT == 2 )); then
    local -a commands=(
${commandDescriptions}
    )
    _describe 'command' commands
    _arguments -s $global_flags
    return
  fi

  # Determine which command was given (first non-flag argument)
  local cmd="\${words[2]}"

  case "$cmd" in
${cases}
  esac

  # Always allow global flags
  _arguments -s $global_flags
}

_ows "$@"
`;
}

/**
 * Returns a short human-readable description for a global flag.
 */
function flagDescription(flag: string): string {
  switch (flag) {
    case '--help':    return 'Show help';
    case '--version': return 'Show version';
    case '--json':    return 'Output as JSON';
    case '--plain':   return 'Output as plain text';
    case '--csv':     return 'Output as CSV';
    case '--verbose': return 'Enable verbose output';
    case '--account': return 'Google account to use';
    case '--color':   return 'Colorize output';
    default:          return flag;
  }
}

// ── Fish ──────────────────────────────────────────────────────────────

function generateFish(): string {
  const commandNames = COMMANDS.map(c => c.name);

  // Condition: no subcommand has been given yet
  const noSubcommand = `not __fish_seen_subcommand_from ${commandNames.join(' ')}`;

  // Top-level command completions
  const topLevel = COMMANDS.map(cmd =>
    `complete -c ows -n '${noSubcommand}' -a '${cmd.name}' -d '${escapeFishString(cmd.description)}'`
  ).join('\n');

  // Global flag completions (available everywhere)
  const globalFlagLines = GLOBAL_FLAGS.map(f => {
    const long = f.replace(/^--/, '');
    return `complete -c ows -l '${long}' -d '${escapeFishString(flagDescription(f))}'`;
  }).join('\n');

  // Subcommand completions gated behind their parent command
  const subcommandLines = COMMANDS.flatMap(cmd =>
    cmd.subcommands.map(sub =>
      `complete -c ows -n '__fish_seen_subcommand_from ${cmd.name}' -a '${sub.name}' -d '${escapeFishString(sub.description)}'`
    )
  ).join('\n');

  return `# fish completion for ows (OpenWorkspace CLI)
# Place this file in ~/.config/fish/completions/ows.fish

# Disable file completions by default
complete -c ows -f

# Global flags
${globalFlagLines}

# Top-level commands
${topLevel}

# Subcommands
${subcommandLines}
`;
}

/**
 * Escapes a string for use inside fish single-quoted completions.
 */
function escapeFishString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ── Public API ────────────────────────────────────────────────────────

/**
 * Generates a shell completion script for the given shell type.
 *
 * The returned string is a complete, ready-to-use script that can be
 * written directly to a file or sourced by the shell.
 *
 * @example
 * ```ts
 * // Print bash completions to stdout
 * console.log(generateCompletions('bash'));
 * ```
 *
 * @param shell - The target shell: 'bash', 'zsh', or 'fish'.
 * @returns The full completion script as a string.
 */
export function generateCompletions(shell: ShellType): string {
  switch (shell) {
    case 'bash': return generateBash();
    case 'zsh':  return generateZsh();
    case 'fish': return generateFish();
  }
}
