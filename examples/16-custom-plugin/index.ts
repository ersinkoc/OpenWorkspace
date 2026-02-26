/**
 * Example: Custom Plugin
 * Create and register a custom plugin with the OpenWorkspace kernel.
 */
import {
  createKernel,
  type Plugin,
  type PluginContext,
  type ToolDefinition,
} from '@openworkspace/core';

/**
 * A custom plugin that provides a "hello" tool and reacts to kernel events.
 */
function helloPlugin(): Plugin {
  return {
    name: 'hello-plugin',
    version: '1.0.0',

    async setup(context: PluginContext) {
      context.logger.info('Hello plugin is setting up');

      // Register a command for CLI usage
      context.registerCommand('hello', async (args: string[]) => {
        const name = args[0] ?? 'World';
        console.log(`Hello, ${name}!`);
        return 0;
      });

      // Register a tool for MCP usage
      const helloTool: ToolDefinition = {
        description: 'Greets the user by name',
        parameters: {
          name: {
            type: 'string',
            description: 'The name to greet',
            required: false,
            default: 'World',
          },
        },
        handler: async (params) => {
          const name = (params.name as string) ?? 'World';
          return { greeting: `Hello, ${name}!` };
        },
      };
      context.registerTool('hello', helloTool);

      // Listen for kernel events
      context.events.on('kernel:ready', () => {
        context.logger.info('Kernel is ready -- hello plugin active');
      });

      // Store plugin-specific metadata
      context.metadata.set('hello:initialized', true);
      context.metadata.set('hello:startedAt', new Date().toISOString());
    },

    async teardown() {
      console.log('Hello plugin is shutting down');
    },
  };
}

async function main() {
  // Create the kernel and register our custom plugin
  const kernel = createKernel({
    plugins: [helloPlugin()],
  });

  // Boot the kernel (this calls setup on all plugins)
  const bootResult = await kernel.boot();
  if (!bootResult.ok) {
    console.error('Kernel boot failed:', bootResult.error.message);
    return;
  }

  console.log('Kernel booted with hello-plugin');

  // Shut down cleanly
  await kernel.shutdown();
}

main().catch(console.error);
