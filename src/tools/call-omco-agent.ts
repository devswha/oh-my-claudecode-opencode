import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager, ModelConfig } from "./background-manager";
import type { ModelResolutionService } from "./model-resolution-service";
import { getAgent, listAgentNames, getCanonicalName, isAlias } from "../agents";
import { log } from "../shared/logger";
import { resolveCategoryConfig, getAvailableCategories, CATEGORY_DESCRIPTIONS } from "../categories";
import type { ResolvedCategory } from "../categories/resolver";
import type { CategoriesConfig } from "../categories/types";

/**
 * Parse a model string in "provider/model" format to ModelConfig
 */
function parseModelString(model: string): ModelConfig | undefined {
  const parts = model.split("/");
  if (parts.length >= 2) {
    return { providerID: parts[0], modelID: parts.slice(1).join("/") };
  }
  return undefined;
}

export function createCallOmcoAgent(
  ctx: PluginInput,
  manager: BackgroundManager,
  modelService?: ModelResolutionService,
  userCategories?: CategoriesConfig
): ToolDefinition {
  // Generate dynamic agent list for description
  const agentNames = listAgentNames();
  const agentList = agentNames.map(name => {
    const agent = getAgent(name);
    const aliasNote = isAlias(name) ? ` (alias for ${getCanonicalName(name)})` : "";
    return `- ${name}${aliasNote}: ${agent?.description || "Agent"}`;
  }).join("\n");

  // Generate category list for description
  const categoryNames = getAvailableCategories(userCategories);
  const categoryList = categoryNames.map(name => {
    const desc = CATEGORY_DESCRIPTIONS[name] || userCategories?.[name]?.description || "Category";
    return `- ${name}: ${desc}`;
  }).join("\n");

  return tool({
    description: `Spawn specialized agent for delegation. run_in_background REQUIRED (true=async with task_id, false=sync).

Available agents:
${agentList}

Available categories:
${categoryList}

Prompts MUST be in English. Use \`background_output\` for async results.`,
    args: {
      description: tool.schema.string().describe("Short description of task"),
      prompt: tool.schema.string().describe("Task prompt"),
      subagent_type: tool.schema
        .string()
        .optional()
        .describe(`Agent type to spawn. Available: ${agentNames.join(", ")}`),
      category: tool.schema
        .string()
        .optional()
        .describe(`Category for delegation (e.g., 'quick', 'visual-engineering', 'ultrabrain'). Mutually exclusive with subagent_type.`),
      run_in_background: tool.schema.boolean().describe("Run async (true) or sync (false)"),
      session_id: tool.schema.string().optional().describe("Existing session to continue"),
    },
    async execute(args, context) {
      const { description, prompt, subagent_type, category, run_in_background } = args;

      // OMCO-001: Validate mutually exclusive parameters
      if (subagent_type && category) {
        return JSON.stringify({
          status: "failed",
          error: "subagent_type and category are mutually exclusive. Provide only one.",
        });
      }

      if (!subagent_type && !category) {
        return JSON.stringify({
          status: "failed",
          error: "Either subagent_type or category must be provided.",
        });
      }

      let enhancedPrompt: string;
      let categoryModel: string | undefined;
      let agentTypeForLogging: string;

      if (category) {
        // Category-based delegation
        const resolved: ResolvedCategory | null = resolveCategoryConfig(category, userCategories);
        if (!resolved) {
          return JSON.stringify({
            status: "failed",
            error: `Unknown category: ${category}. Available: ${getAvailableCategories(userCategories).join(", ")}`,
          });
        }

        // Use category prompt append
        enhancedPrompt = resolved.promptAppend
          ? `${resolved.promptAppend}\n\n---\n\n${prompt}`
          : prompt;

        categoryModel = resolved.model;
        agentTypeForLogging = `category:${category}`;

        log(`[call-omco-agent] Using category delegation`, { category, model: categoryModel });
      } else {
        // Agent-based delegation (existing flow)
        const agent = getAgent(subagent_type!);
        if (!agent) {
          return JSON.stringify({
            status: "failed",
            error: `Unknown agent type: ${subagent_type}. Available: ${listAgentNames().join(", ")}`,
          });
        }

        // OMCO-002: Inject agent system prompt
        enhancedPrompt = `${agent.systemPrompt}\n\n---\n\n${prompt}`;
        agentTypeForLogging = subagent_type!;
      }

      // OMCO-003: Resolve model
      // For categories: use model directly from category config (zero-config)
      // For agents: use tier mapping or parent session model
      const parentModel = await manager.getParentSessionModel(context.sessionID);
      let resolvedModel: ModelConfig | undefined = parentModel;

      if (category && categoryModel) {
        // Category-based delegation: parse model string directly
        const parsed = parseModelString(categoryModel);
        if (parsed) {
          resolvedModel = parsed;
          log(`[call-omco-agent] Using category model`, {
            category,
            providerID: parsed.providerID,
            modelID: parsed.modelID,
          });
        } else {
          // Model string is not in provider/model format - fall back to parent
          log(`[call-omco-agent] Category model "${categoryModel}" not in provider/model format, using parent model`);
        }
      } else if (subagent_type && modelService) {
        // Agent-based delegation: use tier mapping
        try {
          resolvedModel = modelService.resolveModelForAgentOrThrow(subagent_type, parentModel);

          if (resolvedModel && resolvedModel !== parentModel) {
            log(`[call-omco-agent] Using tier-mapped model for ${subagent_type}`, {
              providerID: resolvedModel.providerID,
              modelID: resolvedModel.modelID,
            });
          }
        } catch (err) {
          // Model resolution failed - return actionable error to user
          return JSON.stringify({
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (run_in_background) {
        const task = await manager.createTask(
          context.sessionID,
          description,
          enhancedPrompt,
          agentTypeForLogging,
          resolvedModel
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
            title: `${agentTypeForLogging}: ${description}`,
          },
          query: { directory: ctx.directory },
        });

        const sessionID = (sessionResp.data as { id?: string })?.id ?? (sessionResp as { id?: string }).id;
        if (!sessionID) throw new Error("Failed to create session");

        // Build prompt body with resolved model if available
        const promptBody: {
          parts: Array<{ type: "text"; text: string }>;
          model?: ModelConfig;
        } = {
          parts: [{ type: "text" as const, text: enhancedPrompt }],
        };

        if (resolvedModel) {
          promptBody.model = resolvedModel;
          log(`Using resolved model for sync agent call`, { agentType: agentTypeForLogging, ...resolvedModel });
        }

        let promptResp = await ctx.client.session.prompt({
          path: { id: sessionID },
          body: promptBody,
          query: { directory: ctx.directory },
        });

        // Check for HTTP-level errors
        if (promptResp.error) {
          return JSON.stringify({
            session_id: sessionID,
            status: "failed",
            error: `Prompt failed: ${JSON.stringify(promptResp.error)}`,
          });
        }

        let promptData = promptResp.data as {
          info?: {
            role?: string;
            error?: { name: string; data?: { providerID?: string; message?: string } };
          };
          parts?: Array<{ type: string; text?: string }>;
        } | undefined;

        // Check for provider/model errors - retry with fallback if tier-mapped model failed
        if (promptData?.info?.error) {
          const err = promptData.info.error;
          const isModelError = err.name === "ProviderModelNotFoundError" || 
                               err.name === "ProviderNotFoundError" ||
                               err.name?.includes("Model") ||
                               err.name?.includes("Provider");
          
          // If model error and we have a different fallback model, retry
          if (isModelError && parentModel && resolvedModel !== parentModel) {
            log(`[call-omco-agent] Model error with tier-mapped model, retrying with parent session model`, {
              error: err.name,
              failedModel: resolvedModel,
              fallbackModel: parentModel,
            });
            
            // Retry with parent session model
            promptBody.model = parentModel;
            promptResp = await ctx.client.session.prompt({
              path: { id: sessionID },
              body: promptBody,
              query: { directory: ctx.directory },
            });
            
            // Check again for HTTP errors
            if (promptResp.error) {
              return JSON.stringify({
                session_id: sessionID,
                status: "failed",
                error: `Prompt failed after retry: ${JSON.stringify(promptResp.error)}`,
              });
            }
            
            promptData = promptResp.data as typeof promptData;
          }
        }

        // Check for provider auth errors (401) or other errors after potential retry
        if (promptData?.info?.error) {
          const err = promptData.info.error;
          const errMsg = err.data?.message || err.name || "Unknown error";
          return JSON.stringify({
            session_id: sessionID,
            status: "failed",
            error: `[${err.name}] ${errMsg}`,
          });
        }

        const result = promptData?.parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
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
