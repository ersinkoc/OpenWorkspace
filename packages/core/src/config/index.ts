/**
 * Configuration module for OpenWorkspace.
 * Provides JSON5 parsing and persisted config management.
 */

// JSON5 parser
export type { Json5Value } from './json5.js';
export { parseJson5 } from './json5.js';

// Config store
export type { ConfigStore } from './config-store.js';
export { createConfigStore } from './config-store.js';
