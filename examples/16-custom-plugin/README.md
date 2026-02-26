# Example: Custom Plugin

Create a custom OpenWorkspace plugin that integrates with the kernel's plugin system.

## Usage

```bash
npx tsx index.ts
```

## What it demonstrates

- Implementing the `Plugin` interface from `@openworkspace/core`
- Registering commands and tools during plugin setup
- Using the event bus for cross-plugin communication
- Wiring a plugin into the kernel lifecycle
