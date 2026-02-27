/**
 * Form operations for Google Forms API v1.
 * Every function takes an HttpClient as the first parameter and returns a Result.
 */

import type { HttpClient, Result } from '@openworkspace/core';
import { ok, err, WorkspaceError } from '@openworkspace/core';
import type {
  Form,
  Info,
  BatchUpdateFormRequest,
  BatchUpdateFormResponse,
  CreateItemRequest,
  Request,
  Item,
  Location,
} from './types.js';
import { BASE_URL } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    'FORMS_ERROR',
  );
}

// ---------------------------------------------------------------------------
// Form operations
// ---------------------------------------------------------------------------

/**
 * Gets a form by its identifier.
 *
 * @param http - Authenticated HTTP client.
 * @param formId - Form identifier.
 * @returns The requested form.
 *
 * @example
 * ```ts
 * const result = await getForm(http, 'abc123');
 * if (result.ok) console.log(result.value.info.title);
 * ```
 */
export async function getForm(
  http: HttpClient,
  formId: string,
): Promise<Result<Form, WorkspaceError>> {
  const url = `${BASE_URL}/forms/${encodeURIComponent(formId)}`;

  const result = await http.get<Form>(url);
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Creates a new form.
 *
 * @param http - Authenticated HTTP client.
 * @param info - Form metadata (title and description).
 * @returns The newly created form.
 *
 * @example
 * ```ts
 * const result = await createForm(http, {
 *   title: 'Customer Feedback',
 *   description: 'Please share your thoughts',
 * });
 * if (result.ok) console.log('Created:', result.value.formId);
 * ```
 */
export async function createForm(
  http: HttpClient,
  info: Info,
): Promise<Result<Form, WorkspaceError>> {
  const url = `${BASE_URL}/forms`;

  const result = await http.post<Form>(url, {
    body: { info } as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Batch updates a form with multiple requests.
 *
 * @param http - Authenticated HTTP client.
 * @param formId - Form identifier.
 * @param requests - List of update requests to execute.
 * @returns The batch update response.
 *
 * @example
 * ```ts
 * const result = await batchUpdateForm(http, 'abc123', [
 *   {
 *     createItem: {
 *       item: {
 *         title: 'What is your name?',
 *         questionItem: {
 *           question: {
 *             required: true,
 *             textQuestion: { paragraph: false },
 *           },
 *         },
 *       },
 *       location: { index: 0 },
 *     },
 *   },
 * ]);
 * if (result.ok) console.log('Updated');
 * ```
 */
export async function batchUpdateForm(
  http: HttpClient,
  formId: string,
  requests: readonly Request[],
): Promise<Result<BatchUpdateFormResponse, WorkspaceError>> {
  const url = `${BASE_URL}/forms/${encodeURIComponent(formId)}:batchUpdate`;

  const body: BatchUpdateFormRequest = {
    requests,
    includeFormInResponse: true,
  };

  const result = await http.post<BatchUpdateFormResponse>(url, {
    body: body as unknown as Record<string, unknown>,
  });
  if (!result.ok) {
    return err(toWorkspaceError(result.error));
  }

  return ok(result.value.data);
}

/**
 * Adds a question item to a form.
 * This is a convenience wrapper around {@link batchUpdateForm}.
 *
 * @param http - Authenticated HTTP client.
 * @param formId - Form identifier.
 * @param item - The item to add.
 * @param location - Location where the item should be inserted (defaults to end).
 * @returns The batch update response.
 *
 * @example
 * ```ts
 * const result = await addQuestion(http, 'abc123', {
 *   title: 'What is your email?',
 *   questionItem: {
 *     question: {
 *       required: true,
 *       textQuestion: { paragraph: false },
 *     },
 *   },
 * });
 * if (result.ok) console.log('Added question');
 * ```
 */
export async function addQuestion(
  http: HttpClient,
  formId: string,
  item: Item,
  location?: Location,
): Promise<Result<BatchUpdateFormResponse, WorkspaceError>> {
  const requests: Request[] = [
    {
      createItem: {
        item,
        ...(location ? { location } : {}),
      } as CreateItemRequest,
    },
  ];

  return batchUpdateForm(http, formId, requests);
}

/**
 * Deletes an item from a form by its index.
 * This is a convenience wrapper around {@link batchUpdateForm}.
 *
 * @param http - Authenticated HTTP client.
 * @param formId - Form identifier.
 * @param index - Index of the item to delete.
 * @returns The batch update response.
 *
 * @example
 * ```ts
 * const result = await deleteItem(http, 'abc123', 0);
 * if (result.ok) console.log('Deleted item');
 * ```
 */
export async function deleteItem(
  http: HttpClient,
  formId: string,
  index: number,
): Promise<Result<BatchUpdateFormResponse, WorkspaceError>> {
  const requests: Request[] = [
    {
      deleteItem: {
        location: { index },
      },
    },
  ];

  return batchUpdateForm(http, formId, requests);
}
