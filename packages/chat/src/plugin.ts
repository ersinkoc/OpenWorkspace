/**
 * Chat service plugin for OpenWorkspace.
 * Wraps all chat operations into a single ChatApi facade
 * and exposes a `chat()` factory function.
 */

import type { HttpClient, Plugin, PluginContext } from '@openworkspace/core';
import type {
  ChatApi,
  Space,
  Message,
  ListSpacesResponse,
  ListMessagesResponse,
  ListSpacesOptions,
  ListMessagesOptions,
} from './types.js';
import { listSpaces, getSpace, createSpace, findSpace } from './spaces.js';
import { listMessages, getMessage, sendMessage, updateMessage, deleteMessage } from './messages.js';
import { createDirectMessage, listDirectMessages } from './dm.js';

// ---------------------------------------------------------------------------
// ChatApi factory
// ---------------------------------------------------------------------------

/**
 * Creates a {@link ChatApi} instance bound to the given HTTP client.
 *
 * @param http - An authenticated HTTP client (typically with OAuth2 token interceptor).
 * @returns A ChatApi facade exposing all chat operations.
 *
 * @example
 * ```ts
 * import { createHttpClient } from '@openworkspace/core';
 * import { chat } from '@openworkspace/chat';
 *
 * const http = createHttpClient();
 * const chatApi = chat(http);
 *
 * const spaces = await chatApi.listSpaces({
 *   pageSize: 10,
 * });
 * ```
 */
export function chat(http: HttpClient): ChatApi {
  return {
    // Spaces
    listSpaces: (options) => listSpaces(http, options),
    getSpace: (spaceName) => getSpace(http, spaceName),
    createSpace: (displayName, spaceType) => createSpace(http, displayName, spaceType),
    findSpace: (displayName) => findSpace(http, displayName),

    // Messages
    listMessages: (spaceName, options) => listMessages(http, spaceName, options),
    getMessage: (messageName) => getMessage(http, messageName),
    sendMessage: (spaceName, text, threadKey) => sendMessage(http, spaceName, text, threadKey),
    updateMessage: (messageName, text) => updateMessage(http, messageName, text),
    deleteMessage: (messageName) => deleteMessage(http, messageName),

    // Direct Messages
    createDirectMessage: (userId, text) => createDirectMessage(http, userId, text),
    listDirectMessages: (userId, options) => listDirectMessages(http, userId, options),
  };
}

// ---------------------------------------------------------------------------
// Kernel Plugin
// ---------------------------------------------------------------------------

/**
 * Plugin name used for kernel registration.
 */
const PLUGIN_NAME = 'chat';

/**
 * Creates a Chat kernel plugin.
 * The plugin stores the ChatApi instance in the kernel metadata so that
 * other plugins or CLI commands can retrieve it.
 *
 * @param http - An authenticated HTTP client.
 * @returns A Plugin that registers the chat service with the kernel.
 *
 * @example
 * ```ts
 * import { createKernel, createHttpClient } from '@openworkspace/core';
 * import { chatPlugin } from '@openworkspace/chat';
 *
 * const kernel = createKernel();
 * const http = createHttpClient();
 * await kernel.use(chatPlugin(http));
 * await kernel.init();
 * ```
 */
export function chatPlugin(http: HttpClient): Plugin {
  const api = chat(http);

  return {
    name: PLUGIN_NAME,
    version: '0.1.0',

    setup(ctx: PluginContext): void {
      ctx.metadata.set(PLUGIN_NAME, api);
      ctx.logger.debug('Chat plugin initialized');
    },

    teardown(ctx: PluginContext): void {
      ctx.metadata.delete(PLUGIN_NAME);
      ctx.logger.debug('Chat plugin torn down');
    },
  };
}
