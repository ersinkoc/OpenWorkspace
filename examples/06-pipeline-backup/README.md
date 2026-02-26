# Example: Pipeline Backup

YAML-driven workflow that backs up email attachments to Google Drive.

## Usage

```bash
npx tsx index.ts
```

## What it demonstrates

- Defining a multi-step pipeline in YAML
- Parsing YAML pipeline definitions at runtime
- Executing pipelines with the `@openworkspace/pipeline` executor
- Chaining Gmail search with Drive upload steps
