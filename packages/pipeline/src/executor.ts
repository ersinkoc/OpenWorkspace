/**
 * Pipeline step executor with context interpolation.
 */

import type { Result } from '@openworkspace/core';
import { ok, err, ValidationError } from '@openworkspace/core';
import type { ExpressionContext } from './expression.js';
import { evaluateExpression } from './expression.js';

/**
 * Pipeline step definition.
 */
export type Step = {
  /**
   * Step identifier.
   */
  id?: string;

  /**
   * Step name (for display).
   */
  name?: string;

  /**
   * Action to execute.
   */
  action: string;

  /**
   * Action parameters.
   */
  with?: Record<string, unknown>;

  /**
   * Condition for step execution.
   */
  if?: string;

  /**
   * Continue on error.
   */
  continueOnError?: boolean;

  /**
   * Output variable name.
   */
  output?: string;

  /**
   * Expression that resolves to an array for iteration.
   */
  forEach?: string;

  /**
   * Run forEach iterations in parallel.
   */
  parallel?: boolean;

  /**
   * Retry configuration.
   */
  retry?: {
    maxAttempts: number;
    delayMs?: number;
    backoff?: 'linear' | 'exponential';
  };

  /**
   * Timeout in milliseconds.
   */
  timeout?: number;
};

/**
 * Pipeline definition.
 */
export type Pipeline = {
  /**
   * Pipeline name.
   */
  name?: string;

  /**
   * Pipeline version.
   */
  version?: string;

  /**
   * Pipeline inputs.
   */
  inputs?: Record<string, { default?: unknown; required?: boolean; description?: string }>;

  /**
   * Pipeline steps.
   */
  steps: Step[];

  /**
   * Environment variables.
   */
  env?: Record<string, string>;
};

/**
 * Execution context for variable interpolation.
 */
export type ExecutionContext = {
  /**
   * Input values.
   */
  inputs: Record<string, unknown>;

  /**
   * Step outputs.
   */
  outputs: Record<string, unknown>;

  /**
   * Environment variables.
   */
  env: Record<string, string | undefined>;

  /**
   * Global variables.
   */
  vars: Record<string, unknown>;
};

/**
 * Structured execution log entry.
 */
export type ExecutionLog = {
  timestamp: number;
  stepId?: string;
  stepName?: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: unknown;
};

/**
 * Step execution result.
 */
export type StepResult = {
  /**
   * Step succeeded.
   */
  success: boolean;

  /**
   * Step output value.
   */
  output?: unknown;

  /**
   * Error message if failed.
   */
  error?: string;

  /**
   * Execution duration in milliseconds.
   */
  duration: number;

  /**
   * Step was skipped.
   */
  skipped?: boolean;

  /**
   * Number of attempts (for retry).
   */
  attempts?: number;

  /**
   * Results for forEach iterations.
   */
  iterationResults?: StepResult[];
};

/**
 * Pipeline execution result.
 */
export type PipelineResult = {
  /**
   * Pipeline succeeded.
   */
  success: boolean;

  /**
   * Step results.
   */
  steps: StepResult[];

  /**
   * Final outputs.
   */
  outputs: Record<string, unknown>;

  /**
   * Total execution duration in milliseconds.
   */
  duration: number;

  /**
   * Error message if failed.
   */
  error?: string;

  /**
   * Structured execution logs.
   */
  logs: ExecutionLog[];
};

/**
 * Action handler function type.
 */
export type ActionHandler = (
  params: Record<string, unknown>,
  context: ExecutionContext
) => Promise<unknown>;

/**
 * Action registry.
 */
export type ActionRegistry = Map<string, ActionHandler>;

/**
 * Builds an ExpressionContext from an ExecutionContext.
 */
function toExpressionContext(ctx: ExecutionContext): ExpressionContext {
  return {
    inputs: ctx.inputs,
    outputs: ctx.outputs,
    steps: ctx.outputs,
    env: ctx.env,
    vars: ctx.vars,
    item: ctx.vars.item,
    index: typeof ctx.vars.index === 'number' ? ctx.vars.index : undefined,
  };
}

/**
 * Interpolates expressions in a string.
 * Supports: ${{ expr }} where expr is any valid expression.
 */
/**
 * Safely extracts expressions from ${{ }} patterns without using regex.
 * Prevents ReDoS attacks by using manual parsing with depth limiting.
 */
