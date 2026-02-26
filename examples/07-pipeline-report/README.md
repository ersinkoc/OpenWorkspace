# Example: Pipeline Report

YAML pipeline definition for generating a weekly summary report from Calendar and Gmail data.

## Usage

This example is a YAML-only pipeline definition. It can be executed by any pipeline runner
that supports the `@openworkspace/pipeline` format:

```bash
npx openworkspace run pipeline.yaml
```

## What it demonstrates

- Declarative multi-step workflow definition
- Combining data from Calendar and Gmail services
- Using template expressions to pass data between steps
- Generating a Sheets-based report from aggregated data
