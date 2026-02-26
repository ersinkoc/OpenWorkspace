/**
 * Programmatic pipeline builder API.
 * Provides a fluent, chainable interface for building and executing pipelines
 * without YAML definitions.
 */

/**
 * Pipeline step context passed to step handlers.
 * Contains results from all previous steps, keyed by step ID.
 */
export type StepContext = Record<string, unknown>;

/**
 * Step handler function for programmatic steps.
 */
export type StepHandler = (context: StepContext) => unknown | Promise<unknown>;

/**
 * Error handler function.
 */
export type ErrorHandler = (stepId: string, error: Error) => void;

/**
 * Builder step definition (internal).
 */
type BuilderStep = {
  id: string;
  handler: StepHandler;
  condition?: (context: StepContext) => boolean;
  retryOptions?: { maxAttempts: number; delayMs?: number; backoff?: 'linear' | 'exponential' };
  timeoutMs?: number;
  continueOnError?: boolean;
};

/**
 * Builder result.
 */
export type BuilderResult = {
  success: boolean;
  outputs: StepContext;
  steps: Array<{
    id: string;
    success: boolean;
    output?: unknown;
    error?: string;
    duration: number;
    skipped?: boolean;
    attempts?: number;
  }>;
  duration: number;
  error?: string;
};

/**
 * Pipeline builder for creating pipelines programmatically.
 */
export type PipelineBuilder = {
  /** Add a step to the pipeline. */
  step(id: string, handler: StepHandler): PipelineBuilder;

  /** Add a conditional step. */
  stepIf(id: string, condition: (ctx: StepContext) => boolean, handler: StepHandler): PipelineBuilder;

  /** Add a step with retry. */
  stepWithRetry(
    id: string,
    handler: StepHandler,
    options: { maxAttempts: number; delayMs?: number; backoff?: 'linear' | 'exponential' }
  ): PipelineBuilder;

  /** Set timeout for the last added step. */
  timeout(ms: number): PipelineBuilder;

  /** Set continue-on-error for the last added step. */
  continueOnError(): PipelineBuilder;

  /** Set a global error handler. */
  onError(handler: ErrorHandler): PipelineBuilder;

  /** Execute the pipeline and return results. */
  run(): Promise<BuilderResult>;
};

/**
 * Wraps a promise with a timeout.
 * If the promise does not settle within `ms` milliseconds, it rejects
 * with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Step timed out after ' + String(ms) + 'ms'));
    }, ms);

    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Delays for a specified number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes a handler with retry logic.
 * Returns the handler result and the number of attempts made.
 */
async function executeWithRetry(
  handler: StepHandler,
  context: StepContext,
  options: { maxAttempts: number; delayMs?: number; backoff?: 'linear' | 'exponential' },
): Promise<{ output: unknown; attempts: number }> {
  const { maxAttempts, delayMs = 0, backoff = 'linear' } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const output = await handler(context);
      return { output, attempts: attempt };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));

      if (attempt < maxAttempts && delayMs > 0) {
        const currentDelay = backoff === 'exponential'
          ? delayMs * Math.pow(2, attempt - 1)
          : delayMs;
        await delay(currentDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Creates a new pipeline builder.
 *
 * @example
 * ```ts
 * const result = await createPipelineBuilder()
 *   .step('greet', () => 'Hello')
 *   .step('shout', (ctx) => (ctx.greet as string).toUpperCase())
 *   .stepIf('optional', (ctx) => ctx.greet === 'Hello', () => 'matched!')
 *   .run();
 *
 * console.log(result.outputs.shout); // 'HELLO'
 * ```
 */
export function createPipelineBuilder(): PipelineBuilder {
  const steps: BuilderStep[] = [];
  let errorHandler: ErrorHandler | undefined;

  /**
   * Returns the last step in the pipeline, or throws if none exist.
   */
  function lastStep(): BuilderStep {
    const last = steps[steps.length - 1];
    if (!last) {
      throw new Error('No steps have been added to the pipeline');
    }
    return last;
  }

  const builder: PipelineBuilder = {
    step(id: string, handler: StepHandler): PipelineBuilder {
      steps.push({ id, handler });
      return builder;
    },

    stepIf(
      id: string,
      condition: (ctx: StepContext) => boolean,
      handler: StepHandler,
    ): PipelineBuilder {
      steps.push({ id, handler, condition });
      return builder;
    },

    stepWithRetry(
      id: string,
      handler: StepHandler,
      options: { maxAttempts: number; delayMs?: number; backoff?: 'linear' | 'exponential' },
    ): PipelineBuilder {
      steps.push({ id, handler, retryOptions: options });
      return builder;
    },

    timeout(ms: number): PipelineBuilder {
      lastStep().timeoutMs = ms;
      return builder;
    },

    continueOnError(): PipelineBuilder {
      lastStep().continueOnError = true;
      return builder;
    },

    onError(handler: ErrorHandler): PipelineBuilder {
      errorHandler = handler;
      return builder;
    },

    async run(): Promise<BuilderResult> {
      const pipelineStart = Date.now();
      const context: StepContext = {};
      const stepResults: BuilderResult['steps'] = [];
      let pipelineSuccess = true;
      let pipelineError: string | undefined;

      for (const step of steps) {
        const stepStart = Date.now();

        // Check condition
        if (step.condition) {
          const shouldRun = step.condition(context);
          if (!shouldRun) {
            stepResults.push({
              id: step.id,
              success: true,
              skipped: true,
              duration: Date.now() - stepStart,
            });
            continue;
          }
        }

        try {
          let output: unknown;
          let attempts = 1;

          if (step.retryOptions) {
            // Execute with retry logic
            let resultPromise = executeWithRetry(step.handler, context, step.retryOptions);

            if (step.timeoutMs !== undefined) {
              resultPromise = withTimeout(resultPromise, step.timeoutMs);
            }

            const retryResult = await resultPromise;
            output = retryResult.output;
            attempts = retryResult.attempts;
          } else {
            // Execute normally
            let resultPromise = Promise.resolve(step.handler(context));

            if (step.timeoutMs !== undefined) {
              resultPromise = withTimeout(resultPromise, step.timeoutMs);
            }

            output = await resultPromise;
          }

          context[step.id] = output;

          stepResults.push({
            id: step.id,
            success: true,
            output,
            duration: Date.now() - stepStart,
            attempts: step.retryOptions ? attempts : undefined,
          });
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));

          if (errorHandler) {
            errorHandler(step.id, error);
          }

          stepResults.push({
            id: step.id,
            success: false,
            error: error.message,
            duration: Date.now() - stepStart,
            attempts: step.retryOptions ? step.retryOptions.maxAttempts : undefined,
          });

          if (step.continueOnError) {
            continue;
          }

          pipelineSuccess = false;
          pipelineError = 'Step "' + step.id + '" failed: ' + error.message;
          break;
        }
      }

      return {
        success: pipelineSuccess,
        outputs: context,
        steps: stepResults,
        duration: Date.now() - pipelineStart,
        error: pipelineError,
      };
    },
  };

  return builder;
}
