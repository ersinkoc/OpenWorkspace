/**
 * @openworkspace/chat
 * Google Chat API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  User,
  Space,
  SpaceDetails,
  Message,
  Thread,
  Card,
  CardHeader,
  CardSection,
  ListSpacesResponse,
  ListMessagesResponse,
  ListSpacesOptions,
  ListMessagesOptions,
  ChatApi,
} from './types.js';
export { BASE_URL } from './types.js';

// Space operations
export {
  listSpaces,
  getSpace,
  createSpace,
  findSpace,
} from './spaces.js';

// Message operations
export {
  listMessages,
  getMessage,
  sendMessage,
  updateMessage,
  deleteMessage,
} from './messages.js';

// Direct message operations
export {
  createDirectMessage,
  listDirectMessages,
} from './dm.js';

// Plugin & facade
export { chat, chatPlugin } from './plugin.js';