function extractExpressions(value: string): Array<{ full: string; expr: string }> {
  const results: Array<{ full: string; expr: string }> = [];
  let i = 0;
  const maxLength = value.length;
  const maxDepth = 1000; // Prevent excessive nesting

  while (i < maxLength) {
    // Look for ${{ pattern
    const startIdx = value.indexOf('${{', i);
    if (startIdx === -1) break;

    // Find matching }}
    let depth = 0;
    let endIdx = -1;
    let j = startIdx + 3;

    while (j < maxLength && depth < maxDepth) {
      if (value[j] === '{' && value[j - 1] === '{') {
        depth++;
      } else if (value[j] === '}' && value[j - 1] === '}') {
        if (depth === 0) {
          endIdx = j;
          break;
        }
        depth--;
      }
      j++;
    }

    if (endIdx === -1) {
      // No matching closing bracket found, skip this
      i = startIdx + 3;
      continue;
    }

    const full = value.substring(startIdx, endIdx + 1);
    const expr = value.substring(startIdx + 3, endIdx - 1).trim();

    results.push({ full, expr });
    i = endIdx + 1;
  }

  return results;
}

export function interpolate(
  value: string,
  context: ExecutionContext
): Result<string, ValidationError> {
  // Use safe manual parsing instead of regex to prevent ReDoS
  const replacements = extractExpressions(value);
  let result = value;

  for (const { full, expr } of replacements) {
    try {
      const exprCtx = toExpressionContext(context);
      const evaluated = evaluateExpression(expr, exprCtx);
      const replacement = evaluated === undefined || evaluated === null ? '' : String(evaluated);
      result = result.split(full).join(replacement);
    } catch (e) {
      // Fall back to legacy simple path resolution for backward compatibility
      const legacyResult = legacyResolve(expr.trim(), context);
      if (legacyResult !== undefined) {
        const replacement = legacyResult === null ? '' : String(legacyResult);
        result = result.split(full).join(replacement);
      } else {
        return err(new ValidationError(
          e instanceof Error ? e.message : 'Expression evaluation failed: ' + expr
        ));
      }
    }
  }

  return ok(result);
}

/**
 * Legacy variable resolution for backward compatibility.
 * Handles simple path lookups like "inputs.name" or "outputs.result".
 */
function legacyResolve(
  path: string,
  context: ExecutionContext
): unknown {
  const parts = path.split('.');
  if (parts.length < 2) return undefined;

  const namespace = parts[0] ?? '';
  const key = parts[1] ?? '';
  const rest = parts.slice(2);
  let resolved: unknown;

  switch (namespace) {
    case 'inputs':
      resolved = context.inputs[key];
      break;
    case 'outputs':
      resolved = context.outputs[key];
      break;
    case 'env':
      resolved = context.env[key];
      break;
    case 'vars':
      resolved = context.vars[key];
      break;
    default:
      return undefined;
  }

  for (const part of rest) {
    if (resolved && typeof resolved === 'object') {
      // Prevent prototype pollution by blocking dangerous property names
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        return undefined;
      }
      resolved = (resolved as Record<string, unknown>)[part];
    } else {
      resolved = undefined;
      break;
    }
  }

  return resolved;
}

/**
 * Deeply interpolates all string values in an object.
 */
export function interpolateDeep(
  value: unknown,
  context: ExecutionContext
): Result<unknown, ValidationError> {
  if (typeof value === 'string') {
    return interpolate(value, context);
  }

  if (Array.isArray(value)) {
    const result: unknown[] = [];
    for (const item of value) {
      const interpolated = interpolateDeep(item, context);
      if (!interpolated.ok) return interpolated;
      result.push(interpolated.value);
    }
    return ok(result);
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const interpolatedKey = interpolate(key, context);
      if (!interpolatedKey.ok) return interpolatedKey;

      const interpolatedVal = interpolateDeep(val, context);
      if (!interpolatedVal.ok) return interpolatedVal;

      result[interpolatedKey.value] = interpolatedVal.value;
    }
    return ok(result);
  }

  return ok(value);
}

/**
 * Evaluates a condition expression.
 */
