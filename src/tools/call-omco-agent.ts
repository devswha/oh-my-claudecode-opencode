import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";
import { getAgent, listAgentNames, getCanonicalName, isAlias } from "../agents";

export function createCallOmcoAgent(ctx: PluginInput, manager: BackgroundManager): ToolDefinition {
  // Generate dynamic agent list for description
  const agentNames = listAgentNames();
  const agentList = agentNames.map(name => {
    const agent = getAgent(name);
    const aliasNote = isAlias(name) ? ` (alias for ${getCanonicalName(name)})` : "";
    return `- ${name}${aliasNote}: ${agent?.description || "Agent"}`;
  }).join("\n");

  return tool({
    description: `Spawn specialized agent for delegation. run_in_background REQUIRED (true=async with task_id, false=sync).

Available agents:
${agentList}

Prompts MUST be in English. Use \`background_output\` for async results.`,
    args: {
      description: tool.schema.string().describe("Short description of task"),
      prompt: tool.schema.string().describe("Task prompt"),
      subagent_type: tool.schema
        .string()
        .describe(`Agent type to spawn. Available: ${agentNames.join(", ")}`),
      run_in_background: tool.schema.boolean().describe("Run async (true) or sync (false)"),
      session_id: tool.schema.string().optional().describe("Existing session to continue"),
    },
    async execute(args, context) {
      const { description, prompt, subagent_type, run_in_background } = args;

      // OMCO-001: Validate agent exists
      const agent = getAgent(subagent_type);
      if (!agent) {
        return JSON.stringify({
          status: "failed",
          error: `Unknown agent type: ${subagent_type}. Available: ${listAgentNames().join(", ")}`,
        });
      }

      // OMCO-003: Model tier resolution
      // Note: When SDK supports model parameter, we can use agent.model here
      // For now, the SDK will use default model tier based on session configuration

      // OMCO-002: Inject agent system prompt
      const enhancedPrompt = `${agent.systemPrompt}\n\n---\n\n${prompt}`;

      if (run_in_background) {
        const task = await manager.createTask(
          context.sessionID,
          description,
          enhancedPrompt,
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
            parts: [{ type: "text", text: enhancedPrompt }],
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
