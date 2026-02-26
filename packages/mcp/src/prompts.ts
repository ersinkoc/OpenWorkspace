/**
 * MCP Prompts for OpenWorkspace.
 *
 * Prompts are pre-defined prompt templates that AI agents can use to
 * generate structured interactions. Each prompt declares its arguments
 * and produces a sequence of messages when invoked.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Prompt argument definition.
 */
export type PromptArgument = {
  name: string;
  description: string;
  required?: boolean;
};

/**
 * MCP Prompt message.
 */
export type PromptMessage = {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string };
};

/**
 * Prompt definition.
 */
export type Prompt = {
  name: string;
  description: string;
  arguments?: PromptArgument[];
};

/**
 * Prompt handler: given arguments, produces messages.
 */
export type PromptHandler = (args: Record<string, string>) => PromptMessage[];

/**
 * Prompt registry.
 */
export type PromptRegistry = {
  register(prompt: Prompt, handler: PromptHandler): void;
  list(): Prompt[];
  get(name: string): PromptMessage[] | null;
  getWithArgs(name: string, args: Record<string, string>): PromptMessage[] | null;
};

// ---------------------------------------------------------------------------
// Registry Factory
// ---------------------------------------------------------------------------

/**
 * Creates a new prompt registry.
 *
 * @example
 * ```ts
 * const registry = createPromptRegistry();
 * registry.register(
 *   { name: 'greet', description: 'Greet someone', arguments: [{ name: 'name', description: 'Name', required: true }] },
 *   (args) => [{ role: 'user', content: { type: 'text', text: `Hello, ${args.name}!` } }],
 * );
 * const messages = registry.getWithArgs('greet', { name: 'Alice' });
 * ```
 */
export function createPromptRegistry(): PromptRegistry {
  const prompts = new Map<string, { prompt: Prompt; handler: PromptHandler }>();

  return {
    register(prompt: Prompt, handler: PromptHandler): void {
      prompts.set(prompt.name, { prompt, handler });
    },

    list(): Prompt[] {
      return Array.from(prompts.values()).map((entry) => entry.prompt);
    },

    get(name: string): PromptMessage[] | null {
      const entry = prompts.get(name);
      if (!entry) {
        return null;
      }
      return entry.handler({});
    },

    getWithArgs(name: string, args: Record<string, string>): PromptMessage[] | null {
      const entry = prompts.get(name);
      if (!entry) {
        return null;
      }
      return entry.handler(args);
    },
  };
}

// ---------------------------------------------------------------------------
// Built-in Prompts
// ---------------------------------------------------------------------------

/**
 * Registers all built-in prompts: email-compose, meeting-schedule, file-summary.
 */
export function registerBuiltinPrompts(registry: PromptRegistry): void {
  registerEmailComposePrompt(registry);
  registerMeetingSchedulePrompt(registry);
  registerFileSummaryPrompt(registry);
}

// ---------------------------------------------------------------------------
// email-compose
// ---------------------------------------------------------------------------

function registerEmailComposePrompt(registry: PromptRegistry): void {
  registry.register(
    {
      name: 'email-compose',
      description: 'Compose a professional email',
      arguments: [
        { name: 'to', description: 'Recipient email address', required: true },
        { name: 'subject', description: 'Email subject', required: true },
        { name: 'tone', description: 'Tone: formal, casual, friendly', required: false },
        { name: 'context', description: 'Additional context for the email', required: false },
      ],
    },
    (args: Record<string, string>): PromptMessage[] => {
      const to = args['to'] ?? '';
      const subject = args['subject'] ?? '';
      const tone = args['tone'];
      const context = args['context'];

      let text = `Compose a professional email to ${to} with the subject "${subject}".`;

      if (tone) {
        text += ` Use a ${tone} tone.`;
      }

      if (context) {
        text += `\n\nAdditional context: ${context}`;
      }

      text += '\n\nPlease provide the full email including greeting, body, and sign-off.';

      return [
        {
          role: 'user',
          content: { type: 'text', text },
        },
      ];
    },
  );
}

// ---------------------------------------------------------------------------
// meeting-schedule
// ---------------------------------------------------------------------------

function registerMeetingSchedulePrompt(registry: PromptRegistry): void {
  registry.register(
    {
      name: 'meeting-schedule',
      description: 'Schedule a meeting with context',
      arguments: [
        { name: 'attendees', description: 'Comma-separated attendee emails', required: true },
        { name: 'topic', description: 'Meeting topic', required: true },
        { name: 'duration', description: 'Duration (e.g., 30min, 1h)', required: false },
        { name: 'preferences', description: 'Scheduling preferences', required: false },
      ],
    },
    (args: Record<string, string>): PromptMessage[] => {
      const attendees = args['attendees'] ?? '';
      const topic = args['topic'] ?? '';
      const duration = args['duration'] ?? '30min';
      const preferences = args['preferences'];

      const messages: PromptMessage[] = [];

      // First message: user asks to schedule a meeting
      let userText = `I need to schedule a meeting about "${topic}" with the following attendees: ${attendees}.`;
      userText += ` The meeting should be ${duration} long.`;

      if (preferences) {
        userText += `\n\nScheduling preferences: ${preferences}`;
      }

      messages.push({
        role: 'user',
        content: { type: 'text', text: userText },
      });

      // Second message: assistant acknowledges and outlines the plan
      let assistantText = `I'll help you schedule a meeting about "${topic}". Let me:`;
      assistantText += '\n\n1. Check the calendars of all attendees for availability';
      assistantText += '\n2. Find a suitable time slot';
      assistantText += '\n3. Create the calendar event with all details';
      assistantText += `\n\nAttendees: ${attendees}`;
      assistantText += `\nDuration: ${duration}`;

      if (preferences) {
        assistantText += `\nPreferences: ${preferences}`;
      }

      messages.push({
        role: 'assistant',
        content: { type: 'text', text: assistantText },
      });

      return messages;
    },
  );
}

// ---------------------------------------------------------------------------
// file-summary
// ---------------------------------------------------------------------------

function registerFileSummaryPrompt(registry: PromptRegistry): void {
  registry.register(
    {
      name: 'file-summary',
      description: 'Summarize a Drive file',
      arguments: [
        { name: 'fileId', description: 'Google Drive file ID', required: true },
        { name: 'format', description: 'Summary format: brief, detailed, bullet-points', required: false },
      ],
    },
    (args: Record<string, string>): PromptMessage[] => {
      const fileId = args['fileId'] ?? '';
      const format = args['format'] ?? 'brief';

      let text = `Please read and summarize the Google Drive file with ID "${fileId}".`;

      switch (format) {
        case 'detailed':
          text += ' Provide a detailed summary covering all key points, arguments, and conclusions.';
          break;
        case 'bullet-points':
          text += ' Provide the summary as a concise list of bullet points highlighting the key information.';
          break;
        case 'brief':
        default:
          text += ' Provide a brief summary in 2-3 sentences capturing the main idea.';
          break;
      }

      return [
        {
          role: 'user',
          content: { type: 'text', text },
        },
      ];
    },
  );
}
