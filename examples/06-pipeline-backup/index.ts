/**
 * Example: Pipeline Backup
 * Parse and execute a YAML pipeline that backs up email attachments to Drive.
 */
import { readFileSync } from 'node:fs';
import { createHttpClient, createAuthEngine, createFileTokenStore } from '@openworkspace/core';
import { parseYaml, executePipeline, createContext, createBuiltinActions } from '@openworkspace/pipeline';

async function main() {
  // Load the pipeline definition
  const yamlContent = readFileSync(new URL('./pipeline.yaml', import.meta.url), 'utf-8');
  const pipeline = parseYaml(yamlContent);

  console.log(`Pipeline: ${(pipeline as Record<string, unknown>).name}`);
  console.log(`Steps: ${((pipeline as Record<string, unknown>).steps as unknown[]).length}`);

  // Set up auth and HTTP client
  const tokenStore = createFileTokenStore();
  const auth = createAuthEngine({ tokenStore });
  const http = createHttpClient({
    defaultHeaders: { Authorization: `Bearer ${await auth.getAccessToken()}` },
  });

  // Create execution context with built-in actions
  const actions = createBuiltinActions(http);
  const context = createContext({ actions });

  // Execute the pipeline
  const result = await executePipeline(
    (pipeline as Record<string, unknown>).steps as [],
    context,
  );

  if (result.ok) {
    console.log('\nPipeline completed successfully');
    for (const stepResult of result.value) {
      console.log(`  [${stepResult.stepId}] ${stepResult.status}`);
    }
  } else {
    console.error('Pipeline failed:', result.error.message);
  }
}

main().catch(console.error);
