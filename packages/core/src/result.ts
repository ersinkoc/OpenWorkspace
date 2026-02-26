/**
 * Result pattern for explicit error handling.
 * Zero-dependency implementation.
 */

/**
 * Represents a successful result.
 */
export type Ok<T> = {
  readonly ok: true;
  readonly value: T;
};

/**
 * Represents a failed result.
 */
export type Err<E> = {
  readonly ok: false;
  readonly error: E;
};

/**
 * Result type that must be handled - either success or failure.
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Creates a successful Result.
 * @example
 * const result = ok(42);
 * if (result.ok) console.log(result.value);
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Creates a failed Result.
 * @example
 * const result = err(new Error('failed'));
 * if (!result.ok) console.error(result.error);
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Unwraps a Result, returning the value or throwing the error.
 * Use sparingly - prefer explicit ok checks.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwraps a Result with a fallback value.
 */
export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

/**
 * Maps the success value of a Result.
 */
export function map<T, E, U>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

/**
 * Maps the error value of a Result.
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return result.ok ? result : err(fn(result.error));
}
