import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";

export function createCallOmoAgent(ctx: PluginInput, manager: BackgroundManager): ToolDefinition {
  return tool({
    description: `Spawn explore/librarian agent. run_in_background REQUIRED (true=async with task_id, false=sync).

Available: - explore: Specialized agent for explore tasks
- librarian: Specialized agent for librarian tasks

Prompts MUST be in English. Use \`background_output\` for async results.`,
    args: {
      description: tool.schema.string().describe("Short description of task"),
      prompt: tool.schema.string().describe("Task prompt"),
      subagent_type: tool.schema
        .enum(["explore", "librarian"])
        .describe("Agent type to spawn"),
      run_in_background: tool.schema.boolean().describe("Run async (true) or sync (false)"),
      session_id: tool.schema.string().optional().describe("Existing session to continue"),
    },
    async execute(args, context) {
      const { description, prompt, subagent_type, run_in_background } = args;

      if (run_in_background) {
        const task = await manager.createTask(
          context.sessionID,
          description,
          prompt,
          subagent_type
        );

        return JSON.stringify({
          task_id: task.id,
          session_id: task.sessionID,
          status: "running",
          message: `Background agent task launched. Use background_output with task_id="${task.id}" to get results.`,
        });
      }

      try {
        const sessionResp = await ctx.client.session.create({
          body: {
            parentID: context.sessionID,
            title: `${subagent_type}: ${description}`,
          },
          query: { directory: ctx.directory },
        });

        const sessionID = (sessionResp.data as { id?: string })?.id ?? (sessionResp as { id?: string }).id;
        if (!sessionID) throw new Error("Failed to create session");

        await ctx.client.session.prompt({
          path: { id: sessionID },
          body: {
            parts: [{ type: "text", text: prompt }],
          },
          query: { directory: ctx.directory },
        });

        const messagesResp = await ctx.client.session.messages({
          path: { id: sessionID },
        });

        const messages = (messagesResp.data ?? []) as Array<{
          info?: { role?: string };
          parts?: Array<{ type: string; text?: string }>;
        }>;

        const lastAssistant = [...messages].reverse().find(m => m.info?.role === "assistant");
        const result = lastAssistant?.parts
          ?.filter(p => p.type === "text" && p.text)
          .map(p => p.text)
          .join("\n") || "";

        return JSON.stringify({
          session_id: sessionID,
          status: "completed",
          result,
        });
      } catch (err) {
        return JSON.stringify({
          status: "failed",
          error: String(err),
        });
      }
    },
  });
}
