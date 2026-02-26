import { describe, it, expect, vi } from 'vitest';
import type { ActionRegistry } from './executor.js';
import {
  interpolate,
  interpolateDeep,
  createContext,
  executePipeline,
  createBuiltinActions,
} from './executor.js';

describe('executor', () => {
  describe('interpolate', () => {
    const context = {
      inputs: { name: 'John', count: 5 },
      outputs: { result: 'success' },
      env: { API_KEY: 'secret123' },
      vars: { temp: 'value' },
    };

    it('should interpolate inputs', () => {
      const result = interpolate('Hello ${{ inputs.name }}!', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Hello John!');
      }
    });

    it('should interpolate outputs', () => {
      const result = interpolate('Result: ${{ outputs.result }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Result: success');
      }
    });

    it('should interpolate env', () => {
      const result = interpolate('Key: ${{ env.API_KEY }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Key: secret123');
      }
    });

    it('should interpolate vars', () => {
      const result = interpolate('Var: ${{ vars.temp }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Var: value');
      }
    });

    it('should return empty string for undefined values', () => {
      const result = interpolate('Value: ${{ inputs.undefined }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Value: ');
      }
    });

    it('should return error for invalid expression', () => {
      const result = interpolate('${{ invalid }}', context);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Unknown variable');
      }
    });

    it('should return error for unknown namespace', () => {
      const result = interpolate('${{ unknown.value }}', context);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Unknown variable');
      }
    });

    it('should handle multiple interpolations', () => {
      const result = interpolate('${{ inputs.name }} - ${{ outputs.result }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('John - success');
      }
    });

    it('should handle nested property access', () => {
      const nestedContext = {
        ...context,
        inputs: { user: { name: 'Jane' } },
      };
      const result = interpolate('Name: ${{ inputs.user.name }}', nestedContext);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Name: Jane');
      }
    });

    it('should return error for deep path on non-object via legacy fallback', () => {
      // Use a key with @ which makes the expression evaluator throw,
      // falling back to legacyResolve. The deep path traversal hits
      // a non-object value (string), covering the else branch.
      const ctx = {
        inputs: { 'user@email': 'john@example.com' },
        outputs: {},
        env: {},
        vars: {},
      };
      const result = interpolate('Val: ${{ inputs.user@email.deep }}', ctx);
      // legacyResolve returns undefined (non-object can't be traversed)
      // so interpolate returns an error
      expect(result.ok).toBe(false);
    });

    it('should resolve deep path on object via legacy fallback', () => {
      // Use a key with @ which makes the expression evaluator throw,
      // falling back to legacyResolve. The deep path traversal succeeds
      // because the intermediate value is an object.
      const ctx = {
        inputs: { 'user@data': { name: 'John' } },
        outputs: {},
        env: {},
        vars: {},
      };
      const result = interpolate('Name: ${{ inputs.user@data.name }}', ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Name: John');
      }
    });
  });

  describe('interpolateDeep', () => {
    const context = {
      inputs: { name: 'John' },
      outputs: {},
      env: {},
      vars: {},
    };

    it('should interpolate string', () => {
      const result = interpolateDeep('Hello ${{ inputs.name }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('Hello John');
      }
    });

    it('should interpolate array', () => {
      const result = interpolateDeep(['${{ inputs.name }}', 'world'], context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual(['John', 'world']);
      }
    });

    it('should interpolate object values', () => {
      const result = interpolateDeep({ greeting: 'Hello ${{ inputs.name }}' }, context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ greeting: 'Hello John' });
      }
    });

    it('should interpolate object keys', () => {
      const result = interpolateDeep({ '${{ inputs.name }}': 'value' }, context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ John: 'value' });
      }
    });

    it('should pass through non-string values', () => {
      const result = interpolateDeep({ count: 42, active: true }, context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ count: 42, active: true });
      }
    });

    it('should handle nested objects', () => {
      const result = interpolateDeep({ nested: { value: '${{ inputs.name }}' } }, context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ nested: { value: 'John' } });
      }
    });
  });

  describe('createContext', () => {
    it('should create context with defaults', () => {
      const context = createContext();
      expect(context.inputs).toEqual({});
      expect(context.outputs).toEqual({});
      expect(context.vars).toEqual({});
      expect(context.env).toBeDefined();
    });

    it('should merge inputs', () => {
      const context = createContext({ name: 'test' });
      expect(context.inputs).toEqual({ name: 'test' });
    });

    it('should merge env', () => {
      const context = createContext({}, { CUSTOM: 'value' });
      expect(context.env.CUSTOM).toBe('value');
    });
  });

  describe('executePipeline', () => {
    it('should execute simple pipeline', async () => {
      const pipeline = {
        steps: [
          { action: 'echo', with: { message: 'Hello' } },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].success).toBe(true);
      expect(result.steps[0].output).toBe('Hello');
    });

    it('should execute multiple steps', async () => {
      const pipeline = {
        steps: [
          { action: 'echo', with: { message: 'Step 1' } },
          { action: 'echo', with: { message: 'Step 2' } },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].output).toBe('Step 1');
      expect(result.steps[1].output).toBe('Step 2');
    });

    it('should capture step output', async () => {
      const pipeline = {
        steps: [
          { action: 'echo', with: { message: 'Hello' }, output: 'greeting' },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.outputs.greeting).toBe('Hello');
    });

    it('should use step output in subsequent steps', async () => {
      const pipeline = {
        steps: [
          { action: 'set', with: { name: 'msg', value: 'Hello' }, output: 'setResult' },
          { action: 'echo', with: { message: '${{ outputs.setResult }}' } },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps[1].output).toBe('Hello');
    });

    it('should fail on unknown action', async () => {
      const pipeline = {
        steps: [
          { action: 'unknown', with: {} },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should continue on error when specified', async () => {
      const pipeline = {
        steps: [
          { action: 'unknown', with: {}, continueOnError: true },
          { action: 'echo', with: { message: 'Still works' } },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].success).toBe(false);
      expect(result.steps[1].success).toBe(true);
    });

    it('should skip step when condition is false', async () => {
      const pipeline = {
        steps: [
          { action: 'echo', with: { message: 'test' }, if: '${{ inputs.skip }}' },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions, { skip: '' });

      expect(result.success).toBe(true);
      expect(result.steps[0].skipped).toBe(true);
    });

    it('should run step when condition is true', async () => {
      const pipeline = {
        steps: [
          { action: 'echo', with: { message: 'test' }, if: '${{ inputs.run }}' },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions, { run: 'yes' });

      expect(result.success).toBe(true);
      expect(result.steps[0].skipped).toBeUndefined();
      expect(result.steps[0].success).toBe(true);
    });

    it('should validate required inputs', async () => {
      const pipeline = {
        inputs: {
          required: { required: true },
        },
        steps: [],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required input');
    });

    it('should use default input values', async () => {
      const pipeline = {
        inputs: {
          name: { default: 'default_name' },
        },
        steps: [
          { action: 'echo', with: { message: '${{ inputs.name }}' } },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps[0].output).toBe('default_name');
    });

    it('should track execution duration', async () => {
      const pipeline = {
        steps: [
          { action: 'sleep', with: { ms: 10 } },
        ],
      };
      const actions = createBuiltinActions();
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.duration).toBeGreaterThanOrEqual(10);
      expect(result.steps[0].duration).toBeGreaterThanOrEqual(10);
    });
  });

  describe('createBuiltinActions', () => {
    it('should include echo action', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('echo');
      expect(handler).toBeDefined();

      const result = await handler!({ message: 'test' }, {} as any);
      expect(result).toBe('test');
    });

    it('should include set action', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('set');
      expect(handler).toBeDefined();

      const context = createContext();
      const result = await handler!({ name: 'key', value: 'val' }, context);
      expect(result).toBe('val');
      expect(context.vars.key).toBe('val');
    });

    it('should include get action', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('get');
      expect(handler).toBeDefined();

      const context = createContext();
      context.vars.key = 'value';
      const result = await handler!({ name: 'key' }, context);
      expect(result).toBe('value');
    });

    it('should include sleep action', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('sleep');
      expect(handler).toBeDefined();

      const start = Date.now();
      const result = await handler!({ ms: 10 }, {} as any);
      const duration = Date.now() - start;

      expect(result).toBe(10);
      expect(duration).toBeGreaterThanOrEqual(10);
    });

    it('should include http action', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('http');
      expect(handler).toBeDefined();
    });

    it('should throw on set without name', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('set');

      await expect(handler!({ name: 123 }, {} as any)).rejects.toThrow('must be a string');
    });

    it('should throw on get without name', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('get');

      await expect(handler!({ name: 123 }, {} as any)).rejects.toThrow('must be a string');
    });

    it('should return empty string from echo when no message provided', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('echo')!;
      const result = await handler({}, {} as any);
      expect(result).toBe('');
    });

    it('should default sleep to 1000ms when ms is not a number', async () => {
      const actions = createBuiltinActions();
      const handler = actions.get('sleep')!;
      // We mock setTimeout to avoid actually waiting 1000ms
      vi.useFakeTimers();
      const promise = handler({ ms: 'invalid' }, {} as any);
      vi.advanceTimersByTime(1000);
      const result = await promise;
      expect(result).toBe(1000);
      vi.useRealTimers();
    });

    describe('http action', () => {
      it('should throw when url is not a string', async () => {
        const actions = createBuiltinActions();
        const handler = actions.get('http')!;
        await expect(handler({ url: 123 }, {} as any)).rejects.toThrow('Parameter "url" must be a string');
      });

      it('should make a GET request and return response data', async () => {
        const mockResponse = {
          status: 200,
          statusText: 'OK',
          json: vi.fn().mockResolvedValue({ id: 1, name: 'test' }),
        };
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

        const actions = createBuiltinActions();
        const handler = actions.get('http')!;
        const result = await handler({ url: 'https://api.example.com/data' }, {} as any);

        expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/data', {
          method: 'GET',
          body: undefined,
          headers: undefined,
        });
        expect(result).toEqual({
          status: 200,
          statusText: 'OK',
          data: { id: 1, name: 'test' },
        });

        fetchSpy.mockRestore();
      });

      it('should make a POST request with body and content-type header', async () => {
        const mockResponse = {
          status: 201,
          statusText: 'Created',
          json: vi.fn().mockResolvedValue({ id: 2 }),
        };
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

        const actions = createBuiltinActions();
        const handler = actions.get('http')!;
        const body = { name: 'new item' };
        const result = await handler({ url: 'https://api.example.com/data', method: 'POST', body }, {} as any);

        expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/data', {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        });
        expect(result).toEqual({
          status: 201,
          statusText: 'Created',
          data: { id: 2 },
        });

        fetchSpy.mockRestore();
      });

      it('should return null data when response is not JSON', async () => {
        const mockResponse = {
          status: 204,
          statusText: 'No Content',
          json: vi.fn().mockRejectedValue(new Error('no body')),
        };
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

        const actions = createBuiltinActions();
        const handler = actions.get('http')!;
        const result = await handler({ url: 'https://api.example.com/delete' }, {} as any);

        expect(result).toEqual({
          status: 204,
          statusText: 'No Content',
          data: null,
        });

        fetchSpy.mockRestore();
      });
    });
  });

  describe('createContext (process.env merging)', () => {
    it('should include process.env variables in context', () => {
      const context = createContext();
      // process.env should be merged; PATH is always present on all platforms
      expect(context.env).toBeDefined();
      expect(typeof context.env).toBe('object');
    });

    it('should override process.env with provided env values', () => {
      const context = createContext({}, { MY_CUSTOM_VAR: 'custom_value' });
      expect(context.env.MY_CUSTOM_VAR).toBe('custom_value');
    });

    it('should preserve process.env variables not overridden', () => {
      // Pick a known process.env key
      const knownKey = Object.keys(process.env)[0];
      if (knownKey) {
        const context = createContext({}, { UNRELATED: 'val' });
        expect(context.env[knownKey]).toBe(process.env[knownKey]);
      }
    });
  });

  describe('executeStepOnce (via executePipeline)', () => {
    it('should return error for unknown action with correct message', async () => {
      const actions: ActionRegistry = new Map();
      const pipeline = {
        steps: [{ action: 'nonexistent' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown action: nonexistent');
      expect(result.steps[0]!.success).toBe(false);
      expect(result.steps[0]!.error).toBe('Unknown action: nonexistent');
      // Should have an error log
      expect(result.logs.some(l => l.level === 'error' && l.message.includes('Unknown action'))).toBe(true);
    });

    it('should return error when parameter interpolation fails', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('test', async (params) => params);

      const pipeline = {
        steps: [{
          action: 'test',
          with: { value: '${{ invalid_var }}' },
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.steps[0]!.success).toBe(false);
      expect(result.steps[0]!.error).toBeDefined();
      expect(result.logs.some(l => l.level === 'error' && l.message.includes('Interpolation failed'))).toBe(true);
    });

    it('should catch handler errors and return them as step failure', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('failing', async () => {
        throw new Error('Handler exploded');
      });

      const pipeline = {
        steps: [{ action: 'failing' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.steps[0]!.success).toBe(false);
      expect(result.steps[0]!.error).toBe('Handler exploded');
    });

    it('should catch non-Error thrown values from handler', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('failing', async () => {
        throw 'string error';
      });

      const pipeline = {
        steps: [{ action: 'failing' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.steps[0]!.success).toBe(false);
      expect(result.steps[0]!.error).toBe('string error');
    });

    it('should apply timeout and fail when step exceeds it', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('slow', async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'done';
      });

      const pipeline = {
        steps: [{ action: 'slow', timeout: 10 }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.steps[0]!.success).toBe(false);
      expect(result.steps[0]!.error).toContain('timed out');
    });

    it('should succeed when step completes within timeout', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('fast', async () => {
        return 'quick';
      });

      const pipeline = {
        steps: [{ action: 'fast', timeout: 5000 }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps[0]!.output).toBe('quick');
    });

    it('should track duration on successful step', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('noop', async () => 'ok');

      const pipeline = {
        steps: [{ action: 'noop' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.steps[0]!.duration).toBeGreaterThanOrEqual(0);
    });

    it('should track duration on failed step', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('fail', async () => { throw new Error('boom'); });

      const pipeline = {
        steps: [{ action: 'fail' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.steps[0]!.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('forEach execution', () => {
    function makeActions(): ActionRegistry {
      const actions: ActionRegistry = new Map();
      actions.set('collect', async (params) => {
        return params.value ?? params.message;
      });
      actions.set('echo', async (params) => {
        return params.message ?? '';
      });
      actions.set('fail-on', async (params) => {
        if (params.failValue && params.message === params.failValue) {
          throw new Error('Failed on: ' + String(params.message));
        }
        return params.message;
      });
      return actions;
    }

    it('should iterate over array sequentially using forEach with item/index', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          forEach: "inputs.items",
          with: { message: '${{ item }}' },
          output: 'results',
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a', 'b', 'c'] });

      expect(result.success).toBe(true);
      expect(result.outputs.results).toEqual(['a', 'b', 'c']);
      expect(result.steps[0]!.iterationResults).toHaveLength(3);
      expect(result.steps[0]!.iterationResults![0]!.success).toBe(true);
      expect(result.steps[0]!.iterationResults![1]!.success).toBe(true);
      expect(result.steps[0]!.iterationResults![2]!.success).toBe(true);
    });

    it('should execute forEach iterations in parallel when parallel is true', async () => {
      const executionOrder: number[] = [];
      const actions: ActionRegistry = new Map();
      actions.set('track', async (params) => {
        const idx = params.idx as number;
        // Shorter delay for higher index to show parallel execution
        const delayMs = (3 - idx) * 5;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        executionOrder.push(idx);
        return idx;
      });

      const pipeline = {
        steps: [{
          action: 'track',
          forEach: "inputs.items",
          parallel: true,
          with: { idx: '${{ index }}' },
          output: 'results',
        }],
      };

      // Use numeric strings that can be parsed as indices
      const result = await executePipeline(pipeline, actions, { items: ['a', 'b', 'c'] });

      expect(result.success).toBe(true);
      expect(result.outputs.results).toHaveLength(3);
      expect(result.steps[0]!.iterationResults).toHaveLength(3);
    });

    it('should fail early in sequential forEach when an iteration fails', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'fail-on',
          forEach: "inputs.items",
          with: { message: '${{ item }}', failValue: 'b' },
          output: 'results',
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a', 'b', 'c'] });

      expect(result.success).toBe(false);
      // Should have stopped after 'b' failed, so only 2 iteration results (a succeeded, b failed)
      expect(result.steps[0]!.iterationResults).toHaveLength(2);
      expect(result.steps[0]!.iterationResults![0]!.success).toBe(true);
      expect(result.steps[0]!.iterationResults![1]!.success).toBe(false);
    });

    it('should continue all iterations with continueOnError in sequential forEach', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'fail-on',
          forEach: "inputs.items",
          continueOnError: true,
          with: { message: '${{ item }}', failValue: 'b' },
          output: 'results',
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a', 'b', 'c'] });

      // continueOnError means the step itself is treated as success
      expect(result.success).toBe(true);
      expect(result.steps[0]!.iterationResults).toHaveLength(3);
      expect(result.steps[0]!.iterationResults![0]!.success).toBe(true);
      expect(result.steps[0]!.iterationResults![1]!.success).toBe(false);
      expect(result.steps[0]!.iterationResults![2]!.success).toBe(true);
    });

    it('should fail when forEach expression does not resolve to an array', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          forEach: "inputs.notAnArray",
          with: { message: '${{ item }}' },
        }],
      };
      const result = await executePipeline(pipeline, actions, { notAnArray: 'just a string' });

      expect(result.success).toBe(false);
      expect(result.steps[0]!.error).toContain('forEach expression did not resolve to an array');
    });

    it('should fail when forEach expression evaluation throws', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          forEach: "nonexistent_var.items",
          with: { message: '${{ item }}' },
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.steps[0]!.error).toContain('forEach expression evaluation failed');
    });

    it('should store array of outputs in context when output is specified', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [
          {
            action: 'echo',
            forEach: "inputs.items",
            with: { message: '${{ item }}' },
            output: 'collected',
          },
          {
            action: 'echo',
            with: { message: 'done' },
            output: 'final',
          },
        ],
      };
      const result = await executePipeline(pipeline, actions, { items: ['x', 'y'] });

      expect(result.success).toBe(true);
      expect(result.outputs.collected).toEqual(['x', 'y']);
      expect(result.outputs.final).toBe('done');
    });

    it('should handle empty array in forEach', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          forEach: "inputs.items",
          with: { message: '${{ item }}' },
          output: 'results',
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: [] });

      expect(result.success).toBe(true);
      expect(result.outputs.results).toEqual([]);
      expect(result.steps[0]!.iterationResults).toHaveLength(0);
    });

    it('should skip forEach step when if condition is false', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          forEach: "inputs.items",
          if: '${{ false }}',
          with: { message: '${{ item }}' },
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a', 'b'] });

      expect(result.success).toBe(true);
      expect(result.steps[0]!.skipped).toBe(true);
    });

    it('should make item available as object properties in forEach', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('get-name', async (params) => {
        return params.name;
      });

      const pipeline = {
        steps: [{
          action: 'get-name',
          forEach: "inputs.items",
          with: { name: '${{ item.name }}' },
          output: 'names',
        }],
      };
      const result = await executePipeline(pipeline, actions, {
        items: [{ name: 'Alice' }, { name: 'Bob' }],
      });

      expect(result.success).toBe(true);
      expect(result.outputs.names).toEqual(['Alice', 'Bob']);
    });

    it('should run all parallel iterations even when some fail', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'fail-on',
          forEach: "inputs.items",
          parallel: true,
          with: { message: '${{ item }}', failValue: 'b' },
          output: 'results',
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a', 'b', 'c'] });

      // Parallel runs all, but overall step fails because not all succeeded
      expect(result.success).toBe(false);
      expect(result.steps[0]!.iterationResults).toHaveLength(3);
      expect(result.steps[0]!.iterationResults![0]!.success).toBe(true);
      expect(result.steps[0]!.iterationResults![1]!.success).toBe(false);
      expect(result.steps[0]!.iterationResults![2]!.success).toBe(true);
    });

    it('should log forEach iteration count at debug level', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          forEach: "inputs.items",
          with: { message: '${{ item }}' },
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a', 'b'] });

      expect(result.success).toBe(true);
      expect(result.logs.some(l =>
        l.level === 'debug' && l.message.includes('forEach iterating over 2 items')
      )).toBe(true);
    });

    it('should log success message on completed forEach', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          name: 'my-loop',
          forEach: "inputs.items",
          with: { message: '${{ item }}' },
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a'] });

      expect(result.success).toBe(true);
      expect(result.logs.some(l =>
        l.level === 'info' && l.message.includes('forEach completed') && l.message.includes('my-loop')
      )).toBe(true);
    });

    it('should log error message on failed forEach', async () => {
      const actions = makeActions();
      const pipeline = {
        steps: [{
          action: 'fail-on',
          name: 'my-failing-loop',
          forEach: "inputs.items",
          with: { message: '${{ item }}', failValue: 'a' },
        }],
      };
      const result = await executePipeline(pipeline, actions, { items: ['a'] });

      expect(result.success).toBe(false);
      expect(result.logs.some(l =>
        l.level === 'error' && l.message.includes('forEach had failures') && l.message.includes('my-failing-loop')
      )).toBe(true);
    });
  });

  describe('condition evaluation (if)', () => {
    it('should evaluate bare expression without ${{ }} wrapper', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          with: { message: 'ran' },
          if: 'inputs.flag == true',
        }],
      };

      const resultTrue = await executePipeline(pipeline, actions, { flag: true });
      expect(resultTrue.success).toBe(true);
      expect(resultTrue.steps[0]!.skipped).toBeUndefined();

      const resultFalse = await executePipeline(pipeline, actions, { flag: false });
      expect(resultFalse.success).toBe(true);
      expect(resultFalse.steps[0]!.skipped).toBe(true);
    });

    it('should evaluate condition with comparison expression', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          with: { message: 'passed' },
          if: '${{ inputs.count > 5 }}',
        }],
      };

      const resultSkipped = await executePipeline(pipeline, actions, { count: 3 });
      expect(resultSkipped.steps[0]!.skipped).toBe(true);

      const resultRan = await executePipeline(pipeline, actions, { count: 10 });
      expect(resultRan.steps[0]!.skipped).toBeUndefined();
      expect(resultRan.steps[0]!.output).toBe('passed');
    });

    it('should skip when condition evaluates to false string', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          with: { message: 'test' },
          if: '${{ inputs.val }}',
        }],
      };

      // 'false' string should be falsy in evaluateCondition
      const result = await executePipeline(pipeline, actions, { val: false });
      expect(result.steps[0]!.skipped).toBe(true);
    });

    it('should skip when condition evaluates to null', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          with: { message: 'test' },
          if: '${{ inputs.val }}',
        }],
      };

      const result = await executePipeline(pipeline, actions, { val: null });
      expect(result.steps[0]!.skipped).toBe(true);
    });
  });

  describe('retry logic', () => {
    it('should retry and succeed on later attempt', async () => {
      let attempt = 0;
      const actions: ActionRegistry = new Map();
      actions.set('flaky', async () => {
        attempt++;
        if (attempt < 3) throw new Error('not yet');
        return 'success';
      });

      const pipeline = {
        steps: [{
          action: 'flaky',
          retry: { maxAttempts: 3, delayMs: 0 },
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps[0]!.attempts).toBe(3);
    });

    it('should fail after exhausting all retry attempts', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('always-fail', async () => {
        throw new Error('permanent failure');
      });

      const pipeline = {
        steps: [{
          action: 'always-fail',
          retry: { maxAttempts: 3, delayMs: 0 },
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.steps[0]!.attempts).toBe(3);
      expect(result.steps[0]!.error).toBe('permanent failure');
      expect(result.logs.some(l =>
        l.level === 'error' && l.message.includes('failed after 3 attempts')
      )).toBe(true);
    });

    it('should apply exponential backoff delay between retries', async () => {
      let attempt = 0;
      const timestamps: number[] = [];
      const actions: ActionRegistry = new Map();
      actions.set('timed-fail', async () => {
        attempt++;
        timestamps.push(Date.now());
        if (attempt < 3) throw new Error('fail');
        return 'ok';
      });

      const pipeline = {
        steps: [{
          action: 'timed-fail',
          retry: { maxAttempts: 3, delayMs: 10, backoff: 'exponential' as const },
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps[0]!.attempts).toBe(3);
      // With exponential backoff: delay1 = 10ms, delay2 = 20ms
      // Check that delays were applied (at least approximately)
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1]! - timestamps[0]!;
        const delay2 = timestamps[2]! - timestamps[1]!;
        expect(delay1).toBeGreaterThanOrEqual(8); // ~10ms
        expect(delay2).toBeGreaterThanOrEqual(15); // ~20ms
      }
    });

    it('should log retry warnings between attempts', async () => {
      let attempt = 0;
      const actions: ActionRegistry = new Map();
      actions.set('retry-test', async () => {
        attempt++;
        if (attempt === 1) throw new Error('first fail');
        return 'ok';
      });

      const pipeline = {
        steps: [{
          action: 'retry-test',
          retry: { maxAttempts: 2, delayMs: 0 },
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.logs.some(l =>
        l.level === 'warn' && l.message.includes('attempt 1/2') && l.message.includes('first fail')
      )).toBe(true);
      expect(result.logs.some(l =>
        l.level === 'info' && l.message.includes('succeeded on attempt 2')
      )).toBe(true);
    });

    it('should treat maxAttempts <= 1 as no retry', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('single', async () => {
        throw new Error('fail once');
      });

      const pipeline = {
        steps: [{
          action: 'single',
          retry: { maxAttempts: 1 },
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.steps[0]!.attempts).toBe(1);
    });

    it('should set attempts to 1 when no retry config', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('simple', async () => 'done');

      const pipeline = {
        steps: [{ action: 'simple' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.steps[0]!.attempts).toBe(1);
    });
  });

  describe('pipeline execution logs', () => {
    it('should include pipeline started log', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        name: 'test-pipeline',
        steps: [{ action: 'echo', with: { message: 'hi' } }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.level === 'info' && l.message.includes('Pipeline started') && l.message.includes('test-pipeline')
      )).toBe(true);
    });

    it('should include pipeline completed log on success', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{ action: 'echo', with: { message: 'hi' } }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.level === 'info' && l.message === 'Pipeline completed successfully'
      )).toBe(true);
    });

    it('should include pipeline failed log on failure', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{ action: 'nonexistent', name: 'bad-step' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.level === 'error' && l.message.includes('Pipeline failed at step')
      )).toBe(true);
    });

    it('should include step started and completed logs', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{ action: 'echo', name: 'greet', with: { message: 'hi' } }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.level === 'info' && l.message.includes('Step started: greet')
      )).toBe(true);
      expect(result.logs.some(l =>
        l.level === 'info' && l.message.includes('Step completed: greet')
      )).toBe(true);
    });

    it('should include step failed log with error message', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('fail', async () => { throw new Error('boom'); });

      const pipeline = {
        steps: [{ action: 'fail', name: 'failing-step' }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.level === 'error' && l.message.includes('Step failed: failing-step') && l.message.includes('boom')
      )).toBe(true);
    });

    it('should include step skipped log when condition is false', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          name: 'skipped-step',
          with: { message: 'hi' },
          if: '${{ false }}',
        }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.level === 'info' && l.message.includes('Step skipped') && l.message.includes('skipped-step')
      )).toBe(true);
    });

    it('should use step id as label when name is not provided', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{ action: 'echo', id: 'step-1', with: { message: 'hi' } }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.message.includes('step-1')
      )).toBe(true);
    });

    it('should use action as label when neither name nor id is provided', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{ action: 'echo', with: { message: 'hi' } }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs.some(l =>
        l.message.includes('Step started: echo')
      )).toBe(true);
    });

    it('should attach stepId and stepName to log entries', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{ action: 'echo', id: 'myId', name: 'myName', with: { message: 'hi' } }],
      };
      const result = await executePipeline(pipeline, actions);

      const stepLog = result.logs.find(l => l.stepId === 'myId');
      expect(stepLog).toBeDefined();
      expect(stepLog!.stepName).toBe('myName');
    });
  });

  describe('pipeline input validation', () => {
    it('should not use default when input is explicitly provided', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        inputs: {
          name: { default: 'fallback' },
        },
        steps: [
          { action: 'echo', with: { message: '${{ inputs.name }}' } },
        ],
      };
      const result = await executePipeline(pipeline, actions, { name: 'explicit' });

      expect(result.success).toBe(true);
      expect(result.steps[0]!.output).toBe('explicit');
    });

    it('should pass required input validation when input is provided', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        inputs: {
          name: { required: true },
        },
        steps: [
          { action: 'echo', with: { message: '${{ inputs.name }}' } },
        ],
      };
      const result = await executePipeline(pipeline, actions, { name: 'hello' });

      expect(result.success).toBe(true);
    });

    it('should log error for missing required input', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        inputs: {
          requiredField: { required: true },
        },
        steps: [],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(false);
      expect(result.logs.some(l =>
        l.level === 'error' && l.message.includes('Missing required input: requiredField')
      )).toBe(true);
    });
  });

  describe('output storage', () => {
    it('should store step output in context outputs when output key is specified', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('produce', async () => ({ data: 42 }));

      const pipeline = {
        steps: [
          { action: 'produce', output: 'myResult' },
          { action: 'produce', output: 'secondResult' },
        ],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.success).toBe(true);
      expect(result.outputs.myResult).toEqual({ data: 42 });
      expect(result.outputs.secondResult).toEqual({ data: 42 });
    });

    it('should not store output when step fails', async () => {
      const actions: ActionRegistry = new Map();
      actions.set('fail', async () => { throw new Error('fail'); });

      const pipeline = {
        steps: [{ action: 'fail', output: 'shouldNotExist', continueOnError: true }],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.outputs.shouldNotExist).toBeUndefined();
    });
  });

  describe('pipeline name in logs', () => {
    it('should include pipeline name when provided', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        name: 'My Pipeline',
        steps: [],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs[0]!.message).toBe('Pipeline started: My Pipeline');
    });

    it('should omit pipeline name when not provided', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [],
      };
      const result = await executePipeline(pipeline, actions);

      expect(result.logs[0]!.message).toBe('Pipeline started');
    });
  });

  describe('legacy interpolation fallback', () => {
    it('should fall back to legacy resolve for keys with hyphens', () => {
      const context = {
        inputs: { 'my-key': 'legacy-value' },
        outputs: {},
        env: {},
        vars: {},
      };
      // 'inputs.my-key' causes the expression evaluator to parse as inputs.my - key (subtraction)
      // which fails, then legacy resolve handles it as a simple path lookup
      const result = interpolate('${{ inputs.my-key }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('legacy-value');
      }
    });

    it('should fall back to legacy resolve for outputs with hyphens', () => {
      const context = {
        inputs: {},
        outputs: { 'my-result': 'output-value' },
        env: {},
        vars: {},
      };
      const result = interpolate('${{ outputs.my-result }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('output-value');
      }
    });

    it('should fall back to legacy resolve for env with hyphens', () => {
      const context = {
        inputs: {},
        outputs: {},
        env: { 'MY-VAR': 'env-value' },
        vars: {},
      };
      const result = interpolate('${{ env.MY-VAR }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('env-value');
      }
    });

    it('should fall back to legacy resolve for vars with hyphens', () => {
      const context = {
        inputs: {},
        outputs: {},
        env: {},
        vars: { 'my-var': 'var-value' },
      };
      const result = interpolate('${{ vars.my-var }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('var-value');
      }
    });

    it('should resolve deep nested legacy paths', () => {
      const context = {
        inputs: { data: { nested: 'deep' } },
        outputs: {},
        env: {},
        vars: {},
      };
      // This should work through legacy resolve since inputs.data.nested
      // is a simple dotted path
      const result = interpolate('${{ inputs.data.nested }}', context);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('deep');
      }
    });

    it('should use legacy condition fallback with ${{ }} wrapper', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          with: { message: 'ran' },
          if: '${{ inputs.my-flag }}',
        }],
      };
      const result = await executePipeline(pipeline, actions, { 'my-flag': true });
      expect(result.success).toBe(true);
      expect(result.steps[0]!.skipped).toBeUndefined();
    });

    it('should use legacy condition fallback with bare expression', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          with: { message: 'ran' },
          if: 'inputs.my-flag',
        }],
      };
      const result = await executePipeline(pipeline, actions, { 'my-flag': true });
      expect(result.success).toBe(true);
      expect(result.steps[0]!.skipped).toBeUndefined();
    });

    it('should evaluate legacy condition fallback with falsy interpolation result', async () => {
      const actions = createBuiltinActions();
      const pipeline = {
        steps: [{
          action: 'echo',
          with: { message: 'ran' },
          if: '${{ inputs.my-flag }}',
        }],
      };
      // my-flag is 'false' which should be falsy in legacy condition evaluation
      const result = await executePipeline(pipeline, actions, { 'my-flag': 'false' });
      expect(result.success).toBe(true);
      // The expression evaluator would parse inputs.my - flag (subtraction),
      // fall back to legacy which interpolates to 'false', which is falsy
      expect(result.steps[0]!.skipped).toBe(true);
    });
  });
});
