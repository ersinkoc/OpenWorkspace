import { describe, it, expect, vi } from 'vitest';
import { createPipelineBuilder } from './builder.js';

describe('createPipelineBuilder', () => {
  // ── Basic pipeline ─────────────────────────────────────

  describe('basic pipeline', () => {
    it('single step returns output', async () => {
      const result = await createPipelineBuilder()
        .step('greet', () => 'Hello')
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['greet']).toBe('Hello');
      expect(result.steps).toHaveLength(1);
    });

    it('multiple steps chain correctly', async () => {
      const result = await createPipelineBuilder()
        .step('a', () => 10)
        .step('b', (ctx) => (ctx['a'] as number) * 2)
        .step('c', (ctx) => (ctx['b'] as number) + 5)
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['a']).toBe(10);
      expect(result.outputs['b']).toBe(20);
      expect(result.outputs['c']).toBe(25);
    });

    it('empty pipeline succeeds', async () => {
      const result = await createPipelineBuilder().run();
      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Step context ───────────────────────────────────────

  describe('step context', () => {
    it('context is empty for first step', async () => {
      let firstContext: Record<string, unknown> = {};
      await createPipelineBuilder()
        .step('first', (ctx) => {
          firstContext = { ...ctx };
          return 'ok';
        })
        .run();

      expect(Object.keys(firstContext)).toHaveLength(0);
    });

    it('context accumulates outputs keyed by step ID', async () => {
      let ctxAtThird: Record<string, unknown> = {};
      await createPipelineBuilder()
        .step('x', () => 1)
        .step('y', () => 2)
        .step('z', (ctx) => {
          ctxAtThird = { ...ctx };
          return 3;
        })
        .run();

      expect(ctxAtThird['x']).toBe(1);
      expect(ctxAtThird['y']).toBe(2);
    });
  });

  // ── Conditional steps (stepIf) ─────────────────────────

  describe('stepIf', () => {
    it('runs step when condition returns true', async () => {
      const result = await createPipelineBuilder()
        .step('flag', () => true)
        .stepIf('guarded', (ctx) => ctx['flag'] === true, () => 'executed')
        .run();

      expect(result.outputs['guarded']).toBe('executed');
    });

    it('skips step when condition returns false', async () => {
      const result = await createPipelineBuilder()
        .step('flag', () => false)
        .stepIf('guarded', (ctx) => ctx['flag'] === true, () => 'executed')
        .run();

      expect(result.outputs['guarded']).toBeUndefined();
      const guardedStep = result.steps.find(s => s.id === 'guarded');
      expect(guardedStep?.skipped).toBe(true);
      expect(guardedStep?.success).toBe(true);
    });

    it('skipped step does not add to context', async () => {
      let ctxAtEnd: Record<string, unknown> = {};
      await createPipelineBuilder()
        .stepIf('skip', () => false, () => 'nope')
        .step('check', (ctx) => {
          ctxAtEnd = { ...ctx };
          return 'ok';
        })
        .run();

      expect(ctxAtEnd['skip']).toBeUndefined();
    });
  });

  // ── Retry (stepWithRetry) ──────────────────────────────

  describe('stepWithRetry', () => {
    it('succeeds on first try', async () => {
      const result = await createPipelineBuilder()
        .stepWithRetry('ok', () => 42, { maxAttempts: 3 })
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['ok']).toBe(42);
      expect(result.steps[0]?.attempts).toBe(1);
    });

    it('retries and eventually succeeds', async () => {
      let attempts = 0;
      const result = await createPipelineBuilder()
        .stepWithRetry('retry', () => {
          attempts++;
          if (attempts < 3) throw new Error('not yet');
          return 'done';
        }, { maxAttempts: 5, delayMs: 1 })
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['retry']).toBe('done');
      expect(result.steps[0]?.attempts).toBe(3);
    });

    it('fails after exhausting all attempts', async () => {
      const result = await createPipelineBuilder()
        .stepWithRetry('fail', () => {
          throw new Error('always fails');
        }, { maxAttempts: 2, delayMs: 1 })
        .run();

      expect(result.success).toBe(false);
      expect(result.steps[0]?.success).toBe(false);
      expect(result.steps[0]?.attempts).toBe(2);
      expect(result.steps[0]?.error).toContain('always fails');
    });

    it('supports exponential backoff', async () => {
      let attempts = 0;
      const result = await createPipelineBuilder()
        .stepWithRetry('exp', () => {
          attempts++;
          if (attempts < 2) throw new Error('retry');
          return 'ok';
        }, { maxAttempts: 3, delayMs: 1, backoff: 'exponential' })
        .run();

      expect(result.success).toBe(true);
      expect(attempts).toBe(2);
    });
  });

  // ── Timeout ────────────────────────────────────────────

  describe('timeout', () => {
    it('step completes within timeout', async () => {
      const result = await createPipelineBuilder()
        .step('fast', () => 'quick')
        .timeout(5000)
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['fast']).toBe('quick');
    });

    it('step exceeds timeout', async () => {
      const result = await createPipelineBuilder()
        .step('slow', () => new Promise((resolve) => setTimeout(resolve, 5000)))
        .timeout(10)
        .run();

      expect(result.success).toBe(false);
      expect(result.steps[0]?.error).toContain('timed out');
    });
  });

  // ── continueOnError ────────────────────────────────────

  describe('continueOnError', () => {
    it('pipeline stops on error by default', async () => {
      const result = await createPipelineBuilder()
        .step('fail', () => { throw new Error('oops'); })
        .step('after', () => 'should not run')
        .run();

      expect(result.success).toBe(false);
      expect(result.steps).toHaveLength(1);
    });

    it('pipeline continues when continueOnError is set', async () => {
      const result = await createPipelineBuilder()
        .step('fail', () => { throw new Error('oops'); })
        .continueOnError()
        .step('after', () => 'ran!')
        .run();

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0]?.success).toBe(false);
      expect(result.steps[1]?.success).toBe(true);
      expect(result.outputs['after']).toBe('ran!');
    });

    it('failed step error is recorded', async () => {
      const result = await createPipelineBuilder()
        .step('err', () => { throw new Error('something broke'); })
        .continueOnError()
        .run();

      expect(result.steps[0]?.error).toBe('something broke');
    });
  });

  // ── onError handler ────────────────────────────────────

  describe('onError handler', () => {
    it('calls error handler when step fails', async () => {
      const errors: Array<{ stepId: string; message: string }> = [];

      await createPipelineBuilder()
        .step('boom', () => { throw new Error('kaboom'); })
        .continueOnError()
        .onError((stepId, error) => {
          errors.push({ stepId, message: error.message });
        })
        .run();

      expect(errors).toHaveLength(1);
      expect(errors[0]?.stepId).toBe('boom');
      expect(errors[0]?.message).toBe('kaboom');
    });

    it('error handler receives correct step ID', async () => {
      const ids: string[] = [];

      await createPipelineBuilder()
        .step('ok', () => 'fine')
        .step('fail1', () => { throw new Error('e1'); })
        .continueOnError()
        .step('fail2', () => { throw new Error('e2'); })
        .continueOnError()
        .onError((stepId) => ids.push(stepId))
        .run();

      expect(ids).toEqual(['fail1', 'fail2']);
    });
  });

  // ── BuilderResult ──────────────────────────────────────

  describe('BuilderResult', () => {
    it('has correct structure on success', async () => {
      const result = await createPipelineBuilder()
        .step('a', () => 1)
        .step('b', () => 2)
        .run();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.steps).toHaveLength(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.outputs['a']).toBe(1);
      expect(result.outputs['b']).toBe(2);
    });

    it('has correct structure on failure', async () => {
      const result = await createPipelineBuilder()
        .step('a', () => 1)
        .step('b', () => { throw new Error('fail'); })
        .step('c', () => 3)
        .run();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Step "b" failed');
      expect(result.steps).toHaveLength(2); // step c never ran
    });

    it('step results have duration', async () => {
      const result = await createPipelineBuilder()
        .step('a', () => 'ok')
        .run();

      expect(result.steps[0]?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Async steps ────────────────────────────────────────

  describe('async steps', () => {
    it('handles async step handlers', async () => {
      const result = await createPipelineBuilder()
        .step('async', async () => {
          await new Promise(r => setTimeout(r, 5));
          return 'resolved';
        })
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['async']).toBe('resolved');
    });

    it('steps execute sequentially', async () => {
      const order: number[] = [];

      await createPipelineBuilder()
        .step('first', async () => {
          await new Promise(r => setTimeout(r, 10));
          order.push(1);
          return 1;
        })
        .step('second', () => {
          order.push(2);
          return 2;
        })
        .run();

      expect(order).toEqual([1, 2]);
    });
  });

  // ── Edge cases ─────────────────────────────────────────

  describe('edge cases', () => {
    it('step returning undefined is handled', async () => {
      const result = await createPipelineBuilder()
        .step('undef', () => undefined)
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['undef']).toBeUndefined();
    });

    it('step returning null is handled', async () => {
      const result = await createPipelineBuilder()
        .step('nil', () => null)
        .run();

      expect(result.success).toBe(true);
      expect(result.outputs['nil']).toBeNull();
    });

    it('step throwing non-Error is caught', async () => {
      const result = await createPipelineBuilder()
        .step('str', () => { throw 'string error'; })
        .run();

      expect(result.success).toBe(false);
      expect(result.steps[0]?.error).toContain('string error');
    });
  });
});