function evaluateCondition(condition: string, context: ExecutionContext): boolean {
  // Check if the condition contains ${{ }} wrapper
  const wrapperPattern = /^\$\{\{\s*([\s\S]*?)\s*\}\}$/;
  const wrapperMatch = wrapperPattern.exec(condition.trim());

  if (wrapperMatch) {
    // Expression inside ${{ }}: evaluate with expression evaluator
    const expr = wrapperMatch[1];
    if (expr !== undefined) {
      try {
        const exprCtx = toExpressionContext(context);
        const result = evaluateExpression(expr, exprCtx);
        return !!result;
      } catch {
        // Fall back to legacy interpolation
        const interpolated = interpolate(condition, context);
        if (!interpolated.ok) return false;
        const value = interpolated.value.trim();
        return value !== '' && value !== 'false' && value !== 'null' && value !== 'undefined';
      }
    }
  }

  // No wrapper: try evaluating as a bare expression
  try {
    const exprCtx = toExpressionContext(context);
    const result = evaluateExpression(condition.trim(), exprCtx);
    return !!result;
  } catch {
    // Fall back to legacy interpolation
    const interpolated = interpolate(condition, context);
    if (!interpolated.ok) return false;
    const value = interpolated.value.trim();
    return value !== '' && value !== 'false' && value !== 'null' && value !== 'undefined';
  }
}

/**
 * Creates an initial execution context.
 */
export function createContext(
  inputs: Record<string, unknown> = {},
  env: Record<string, string | undefined> = {}
): ExecutionContext {
  return {
    inputs,
    outputs: {},
    env: { ...env },
    vars: {},
  };
}

/**
 * Creates a log entry.
 */
function createLog(
  level: ExecutionLog['level'],
  message: string,
  step?: Step,
  data?: unknown
): ExecutionLog {
  return {
    timestamp: Date.now(),
    stepId: step?.id,
    stepName: step?.name,
    level,
    message,
    data,
  };
}

/**
 * Wraps a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Step timed out after ' + String(ms) + 'ms'));
    }, ms);

    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
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
 * Executes a single step invocation (no forEach, no retry).
 */
async function executeStepOnce(
  step: Step,
  context: ExecutionContext,
  actions: ActionRegistry,
  logs: ExecutionLog[]
): Promise<StepResult> {
  const startTime = Date.now();

  // Get action handler
  const handler = actions.get(step.action);
  if (!handler) {
    const duration = Date.now() - startTime;
    const errorMsg = 'Unknown action: ' + step.action;
    logs.push(createLog('error', errorMsg, step));
    return {
      success: false,
      error: errorMsg,
      duration,
    };
  }

  // Interpolate parameters
  const interpolatedParams = interpolateDeep(step.with ?? {}, context);
  if (!interpolatedParams.ok) {
    const duration = Date.now() - startTime;
    logs.push(createLog('error', 'Interpolation failed: ' + interpolatedParams.error.message, step));
    return {
      success: false,
      error: interpolatedParams.error.message,
      duration,
    };
  }

  try {
    let resultPromise = handler(interpolatedParams.value as Record<string, unknown>, context);

    // Apply timeout
    if (step.timeout !== undefined && step.timeout > 0) {
      resultPromise = withTimeout(resultPromise, step.timeout);
    }

    const output = await resultPromise;
    const duration = Date.now() - startTime;

    return {
      success: true,
      output,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: message,
      duration,
    };
  }
}

/**
 * Executes a step with retry logic.
 */
async function executeStepWithRetry(
  step: Step,
  context: ExecutionContext,
  actions: ActionRegistry,
  logs: ExecutionLog[]
): Promise<StepResult> {
  const retry = step.retry;
  if (!retry || retry.maxAttempts <= 1) {
    const result = await executeStepOnce(step, context, actions, logs);
    result.attempts = 1;
    return result;
  }

  const maxAttempts = retry.maxAttempts;
  const baseDelay = retry.delayMs ?? 0;
  const backoff = retry.backoff ?? 'linear';

  let lastResult: StepResult | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await executeStepOnce(step, context, actions, logs);

    if (result.success) {
      result.attempts = attempt;
      if (attempt > 1) {
        logs.push(createLog('info', 'Step succeeded on attempt ' + String(attempt), step));
      }
      return result;
    }

    lastResult = result;

    if (attempt < maxAttempts) {
      const currentDelay = backoff === 'exponential'
        ? baseDelay * Math.pow(2, attempt - 1)
        : baseDelay;

      logs.push(createLog('warn',
        'Step failed on attempt ' + String(attempt) + '/' + String(maxAttempts) +
        ', retrying in ' + String(currentDelay) + 'ms: ' + (result.error ?? 'unknown error'),
        step
      ));

      if (currentDelay > 0) {
        await delay(currentDelay);
      }
    }
  }

  // All attempts exhausted
  const finalResult = lastResult!;
  finalResult.attempts = maxAttempts;
  logs.push(createLog('error',
    'Step failed after ' + String(maxAttempts) + ' attempts: ' + (finalResult.error ?? 'unknown error'),
    step
  ));
  return finalResult;
}

