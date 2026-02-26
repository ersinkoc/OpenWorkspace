/**
 * Apps Script service plugin for OpenWorkspace.
 * Wraps all Apps Script operations into a single AppScriptApi facade
 * and exposes an `appscript()` factory function.
 */

import type { HttpClient, Result, Plugin, PluginContext } from '@openworkspace/core';
import type { WorkspaceError } from '@openworkspace/core';
import type {
  Project,
  Content,
  ScriptFile,
  ExecutionResponse,
  ListProcessesResponse,
  AppScriptApi,
} from './types.js';
import { getProject, createProject, getContent, updateContent } from './projects.js';
import { runFunction, listProcesses } from './execute.js';
import type { ListProcessesOptions } from './execute.js';

// ---------------------------------------------------------------------------
// AppScriptApi facade
// ---------------------------------------------------------------------------

/**
 * Creates an {@link AppScriptApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns An AppScriptApi facade exposing all Apps Script operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { appscript } from '@openworkspace/appscript';
 *
 * const http = createHttpClient();
 * const api = appscript(http);
 *
 * const content = await api.getContent('my-script-id');
 * if (content.ok) {
 *   console.log('Files:', content.value.files?.length);
 * }
 * ```
 */
export function appscript(http: HttpClient): AppScriptApi {
  return {
    // Projects
    getProject: (scriptId) => getProject(http, scriptId),
    createProject: (title, parentId) => createProject(http, title, parentId),
    getContent: (scriptId, versionNumber) => getContent(http, scriptId, versionNumber),
    updateContent: (scriptId, files) => updateContent(http, scriptId, files),

    // Execution
    runFunction: (scriptId, functionName, parameters) =>
      runFunction(http, scriptId, functionName, parameters),
    listProcesses: (options) => listProcesses(http, options),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'appscript';

/**
 * Creates an Apps Script kernel plugin.
 * The plugin stores the AppScriptApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the Apps Script service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { appscriptPlugin } from '@openworkspace/appscript';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(appscriptPlugin(http));
 * await kernel.init();
 * ```
 */
export function appscriptPlugin(http: HttpClient): Plugin {
  const api = appscript(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Apps Script plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Apps Script plugin torn down');
    },
  };
}
