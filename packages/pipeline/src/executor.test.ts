import { describe, it, expect, vi } from 'vitest';
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
  });
});
