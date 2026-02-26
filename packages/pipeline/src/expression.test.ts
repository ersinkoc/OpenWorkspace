import { describe, it, expect } from 'vitest';
import { evaluateExpression } from './expression.js';
import type { ExpressionContext } from './expression.js';

function makeContext(overrides?: Partial<ExpressionContext>): ExpressionContext {
  return {
    inputs: {},
    outputs: {},
    steps: {},
    env: {},
    vars: {},
    ...overrides,
  };
}

describe('evaluateExpression', () => {
  describe('variable access', () => {
    it('should access inputs', () => {
      const ctx = makeContext({ inputs: { name: 'Alice' } });
      expect(evaluateExpression('inputs.name', ctx)).toBe('Alice');
    });

    it('should access outputs', () => {
      const ctx = makeContext({ outputs: { result: 42 } });
      expect(evaluateExpression('outputs.result', ctx)).toBe(42);
    });

    it('should access steps (alias for outputs)', () => {
      const ctx = makeContext({ steps: { build: { status: 'ok' } } });
      expect(evaluateExpression('steps.build.status', ctx)).toBe('ok');
    });

    it('should access env', () => {
      const ctx = makeContext({ env: { NODE_ENV: 'production' } });
      expect(evaluateExpression('env.NODE_ENV', ctx)).toBe('production');
    });

    it('should access vars', () => {
      const ctx = makeContext({ vars: { counter: 10 } });
      expect(evaluateExpression('vars.counter', ctx)).toBe(10);
    });

    it('should access item', () => {
      const ctx = makeContext({ item: 'hello' });
      expect(evaluateExpression('item', ctx)).toBe('hello');
    });

    it('should access index', () => {
      const ctx = makeContext({ index: 3 });
      expect(evaluateExpression('index', ctx)).toBe(3);
    });

    it('should access item as object with dot notation', () => {
      const ctx = makeContext({ item: { name: 'Bob', age: 30 } });
      expect(evaluateExpression('item.name', ctx)).toBe('Bob');
      expect(evaluateExpression('item.age', ctx)).toBe(30);
    });

    it('should access nested properties', () => {
      const ctx = makeContext({
        inputs: { user: { profile: { name: 'Deep' } } },
      });
      expect(evaluateExpression('inputs.user.profile.name', ctx)).toBe('Deep');
    });

    it('should return undefined for missing nested properties', () => {
      const ctx = makeContext({ inputs: { user: {} } });
      expect(evaluateExpression('inputs.user.profile', ctx)).toBeUndefined();
    });
  });

  describe('literals', () => {
    it('should handle number literals', () => {
      const ctx = makeContext();
      expect(evaluateExpression('42', ctx)).toBe(42);
      expect(evaluateExpression('3.14', ctx)).toBe(3.14);
    });

    it('should handle string literals with single quotes', () => {
      const ctx = makeContext();
      expect(evaluateExpression("'hello'", ctx)).toBe('hello');
    });

    it('should handle string literals with double quotes', () => {
      const ctx = makeContext();
      expect(evaluateExpression('"world"', ctx)).toBe('world');
    });

    it('should handle boolean literals', () => {
      const ctx = makeContext();
      expect(evaluateExpression('true', ctx)).toBe(true);
      expect(evaluateExpression('false', ctx)).toBe(false);
    });

    it('should handle null literal', () => {
      const ctx = makeContext();
      expect(evaluateExpression('null', ctx)).toBe(null);
    });
  });

  describe('arithmetic', () => {
    const ctx = makeContext();

    it('should add numbers', () => {
      expect(evaluateExpression('2 + 3', ctx)).toBe(5);
    });

    it('should subtract numbers', () => {
      expect(evaluateExpression('10 - 4', ctx)).toBe(6);
    });

    it('should multiply numbers', () => {
      expect(evaluateExpression('3 * 7', ctx)).toBe(21);
    });

    it('should divide numbers', () => {
      expect(evaluateExpression('20 / 4', ctx)).toBe(5);
    });

    it('should compute modulo', () => {
      expect(evaluateExpression('17 % 5', ctx)).toBe(2);
    });

    it('should respect operator precedence', () => {
      expect(evaluateExpression('2 + 3 * 4', ctx)).toBe(14);
      expect(evaluateExpression('(2 + 3) * 4', ctx)).toBe(20);
    });

    it('should handle negative numbers', () => {
      expect(evaluateExpression('-5', ctx)).toBe(-5);
      expect(evaluateExpression('10 + -3', ctx)).toBe(7);
    });

    it('should handle chained arithmetic', () => {
      expect(evaluateExpression('1 + 2 + 3 + 4', ctx)).toBe(10);
    });

    it('should handle arithmetic with variables', () => {
      const ctx2 = makeContext({ inputs: { a: 10, b: 3 } });
      expect(evaluateExpression('inputs.a + inputs.b', ctx2)).toBe(13);
      expect(evaluateExpression('inputs.a * inputs.b', ctx2)).toBe(30);
    });
  });

  describe('comparisons', () => {
    const ctx = makeContext();

    it('should compare equal', () => {
      expect(evaluateExpression('1 == 1', ctx)).toBe(true);
      expect(evaluateExpression('1 == 2', ctx)).toBe(false);
      expect(evaluateExpression("'a' == 'a'", ctx)).toBe(true);
    });

    it('should compare not equal', () => {
      expect(evaluateExpression('1 != 2', ctx)).toBe(true);
      expect(evaluateExpression('1 != 1', ctx)).toBe(false);
    });

    it('should compare greater than', () => {
      expect(evaluateExpression('5 > 3', ctx)).toBe(true);
      expect(evaluateExpression('3 > 5', ctx)).toBe(false);
    });

    it('should compare less than', () => {
      expect(evaluateExpression('3 < 5', ctx)).toBe(true);
      expect(evaluateExpression('5 < 3', ctx)).toBe(false);
    });

    it('should compare greater than or equal', () => {
      expect(evaluateExpression('5 >= 5', ctx)).toBe(true);
      expect(evaluateExpression('5 >= 4', ctx)).toBe(true);
      expect(evaluateExpression('4 >= 5', ctx)).toBe(false);
    });

    it('should compare less than or equal', () => {
      expect(evaluateExpression('5 <= 5', ctx)).toBe(true);
      expect(evaluateExpression('4 <= 5', ctx)).toBe(true);
      expect(evaluateExpression('5 <= 4', ctx)).toBe(false);
    });

    it('should compare with null', () => {
      expect(evaluateExpression('null == null', ctx)).toBe(true);
      expect(evaluateExpression('1 != null', ctx)).toBe(true);
    });

    it('should compare variables', () => {
      const ctx2 = makeContext({ inputs: { status: 'active' } });
      expect(evaluateExpression("inputs.status == 'active'", ctx2)).toBe(true);
      expect(evaluateExpression("inputs.status != 'inactive'", ctx2)).toBe(true);
    });
  });

  describe('logical operators', () => {
    const ctx = makeContext();

    it('should evaluate AND', () => {
      expect(evaluateExpression('true && true', ctx)).toBe(true);
      expect(evaluateExpression('true && false', ctx)).toBe(false);
      expect(evaluateExpression('false && true', ctx)).toBe(false);
    });

    it('should evaluate OR', () => {
      expect(evaluateExpression('true || false', ctx)).toBe(true);
      expect(evaluateExpression('false || true', ctx)).toBe(true);
      expect(evaluateExpression('false || false', ctx)).toBe(false);
    });

    it('should evaluate NOT', () => {
      expect(evaluateExpression('!true', ctx)).toBe(false);
      expect(evaluateExpression('!false', ctx)).toBe(true);
    });

    it('should handle short-circuit AND', () => {
      expect(evaluateExpression('false && true', ctx)).toBe(false);
    });

    it('should handle short-circuit OR', () => {
      expect(evaluateExpression('true || false', ctx)).toBe(true);
    });

    it('should combine logical operators', () => {
      expect(evaluateExpression('true && true || false', ctx)).toBe(true);
      expect(evaluateExpression('false || true && true', ctx)).toBe(true);
    });

    it('should combine comparisons with logical operators', () => {
      expect(evaluateExpression('1 > 0 && 2 > 1', ctx)).toBe(true);
      expect(evaluateExpression('1 > 0 && 2 < 1', ctx)).toBe(false);
      expect(evaluateExpression('1 > 0 || 2 < 1', ctx)).toBe(true);
    });
  });

  describe('string concatenation', () => {
    const ctx = makeContext();

    it('should concatenate strings with +', () => {
      expect(evaluateExpression("'hello' + ' ' + 'world'", ctx)).toBe('hello world');
    });

    it('should concatenate string with number', () => {
      expect(evaluateExpression("'count: ' + 42", ctx)).toBe('count: 42');
    });

    it('should concatenate number with string', () => {
      expect(evaluateExpression("42 + ' items'", ctx)).toBe('42 items');
    });

    it('should concatenate variables', () => {
      const ctx2 = makeContext({ inputs: { first: 'John', last: 'Doe' } });
      expect(evaluateExpression("inputs.first + ' ' + inputs.last", ctx2)).toBe('John Doe');
    });
  });

  describe('property access', () => {
    it('should access deep nested properties', () => {
      const ctx = makeContext({
        outputs: {
          api: {
            response: {
              data: {
                items: [1, 2, 3],
              },
            },
          },
        },
      });
      expect(evaluateExpression('outputs.api.response.data.items', ctx)).toEqual([1, 2, 3]);
    });

    it('should return undefined for non-existent property on non-object', () => {
      const ctx = makeContext({ inputs: { value: 42 } });
      expect(evaluateExpression('inputs.value.nope', ctx)).toBeUndefined();
    });
  });

  describe('built-in functions', () => {
    const ctx = makeContext();

    describe('length', () => {
      it('should return string length', () => {
        expect(evaluateExpression("length('hello')", ctx)).toBe(5);
      });

      it('should return array length', () => {
        const ctx2 = makeContext({ inputs: { items: [1, 2, 3] } });
        expect(evaluateExpression('length(inputs.items)', ctx2)).toBe(3);
      });

      it('should throw for non-string/array', () => {
        expect(() => evaluateExpression('length(42)', ctx)).toThrow();
      });
    });

    describe('contains', () => {
      it('should check string contains', () => {
        expect(evaluateExpression("contains('hello world', 'world')", ctx)).toBe(true);
        expect(evaluateExpression("contains('hello world', 'xyz')", ctx)).toBe(false);
      });

      it('should check array contains', () => {
        const ctx2 = makeContext({ inputs: { tags: ['a', 'b', 'c'] } });
        expect(evaluateExpression("contains(inputs.tags, 'b')", ctx2)).toBe(true);
        expect(evaluateExpression("contains(inputs.tags, 'd')", ctx2)).toBe(false);
      });
    });

    describe('startsWith', () => {
      it('should check string starts with', () => {
        expect(evaluateExpression("startsWith('hello', 'hel')", ctx)).toBe(true);
        expect(evaluateExpression("startsWith('hello', 'xyz')", ctx)).toBe(false);
      });
    });

    describe('endsWith', () => {
      it('should check string ends with', () => {
        expect(evaluateExpression("endsWith('hello', 'llo')", ctx)).toBe(true);
        expect(evaluateExpression("endsWith('hello', 'xyz')", ctx)).toBe(false);
      });
    });

    describe('join', () => {
      it('should join array elements', () => {
        const ctx2 = makeContext({ inputs: { items: ['a', 'b', 'c'] } });
        expect(evaluateExpression("join(inputs.items, '-')", ctx2)).toBe('a-b-c');
      });

      it('should join with default comma separator', () => {
        const ctx2 = makeContext({ inputs: { items: [1, 2, 3] } });
        expect(evaluateExpression("join(inputs.items, ',')", ctx2)).toBe('1,2,3');
      });
    });

    describe('toUpper', () => {
      it('should convert to uppercase', () => {
        expect(evaluateExpression("toUpper('hello')", ctx)).toBe('HELLO');
      });

      it('should throw for non-string', () => {
        expect(() => evaluateExpression('toUpper(42)', ctx)).toThrow();
      });
    });

    describe('toLower', () => {
      it('should convert to lowercase', () => {
        expect(evaluateExpression("toLower('HELLO')", ctx)).toBe('hello');
      });

      it('should throw for non-string', () => {
        expect(() => evaluateExpression('toLower(42)', ctx)).toThrow();
      });
    });

    it('should throw for unknown function', () => {
      expect(() => evaluateExpression('unknownFn(1)', ctx)).toThrow('Unknown function');
    });
  });

  describe('ternary expressions', () => {
    const ctx = makeContext();

    it('should evaluate truthy ternary', () => {
      expect(evaluateExpression("true ? 'yes' : 'no'", ctx)).toBe('yes');
    });

    it('should evaluate falsy ternary', () => {
      expect(evaluateExpression("false ? 'yes' : 'no'", ctx)).toBe('no');
    });

    it('should evaluate ternary with comparison', () => {
      expect(evaluateExpression("5 > 3 ? 'big' : 'small'", ctx)).toBe('big');
      expect(evaluateExpression("1 > 3 ? 'big' : 'small'", ctx)).toBe('small');
    });

    it('should evaluate nested ternary', () => {
      expect(evaluateExpression("true ? false ? 'a' : 'b' : 'c'", ctx)).toBe('b');
    });

    it('should evaluate ternary with variables', () => {
      const ctx2 = makeContext({ inputs: { mode: 'debug' } });
      expect(evaluateExpression("inputs.mode == 'debug' ? 'verbose' : 'quiet'", ctx2)).toBe('verbose');
    });
  });

  describe('complex expressions', () => {
    it('should handle comparison with function result', () => {
      const ctx = makeContext({ inputs: { name: 'Alice' } });
      expect(evaluateExpression('length(inputs.name) > 3', ctx)).toBe(true);
    });

    it('should handle logical expression with functions', () => {
      const ctx = makeContext({ inputs: { path: '/api/users' } });
      expect(evaluateExpression(
        "startsWith(inputs.path, '/api') && length(inputs.path) > 5",
        ctx
      )).toBe(true);
    });

    it('should handle arithmetic in ternary', () => {
      const ctx = makeContext({ inputs: { count: 10 } });
      expect(evaluateExpression(
        "inputs.count > 5 ? inputs.count * 2 : inputs.count",
        ctx
      )).toBe(20);
    });

    it('should handle string concat with ternary', () => {
      const ctx = makeContext({ inputs: { active: true } });
      expect(evaluateExpression(
        "'Status: ' + (inputs.active ? 'active' : 'inactive')",
        ctx
      )).toBe('Status: active');
    });

    it('should handle comparisons with null', () => {
      const ctx = makeContext({ inputs: { value: null } });
      expect(evaluateExpression('inputs.value == null', ctx)).toBe(true);
    });

    it('should handle NOT with comparison', () => {
      const ctx = makeContext({ inputs: { value: 5 } });
      expect(evaluateExpression('!(inputs.value > 10)', ctx)).toBe(true);
      expect(evaluateExpression('!(inputs.value > 3)', ctx)).toBe(false);
    });

    it('should handle multiple operators together', () => {
      const ctx = makeContext({ inputs: { a: 10, b: 20 } });
      expect(evaluateExpression(
        '(inputs.a + inputs.b) * 2 == 60',
        ctx
      )).toBe(true);
    });

    it('should handle forEach context variables', () => {
      const ctx = makeContext({
        item: { name: 'test', value: 42 },
        index: 2,
      });
      expect(evaluateExpression('item.name', ctx)).toBe('test');
      expect(evaluateExpression('item.value', ctx)).toBe(42);
      expect(evaluateExpression('index', ctx)).toBe(2);
      expect(evaluateExpression('index > 0', ctx)).toBe(true);
    });
  });

  describe('error cases', () => {
    const ctx = makeContext();

    it('should throw on empty expression', () => {
      expect(() => evaluateExpression('', ctx)).toThrow('Empty expression');
    });

    it('should throw on whitespace-only expression', () => {
      expect(() => evaluateExpression('   ', ctx)).toThrow('Empty expression');
    });

    it('should throw on unknown variable', () => {
      expect(() => evaluateExpression('unknown', ctx)).toThrow('Unknown variable');
    });

    it('should throw on unterminated string', () => {
      expect(() => evaluateExpression("'unterminated", ctx)).toThrow('Unterminated string');
    });

    it('should throw on unexpected token', () => {
      expect(() => evaluateExpression('1 + + +', ctx)).toThrow();
    });

    it('should throw on unexpected character', () => {
      expect(() => evaluateExpression('1 @ 2', ctx)).toThrow('Unexpected character');
    });

    it('should throw on incomplete ternary', () => {
      expect(() => evaluateExpression('true ? 1', ctx)).toThrow();
    });
  });

  describe('parentheses', () => {
    const ctx = makeContext();

    it('should group expressions', () => {
      expect(evaluateExpression('(1 + 2) * 3', ctx)).toBe(9);
    });

    it('should handle nested parentheses', () => {
      expect(evaluateExpression('((1 + 2) * (3 + 4))', ctx)).toBe(21);
    });

    it('should handle parenthesized logical expressions', () => {
      expect(evaluateExpression('(true || false) && true', ctx)).toBe(true);
    });
  });

  describe('array indexing', () => {
    const emptyContext = makeContext();

    it('accesses array element by numeric index', () => {
      const ctx = { ...emptyContext, inputs: { items: ['a', 'b', 'c'] } };
      expect(evaluateExpression('inputs.items[0]', ctx)).toBe('a');
      expect(evaluateExpression('inputs.items[2]', ctx)).toBe('c');
    });

    it('accesses object property by string key', () => {
      const ctx = { ...emptyContext, inputs: { data: { name: 'test', count: 42 } } };
      expect(evaluateExpression("inputs.data['name']", ctx)).toBe('test');
    });

    it('accesses with computed index from variable', () => {
      const ctx = { ...emptyContext, inputs: { items: ['x', 'y', 'z'] }, vars: { idx: 1 } };
      expect(evaluateExpression('inputs.items[vars.idx]', ctx)).toBe('y');
    });

    it('chains array and property access', () => {
      const ctx = { ...emptyContext, inputs: { users: [{ name: 'Alice' }, { name: 'Bob' }] } };
      expect(evaluateExpression('inputs.users[0].name', ctx)).toBe('Alice');
      expect(evaluateExpression('inputs.users[1].name', ctx)).toBe('Bob');
    });

    it('returns undefined for out-of-bounds index', () => {
      const ctx = { ...emptyContext, inputs: { items: ['a'] } };
      expect(evaluateExpression('inputs.items[5]', ctx)).toBeUndefined();
    });

    it('supports negative-like expression in index', () => {
      const ctx = { ...emptyContext, inputs: { items: ['a', 'b', 'c'] } };
      expect(evaluateExpression('inputs.items[2 - 1]', ctx)).toBe('b');
    });
  });
});
