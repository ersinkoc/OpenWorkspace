/**
 * Execution operations for Google Apps Script API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type { ExecutionResponse, Operation, ListProcessesResponse } from './types.js';
import { BASE_URL } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a query-string from an options object.
 * Drops `undefined` values and correctly encodes all values.
 */
function toQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Extracts a WorkspaceError from an HttpClient error result.
 * The HttpClient returns NetworkError which already extends WorkspaceError.
 */
function toWorkspaceError(error: unknown): WorkspaceError {
  if (error instanceof WorkspaceError) {
    return error;
  }
  return new WorkspaceError(
    error instanceof Error ? error.message : String(error),
    'APPSCRIPT_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Execution operations
// ---------------------------------------------------------------------------

/**
 * Options for listing processes.
 */
export type ListProcessesOptions = {
  /** Maximum number of processes to return. */
  readonly pageSize?: number;
  /** Token for retrieving the next page of results. */
  readonly pageToken?: string;
};

/**
 * Runs a function in an Apps Script project.
 *
 * @param http - Authenticated HTTP client.
 * @param scriptId - The script project's ID.
 * @param functionName - The name of the function to run.
 * @param parameters - Optional array of parameters to pass to the function.
 * @returns The execution result.
 *
 * @example
 * ```ts
 * const result = await runFunction(http, 'abc123', 'myFunction', ['arg1', 42]);
 * if (result.ok) {
 *   console.log('Result:', result.value.result);
 * }
 * ```
 */
export async function runFunction(
  http: HttpClient,
  scriptId: string,
  functionName: string,
  parameters?: readonly unknown[],
): Promise<Result<ExecutionResponse, WorkspaceError>> {
  const url = `${BASE_URL}/scripts/${encodeURIComponent(scriptId)}:run`;

  const body: Record<string, unknown> = {
    function: functionName,
  };

  if (parameters !== undefined && parameters.length > 0) {
    body.parameters = parameters;
  }

  const result = await http.post<Operation>(url, { body });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  const operation = result.value.data;

  // Check if the operation has an error
  if (operation.error) {
    return err(
      new WorkspaceError(
        operation.error.message ?? 'Script execution failed',
        'APPSCRIPT_EXECUTION_ERROR',
      ),
    );
  }

  // Return the response if available
  if (operation.response) {
    return ok(operation.response);
  }

  // If neither error nor response, return empty response
  return ok({ result: undefined });
}

/**
 * Lists recent script execution processes.
 *
 * @param http - Authenticated HTTP client.
 * @param options - Optional filtering and pagination parameters.
 * @returns A list of recent processes.
 *
 * @example
 * ```ts
 * const result = await listProcesses(http, { pageSize: 10 });
 * if (result.ok) {
 *   for (const process of result.value.processes ?? []) {
 *     console.log('Function:', process.functionName, 'Status:', process.processStatus);
 *   }
 * }
 * ```
 */
export async function listProcesses(
  http: HttpClient,
  options: ListProcessesOptions = {},
): Promise<Result<ListProcessesResponse, WorkspaceError>> {
  const qs = toQueryString(options as Record<string, unknown>);
  const url = `${BASE_URL}/processes${qs}`;

  const result = await http.get<ListProcessesResponse>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}
