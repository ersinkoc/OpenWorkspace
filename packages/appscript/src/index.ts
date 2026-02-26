/**
 * @openworkspace/appscript
 * Google Apps Script API v1 service package for OpenWorkspace.
 * Zero-dependency -- uses HttpClient from @openworkspace/core.
 */

// Types
export type {
  User,
  Project,
  ScriptFileType,
  GoogleAppsScriptFunction,
  FunctionSet,
  ScriptFile,
  Content,
  ExecutionRequest,
  Status,
  ScriptStackTraceElement,
  ExecutionError,
  ExecutionResponse,
  Operation,
  Process,
  ListProcessesResponse,
  AppScriptApi,
} from './types.js';
export { BASE_URL } from './types.js';

// Project operations
export { getProject, createProject, getContent, updateContent } from './projects.js';

// Execution operations
export type { ListProcessesOptions } from './execute.js';
export { runFunction, listProcesses } from './execute.js';

// Plugin & facade
export { appscript, appscriptPlugin } from './plugin.js';
