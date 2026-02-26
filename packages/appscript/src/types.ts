/**
 * Type definitions for Google Apps Script API v1.
 * Maps Google Apps Script JSON responses to clean TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------

/**
 * Google Apps Script API v1 base URL.
 */
export const BASE_URL = 'https://script.googleapis.com/v1';

// ---------------------------------------------------------------------------
// User types
// ---------------------------------------------------------------------------

/**
 * A user who created or last modified a project or file.
 */
export type User = {
  /** The user's display name. */
  readonly name?: string;
  /** The user's email address. */
  readonly email?: string;
  /** A link to the user's profile photo. */
  readonly photoUrl?: string;
};

// ---------------------------------------------------------------------------
// Project types
// ---------------------------------------------------------------------------

/**
 * An Apps Script project.
 * Corresponds to the `Project` resource in the Google Apps Script API.
 */
export type Project = {
  /** The script project's ID. */
  readonly scriptId: string;
  /** The title of the script project. */
  readonly title?: string;
  /** The parent's Drive ID that the script will be attached to. */
  readonly parentId?: string;
  /** When the script was created. */
  readonly createTime?: string;
  /** When the script was last updated. */
  readonly updateTime?: string;
  /** The user who originally created the script. */
  readonly creator?: User;
  /** The user who last modified the script. */
  readonly lastModifyUser?: User;
};

// ---------------------------------------------------------------------------
// Script file types
// ---------------------------------------------------------------------------

/**
 * Script file type enumeration.
 */
export type ScriptFileType =
  | 'ENUM_TYPE_UNSPECIFIED'
  | 'SERVER_JS'
  | 'HTML'
  | 'JSON';

/**
 * A function in a Google Apps Script.
 */
export type GoogleAppsScriptFunction = {
  /** The function name. */
  readonly name: string;
  /** The function parameter names. */
  readonly parameters?: readonly string[];
};

/**
 * A set of functions available in a script file.
 */
export type FunctionSet = {
  /** A list of functions. */
  readonly values?: readonly GoogleAppsScriptFunction[];
};

/**
 * A file in an Apps Script project.
 */
export type ScriptFile = {
  /** The name of the file. */
  readonly name: string;
  /** The type of the file. */
  readonly type: ScriptFileType;
  /** The file content. */
  readonly source?: string;
  /** The user who last modified the file. */
  readonly lastModifyUser?: User;
  /** The timestamp when the file was created. */
  readonly createTime?: string;
  /** The timestamp when the file was last updated. */
  readonly updateTime?: string;
  /** The set of functions in this file. */
  readonly functionSet?: FunctionSet;
};

/**
 * The content of a script project.
 */
export type Content = {
  /** The script project's ID. */
  readonly scriptId: string;
  /** The list of script project files. */
  readonly files?: readonly ScriptFile[];
};

// ---------------------------------------------------------------------------
// Execution types
// ---------------------------------------------------------------------------

/**
 * A request to run a function in a script.
 */
export type ExecutionRequest = {
  /** The name of the function to execute. */
  readonly function: string;
  /** The parameters to pass to the function. */
  readonly parameters?: readonly unknown[];
  /** If true, the script will run in development mode. */
  readonly devMode?: boolean;
};

/**
 * The status details of an error.
 */
export type Status = {
  /** The status code. */
  readonly code?: number;
  /** A developer-facing error message. */
  readonly message?: string;
  /** An array of error details. */
  readonly details?: readonly Record<string, unknown>[];
};

/**
 * An element in a script stack trace.
 */
export type ScriptStackTraceElement = {
  /** The name of the function that failed. */
  readonly function?: string;
  /** The line number where the script failed. */
  readonly lineNumber?: number;
};

/**
 * An error that occurred during script execution.
 */
export type ExecutionError = {
  /** The error message. */
  readonly errorMessage?: string;
  /** The error type. */
  readonly errorType?: string;
  /** The stack trace elements. */
  readonly scriptStackTraceElements?: readonly ScriptStackTraceElement[];
};

/**
 * An object that represents a successful execution result.
 */
export type ExecutionResponse = {
  /** The return value from the script function. */
  readonly result?: unknown;
};

/**
 * A long-running operation resource returned by Apps Script API.
 */
export type Operation = {
  /** Whether the operation is complete. */
  readonly done?: boolean;
  /** The response if the operation is complete and successful. */
  readonly response?: ExecutionResponse;
  /** The error if the operation is complete and failed. */
  readonly error?: Status;
};

// ---------------------------------------------------------------------------
// Process types
// ---------------------------------------------------------------------------

/**
 * A process represents an execution of a script.
 */
export type Process = {
  /** The process type. */
  readonly processType?: string;
  /** The execution state. */
  readonly processStatus?: string;
  /** Name of the function that was called. */
  readonly functionName?: string;
  /** Time the execution started. */
  readonly startTime?: string;
  /** Duration of the execution. */
  readonly duration?: string;
  /** The executing user's access level. */
  readonly userAccessLevel?: string;
};

/**
 * Response when listing processes.
 */
export type ListProcessesResponse = {
  /** The list of processes. */
  readonly processes?: readonly Process[];
  /** Token to retrieve the next page of results. */
  readonly nextPageToken?: string;
};

// ---------------------------------------------------------------------------
// API facade type
// ---------------------------------------------------------------------------

/**
 * Unified Apps Script API surface that wraps all operations.
 * Created via the {@link createAppScriptApi} factory function.
 */
export type AppScriptApi = {
  /**
   * Gets a project's metadata.
   */
  getProject(scriptId: string): Promise<import('@openworkspace/core').Result<Project, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Creates a new script project.
   */
  createProject(
    title: string,
    parentId?: string,
  ): Promise<import('@openworkspace/core').Result<Project, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Gets the content of a script project.
   */
  getContent(
    scriptId: string,
    versionNumber?: number,
  ): Promise<import('@openworkspace/core').Result<Content, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Updates the content of a script project.
   */
  updateContent(
    scriptId: string,
    files: readonly ScriptFile[],
  ): Promise<import('@openworkspace/core').Result<Content, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Runs a function in a script.
   */
  runFunction(
    scriptId: string,
    functionName: string,
    parameters?: readonly unknown[],
  ): Promise<import('@openworkspace/core').Result<ExecutionResponse, import('@openworkspace/core').WorkspaceError>>;

  /**
   * Lists recent processes.
   */
  listProcesses(
    options?: {
      readonly pageSize?: number;
      readonly pageToken?: string;
    },
  ): Promise<import('@openworkspace/core').Result<ListProcessesResponse, import('@openworkspace/core').WorkspaceError>>;
};