/**
 * Executes a single step (with forEach and retry support).
 */
async function executeStep(
  step: Step,
  context: ExecutionContext,
  actions: ActionRegistry,
  logs: ExecutionLog[]
): Promise<StepResult> {
  const startTime = Date.now();
  const stepLabel = step.name ?? step.id ?? step.action;

  // Check condition
  if (step.if !== undefined) {
    const shouldRun = evaluateCondition(step.if, context);
    if (!shouldRun) {
      logs.push(createLog('info', 'Step skipped (condition false): ' + stepLabel, step));
      return {
        success: true,
        skipped: true,
        duration: Date.now() - startTime,
      };
    }
  }

  logs.push(createLog('info', 'Step started: ' + stepLabel, step));

  // Handle forEach
  if (step.forEach !== undefined) {
    return executeForEach(step, context, actions, logs, startTime);
  }

  // Normal execution with retry
  const result = await executeStepWithRetry(step, context, actions, logs);

  // Store output if specified
  if (result.success && step.output) {
    context.outputs[step.output] = result.output;
  }

  if (result.success) {
    logs.push(createLog('info', 'Step completed: ' + stepLabel, step, { duration: result.duration }));
  } else {
    logs.push(createLog('error', 'Step failed: ' + stepLabel + ' - ' + (result.error ?? 'unknown'), step));
  }

  return result;
}

/**
 * Executes a step with forEach iteration.
 */
async function executeForEach(
  step: Step,
  context: ExecutionContext,
  actions: ActionRegistry,
  logs: ExecutionLog[],
  startTime: number
): Promise<StepResult> {
  const stepLabel = step.name ?? step.id ?? step.action;

  // Evaluate the forEach expression to get the array
  let items: unknown[];
  try {
    const exprCtx = toExpressionContext(context);
    const raw = evaluateExpression(step.forEach!, exprCtx);
    if (!Array.isArray(raw)) {
      const errorMsg = 'forEach expression did not resolve to an array';
      logs.push(createLog('error', errorMsg, step));
      return {
        success: false,
        error: errorMsg,
        duration: Date.now() - startTime,
      };
    }
    items = raw;
  } catch (e) {
    const errorMsg = 'forEach expression evaluation failed: ' + (e instanceof Error ? e.message : String(e));
    logs.push(createLog('error', errorMsg, step));
    return {
      success: false,
      error: errorMsg,
      duration: Date.now() - startTime,
    };
  }

  logs.push(createLog('debug', 'forEach iterating over ' + String(items.length) + ' items', step));

  const iterationResults: StepResult[] = [];

  const executeIteration = async (item: unknown, index: number): Promise<StepResult> => {
    // Create a scoped context with item and index in vars
    const iterContext: ExecutionContext = {
      inputs: context.inputs,
      outputs: context.outputs,
      env: context.env,
      vars: { ...context.vars, item, index },
    };

    return executeStepWithRetry(step, iterContext, actions, logs);
  };

  if (step.parallel) {
    // Parallel execution
    const promises = items.map((item, index) => executeIteration(item, index));
    const results = await Promise.all(promises);
    iterationResults.push(...results);
  } else {
    // Sequential execution
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const result = await executeIteration(item, i);
      iterationResults.push(result);

      // Fail early unless continueOnError
      if (!result.success && !step.continueOnError) {
        break;
      }
    }
  }

  const allSucceeded = iterationResults.every(r => r.success);
  const totalDuration = Date.now() - startTime;
  const iterOutputs = iterationResults.map(r => r.output);

  // Store output if specified: array of all iteration results
  if (step.output) {
    context.outputs[step.output] = iterOutputs;
  }

  if (allSucceeded) {
    logs.push(createLog('info',
      'forEach completed: ' + stepLabel + ' (' + String(items.length) + ' iterations)',
      step
    ));
  } else {
    logs.push(createLog('error',
      'forEach had failures: ' + stepLabel,
      step
    ));
  }

  return {
    success: allSucceeded || (step.continueOnError === true),
    output: iterOutputs,
    duration: totalDuration,
    iterationResults,
  };
}

