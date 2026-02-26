/**
 * @openworkspace/pipeline
 * YAML pipeline parser and executor for OpenWorkspace.
 */

export type { YamlValue } from './yaml.js';
export { parseYaml, stringifyYaml } from './yaml.js';

export type {
  Step,
  Pipeline,
  ExecutionContext,
  StepResult,
  PipelineResult,
  ActionHandler,
  ActionRegistry,
  ExecutionLog,
} from './executor.js';
export {
  interpolate,
  interpolateDeep,
  createContext,
  executePipeline,
  createBuiltinActions,
} from './executor.js';

export type { ExpressionContext } from './expression.js';
export { evaluateExpression } from './expression.js';

export type { StepContext, StepHandler, ErrorHandler, BuilderResult, PipelineBuilder } from './builder.js';
export { createPipelineBuilder } from './builder.js';
