/**
 * Micro-kernel plugin architecture for OpenWorkspace.
 * Zero-dependency implementation.
 */

import type { EventBus } from './events.js';
import { createEventBus } from './events.js';
import type { Logger } from './logger.js';
import { createLogger } from './logger.js';
import type { Result } from './result.js';
import { ok, err } from './result.js';
import { PluginError } from './errors.js';

/**
 * Plugin context provided to plugins during setup.
 */
export type PluginContext = {
  /**
   * Event bus for cross-plugin communication.
   */
  events: EventBus;

  /**
   * Logger instance for the plugin.
   */
  logger: Logger;

  /**
   * Plugin metadata storage.
   */
  metadata: Map<string, unknown>;

  /**
   * Register a command (used by CLI interface).
   */
  registerCommand: (name: string, handler: CommandHandler) => void;

  /**
   * Register a tool (used by MCP interface).
   */
  registerTool: (name: string, tool: ToolDefinition) => void;
};

/**
 * Command handler function type.
 */
export type CommandHandler = (args: string[]) => Promise<number>;

/**
 * Tool parameter definition.
 */
export type ToolParameter = {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: unknown;
};

/**
 * Tool definition for MCP.
 */
export type ToolDefinition = {
  description: string;
  parameters: Record<string, ToolParameter>;
  handler: (params: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Plugin interface.
 */
export type Plugin = {
  /**
   * Unique plugin name.
   */
  name: string;

  /**
   * Plugin version.
   */
  version?: string;

  /**
   * Setup function called during kernel initialization.
   */
  setup: (context: PluginContext) => void | Promise<void>;

  /**
   * Teardown function called during kernel shutdown.
   */
  teardown?: (context: PluginContext) => void | Promise<void>;
};

/**
 * Kernel configuration options.
 */
export type KernelOptions = {
  /**
   * Logger instance or configuration.
   */
  logger?: Logger;
};

/**
 * Kernel state.
 */
export type KernelState = 'created' | 'initializing' | 'ready' | 'error' | 'shutdown';

/**
 * Kernel interface.
 */
export type Kernel = {
  /**
   * Current kernel state.
   */
  readonly state: KernelState;

  /**
   * Event bus for cross-plugin communication.
   */
  readonly events: EventBus;

  /**
   * Logger instance.
   */
  readonly logger: Logger;

  /**
   * Register a plugin with the kernel.
   */
  use: (plugin: Plugin) => Promise<Result<void, PluginError>>;

  /**
   * Initialize all registered plugins.
   */
  init: () => Promise<Result<void, PluginError>>;

  /**
   * Shutdown the kernel and all plugins.
   */
  shutdown: () => Promise<void>;

  /**
   * Get a registered plugin by name.
   */
  getPlugin: (name: string) => Plugin | undefined;

  /**
   * List all registered plugin names.
   */
  listPlugins: () => string[];

  /**
   * Get registered commands.
   */
  getCommands: () => Map<string, CommandHandler>;

  /**
   * Get registered tools.
   */
  getTools: () => Map<string, ToolDefinition>;
};

/**
 * Creates a new kernel instance.
 * @example
 * const kernel = createKernel();
 * await kernel.use(myPlugin);
 * await kernel.init();
 */
export function createKernel(options: KernelOptions = {}): Kernel {
  let state: KernelState = 'created';
  const plugins = new Map<string, Plugin>();
  const pluginContexts = new Map<string, PluginContext>();
  const commands = new Map<string, CommandHandler>();
  const tools = new Map<string, ToolDefinition>();
  const events = createEventBus();
  const logger = options.logger ?? createLogger();
  function createPluginContext(pluginName: string): PluginContext {
    const pluginMetadata = new Map<string, unknown>();
    return {
      events,
      logger: logger.child(pluginName),
      metadata: pluginMetadata,
      registerCommand: (name: string, handler: CommandHandler): void => {
        const fullName = `${pluginName}:${name}`;
        commands.set(fullName, handler);
        logger.debug(`Registered command: ${fullName}`);
      },
      registerTool: (name: string, tool: ToolDefinition): void => {
        const fullName = `${pluginName}:${name}`;
        tools.set(fullName, tool);
        logger.debug(`Registered tool: ${fullName}`);
      },
    };
  }

  return {
    get state() {
      return state;
    },

    events,
    logger,

    async use(plugin: Plugin): Promise<Result<void, PluginError>> {
      if (state === 'shutdown') {
        return err(new PluginError('Cannot register plugin after kernel shutdown'));
      }

      if (plugins.has(plugin.name)) {
        return err(new PluginError(`Plugin '${plugin.name}' is already registered`));
      }

      plugins.set(plugin.name, plugin);
      const context = createPluginContext(plugin.name);
      pluginContexts.set(plugin.name, context);

      logger.debug(`Plugin '${plugin.name}' registered`);
      return ok(undefined);
    },

    async init(): Promise<Result<void, PluginError>> {
      if (state === 'ready') {
        return ok(undefined);
      }

      if (state === 'initializing') {
        return err(new PluginError('Kernel is already initializing'));
      }

      state = 'initializing';
      logger.info('Initializing kernel...');

      for (const [name, plugin] of plugins) {
        try {
          const context = pluginContexts.get(name)!;
          await plugin.setup(context);
          logger.debug(`Plugin '${name}' initialized`);
        } catch (error) {
          state = 'error';
          const message = error instanceof Error ? error.message : String(error);
          return err(new PluginError(`Failed to initialize plugin '${name}': ${message}`));
        }
      }

      state = 'ready';
      logger.info('Kernel ready');
      events.emit('kernel:ready', undefined);
      return ok(undefined);
    },

    async shutdown(): Promise<void> {
      if (state === 'shutdown') {
        return;
      }

      logger.info('Shutting down kernel...');
      events.emit('kernel:shutdown', undefined);

      for (const [name, plugin] of [...plugins.entries()].reverse()) {
        if (plugin.teardown) {
          try {
            const context = pluginContexts.get(name)!;
            await plugin.teardown(context);
            logger.debug(`Plugin '${name}' torn down`);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`Error tearing down plugin '${name}': ${message}`);
          }
        }
      }

      plugins.clear();
      pluginContexts.clear();
      commands.clear();
      tools.clear();
      events.off();

      state = 'shutdown';
      logger.info('Kernel shutdown complete');
    },

    getPlugin(name: string): Plugin | undefined {
      return plugins.get(name);
    },

    listPlugins(): string[] {
      return Array.from(plugins.keys());
    },

    getCommands(): Map<string, CommandHandler> {
      return new Map(commands);
    },

    getTools(): Map<string, ToolDefinition> {
      return new Map(tools);
    },
  };
}
