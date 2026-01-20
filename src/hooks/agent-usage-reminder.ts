import type { PluginInput } from "@opencode-ai/plugin";

const SEARCH_TOOLS = ["grep", "glob", "read", "webfetch"];

const REMINDER_MESSAGE = `
[Agent Usage Reminder]

You called a search/fetch tool directly without leveraging specialized agents.

RECOMMENDED: Use background_task with explore/librarian agents for better results:

\`\`\`
// Parallel exploration - fire multiple agents simultaneously
background_task(agent="explore", prompt="Find all files matching pattern X")
background_task(agent="explore", prompt="Search for implementation of Y") 
background_task(agent="librarian", prompt="Lookup documentation for Z")

// Then continue your work while they run in background
// System will notify you when each completes
\`\`\`

WHY:
- Agents can perform deeper, more thorough searches
- Background tasks run in parallel, saving time
- Specialized agents have domain expertise
- Reduces context window usage in main session

ALWAYS prefer: Multiple parallel background_task calls > Direct tool calls
`;

export function createAgentUsageReminderHook(_ctx: PluginInput) {
  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID?: string },
      output: { output?: string }
    ): Promise<void> => {
      if (!SEARCH_TOOLS.includes(input.tool)) return;

      if (typeof output.output === "string") {
        output.output = output.output + REMINDER_MESSAGE;
      }
    },
  };
}