/**
 * Executes a pipeline.
 * @example
 * const result = await executePipeline(pipeline, actions, { name: 'test' });
 * if (result.success) console.log('Pipeline completed!');
 */
export async function executePipeline(
  pipeline: Pipeline,
  actions: ActionRegistry,
  inputs: Record<string, unknown> = {},
  env: Record<string, string | undefined> = {}
): Promise<PipelineResult> {
  const startTime = Date.now();
  const context = createContext(inputs, env);
  const stepResults: StepResult[] = [];
  const logs: ExecutionLog[] = [];

  logs.push(createLog('info', 'Pipeline started' + (pipeline.name ? ': ' + pipeline.name : '')));

  // Validate required inputs
  if (pipeline.inputs) {
    for (const [key, config] of Object.entries(pipeline.inputs)) {
      if (config.required && !(key in inputs)) {
        const errorMsg = 'Missing required input: ' + key;
        logs.push(createLog('error', errorMsg));
        return {
          success: false,
          steps: [],
          outputs: {},
          duration: Date.now() - startTime,
          error: errorMsg,
          logs,
        };
      }
      if (!(key in inputs) && config.default !== undefined) {
        context.inputs[key] = config.default;
      }
    }
  }

  // Execute steps
  for (const step of pipeline.steps) {
    const result = await executeStep(step, context, actions, logs);
    stepResults.push(result);

    if (!result.success && !step.continueOnError && !result.skipped) {
      logs.push(createLog('error', 'Pipeline failed at step: ' + (step.name ?? step.id ?? step.action)));
      return {
        success: false,
        steps: stepResults,
        outputs: context.outputs,
        duration: Date.now() - startTime,
        error: result.error,
        logs,
      };
    }
  }

  logs.push(createLog('info', 'Pipeline completed successfully'));

  return {
    success: true,
    steps: stepResults,
    outputs: context.outputs,
    duration: Date.now() - startTime,
    logs,
  };
}

/**
 * Checks if a URL points to a private/internal address.
 */
function isPrivateUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);

    // Only allow http:// and https:// schemes
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return true;
    }

    const hostname = parsed.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) return true;
    if (hostname.startsWith('172.')) {
      const second = parseInt(hostname.split('.')[1] ?? '0', 10);
      if (second >= 16 && second <= 31) return true;
    }
    if (hostname === '169.254.169.254') return true; // AWS metadata
    if (hostname === 'metadata.google.internal') return true; // GCP metadata
    return false;
  } catch {
    return true;
  }
}

/**
 * Creates a built-in action registry with common actions.
 */
export function createBuiltinActions(): ActionRegistry {
  const actions = new Map<string, ActionHandler>();

  // Echo action
  actions.set('echo', async (params) => {
    return params.message ?? '';
  });

  // Set variable action
  actions.set('set', async (params, context) => {
    const { name, value } = params;
    if (typeof name !== 'string') {
      throw new Error('Parameter "name" must be a string');
    }
    context.vars[name] = value;
    return value;
  });

  // Get variable action
  actions.set('get', async (params, context) => {
    const { name } = params;
    if (typeof name !== 'string') {
      throw new Error('Parameter "name" must be a string');
    }
    return context.vars[name];
  });

  // Sleep action
  actions.set('sleep', async (params) => {
    const ms = typeof params.ms === 'number' ? params.ms : 1000;
    await new Promise(resolve => setTimeout(resolve, ms));
    return ms;
  });

  // HTTP request action (basic)
  actions.set('http', async (params) => {
    const { url, method = 'GET', body } = params;
    if (typeof url !== 'string') {
      throw new Error('Parameter "url" must be a string');
    }

    if (isPrivateUrl(url)) {
      throw new Error('Requests to private/internal addresses are not allowed');
    }

    const response = await fetch(url, {
      method: method as string,
      body: body ? JSON.stringify(body) : undefined,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
    });

    return {
      status: response.status,
      statusText: response.statusText,
      data: await response.json().catch(() => null),
    };
  });

  return actions;
}
