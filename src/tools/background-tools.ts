import { tool, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";

export function createBackgroundTools(
  manager: BackgroundManager,
  _client: unknown
): Record<string, ToolDefinition> {
  return {
    background_task: tool({
      description: `Run agent task in background. Returns task_id immediately; notifies on completion.

Use \`background_output\` to get results. Prompts MUST be in English.`,
      args: {
        description: tool.schema.string().describe("Short task description"),
        prompt: tool.schema.string().describe("Task prompt for the agent"),
        agent: tool.schema.string().describe("Agent to use (explore, librarian)"),
      },
      async execute(args, context) {
        const task = await manager.createTask(
          context.sessionID,
          args.description,
          args.prompt,
          args.agent
        );

        return JSON.stringify({
          task_id: task.id,
          status: task.status,
          description: task.description,
          message: `Background task launched. Use background_output with task_id="${task.id}" to get results.`,
        });
      },
    }),

    background_output: tool({
      description: `Get output from background task. System notifies on completion, so block=true rarely needed.`,
      args: {
        task_id: tool.schema.string().describe("Task ID to get output for"),
        block: tool.schema.boolean().optional().describe("Wait for completion (default: false)"),
        timeout: tool.schema.number().optional().describe("Timeout in ms if blocking"),
      },
      async execute(args) {
        let task = manager.getTask(args.task_id);
        if (!task) {
          return JSON.stringify({ error: `Task ${args.task_id} not found` });
        }

        if (args.block && task.status === "running") {
          task = await manager.waitForTask(args.task_id, args.timeout);
        }

        return JSON.stringify({
          task_id: task.id,
          status: task.status,
          description: task.description,
          result: task.result,
          error: task.error,
          duration_ms: task.completedAt ? task.completedAt - task.startedAt : undefined,
        });
      },
    }),

    background_cancel: tool({
      description: `Cancel running background task(s). Use all=true to cancel ALL before final answer.`,
      args: {
        task_id: tool.schema.string().optional().describe("Specific task to cancel"),
        all: tool.schema.boolean().optional().describe("Cancel all running tasks"),
      },
      async execute(args, context) {
        if (args.all) {
          const count = manager.cancelAllTasks(context.sessionID);
          return JSON.stringify({ cancelled: count, message: `Cancelled ${count} background tasks` });
        }

        if (args.task_id) {
          const success = manager.cancelTask(args.task_id);
          return JSON.stringify({ cancelled: success ? 1 : 0, task_id: args.task_id });
        }

        return JSON.stringify({ error: "Specify task_id or all=true" });
      },
    }),
  };
}
