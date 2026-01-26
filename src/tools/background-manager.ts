import type { PluginInput } from "@opencode-ai/plugin";
import type { BackgroundTaskConfig } from "../config";
import type { ModelResolutionService } from "./model-resolution-service";
import { log } from "../shared/logger";
import { getAgent, getCanonicalName, isAlias } from "../agents";

export interface BackgroundTask {
  id: string;
  status: "running" | "completed" | "failed" | "cancelled";
  description: string;
  parentSessionID: string;
  sessionID?: string;
  result?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface ModelConfig {
  providerID: string;
  modelID: string;
}

export interface BackgroundManager {
  createTask: (
    parentSessionID: string,
    description: string,
    prompt: string,
    agent: string,
    model?: ModelConfig
  ) => Promise<BackgroundTask>;
  getTask: (taskId: string) => BackgroundTask | undefined;
  getTasksByParentSession: (sessionID: string) => BackgroundTask[];
  cancelTask: (taskId: string) => boolean;
  cancelAllTasks: (parentSessionID?: string) => number;
  waitForTask: (taskId: string, timeoutMs?: number) => Promise<BackgroundTask>;
  getParentSessionModel: (parentSessionID: string) => Promise<ModelConfig | undefined>;
}

let taskCounter = 0;

/**
 * Generate a compact, unique task ID
 * Format: bg_{timestamp_base36}_{counter_base36}
 * Base36 encoding uses 0-9 and a-z for compact representation
 */
function generateTaskId(): string {
  taskCounter++;
  return `bg_${Date.now().toString(36)}_${taskCounter.toString(36)}`;
}

export function createBackgroundManager(
  ctx: PluginInput,
  config?: BackgroundTaskConfig,
  modelService?: ModelResolutionService
): BackgroundManager {
  const tasks = new Map<string, BackgroundTask>();
  const defaultConcurrency = config?.defaultConcurrency ?? 5;

  // Cache for parent session models to avoid repeated API calls
  const modelCache = new Map<string, ModelConfig>();

  // Cleanup old completed tasks to prevent memory leak
  // Removes tasks older than 1 hour that are no longer running
  const TASK_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
  const cleanupOldTasks = (): void => {
    const now = Date.now();
    for (const [id, task] of tasks) {
      if (task.status !== "running" && task.completedAt) {
        if (now - task.completedAt > TASK_MAX_AGE_MS) {
          tasks.delete(id);
          log(`Cleaned up old task`, { taskId: id });
        }
      }
    }
  };

  // Run cleanup periodically (every 10 minutes)
  const cleanupInterval = setInterval(cleanupOldTasks, 10 * 60 * 1000);
  // Prevent interval from keeping Node.js alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const getRunningCount = (parentSessionID?: string): number => {
    let count = 0;
    for (const task of tasks.values()) {
      if (task.status === "running") {
        if (!parentSessionID || task.parentSessionID === parentSessionID) {
          count++;
        }
      }
    }
    return count;
  };

  /**
   * Get the model configuration from the parent session
   * This allows subagents to inherit the same provider/model as the main session
   */
  const getParentSessionModel = async (parentSessionID: string): Promise<ModelConfig | undefined> => {
    // Check cache first
    if (modelCache.has(parentSessionID)) {
      return modelCache.get(parentSessionID);
    }

    try {
      // Get messages from session - assistant messages contain providerID and modelID
      const messagesResp = await ctx.client.session.messages({
        path: { id: parentSessionID },
        query: { directory: ctx.directory },
      });

      const messages = messagesResp.data as Array<{
        info: {
          role: string;
          providerID?: string;
          modelID?: string;
        };
      }> | undefined;

      // Find the most recent assistant message (it has model info)
      const assistantMsg = messages?.find(m => m.info.role === "assistant" && m.info.providerID && m.info.modelID);
      
      if (assistantMsg?.info.providerID && assistantMsg?.info.modelID) {
        const model: ModelConfig = {
          providerID: assistantMsg.info.providerID,
          modelID: assistantMsg.info.modelID,
        };
        modelCache.set(parentSessionID, model);
        log(`Got parent session model from messages`, { parentSessionID, ...model });
        return model;
      }

      log(`Parent session has no assistant messages with model info`, { parentSessionID });
      return undefined;
    } catch (err) {
      log(`Failed to get parent session model`, { parentSessionID, error: String(err) });
      return undefined;
    }
  };

  const createTask = async (
    parentSessionID: string,
    description: string,
    prompt: string,
    agent: string,
    model?: ModelConfig
  ): Promise<BackgroundTask> => {
    const runningCount = getRunningCount();
    if (runningCount >= defaultConcurrency) {
      throw new Error(`Max concurrent tasks (${defaultConcurrency}) reached. Wait for some to complete.`);
    }

    const taskId = generateTaskId();
    const task: BackgroundTask = {
      id: taskId,
      status: "running",
      description,
      parentSessionID,
      startedAt: Date.now(),
    };

    tasks.set(taskId, task);

    log(`Background task created`, { taskId, description, agent });

    // Resolve model: explicit model > tier mapping > parent session model
    const parentModel = model || await getParentSessionModel(parentSessionID);
    const resolvedModel = modelService
      ? modelService.resolveModelForAgent(agent, parentModel)
      : parentModel;
    
    if (resolvedModel && resolvedModel !== parentModel) {
      log(`[background-manager] Using tier-mapped model for ${agent}`, {
        providerID: resolvedModel.providerID,
        modelID: resolvedModel.modelID,
      });
    }

    (async () => {
      try {
        const sessionResp = await ctx.client.session.create({
          body: {
            parentID: parentSessionID,
            title: `${agent}: ${description}`,
          },
          query: { directory: ctx.directory },
        });

        const sessionID = (sessionResp.data as { id?: string })?.id ?? (sessionResp as { id?: string }).id;
        if (!sessionID) throw new Error("Failed to create session");

        task.sessionID = sessionID;

        // Apply OMCO-002: Inject agent system prompt
        const canonicalName = isAlias(agent) ? getCanonicalName(agent) : agent;
        const agentDef = getAgent(canonicalName);
        const systemPrompt = agentDef?.systemPrompt || "";
        const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

        // Build prompt body with optional model
        const promptBody: {
          parts: Array<{ type: "text"; text: string }>;
          model?: { providerID: string; modelID: string };
        } = {
          parts: [{ type: "text" as const, text: fullPrompt }],
        };

        // Include model if available - this ensures subagent uses same provider as parent
        if (resolvedModel) {
          promptBody.model = resolvedModel;
          log(`Using model for subagent`, { taskId, ...resolvedModel });
        }

        let promptResp = await ctx.client.session.prompt({
          path: { id: sessionID },
          body: promptBody,
          query: { directory: ctx.directory },
        });

        let promptData = promptResp.data as {
          info?: {
            role?: string;
            error?: { name: string; data?: { providerID?: string; message?: string } };
          };
          parts?: Array<{ type: string; text?: string }>;
        } | undefined;

        // Check for HTTP-level errors
        if (promptResp.error) {
          throw new Error(`Prompt failed: ${JSON.stringify(promptResp.error)}`);
        }

        // Check for provider/model errors - retry with fallback if tier-mapped model failed
        if (promptData?.info?.error) {
          const err = promptData.info.error;
          const isModelError = err.name === "ProviderModelNotFoundError" || 
                               err.name === "ProviderNotFoundError" ||
                               err.name?.includes("Model") ||
                               err.name?.includes("Provider");
          
          // If model error and we have a different fallback model, retry
          if (isModelError && parentModel && resolvedModel !== parentModel) {
            log(`[background-manager] Model error with tier-mapped model, retrying with parent session model`, {
              taskId,
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
            
            promptData = promptResp.data as typeof promptData;
            
            // Check again for errors after retry
            if (promptResp.error) {
              throw new Error(`Prompt failed after retry: ${JSON.stringify(promptResp.error)}`);
            }
          }
        }
        
        // Check for provider auth errors (401) or other errors after potential retry
        if (promptData?.info?.error) {
          const err = promptData.info.error;
          const errMsg = err.data?.message || err.name || "Unknown error";
          throw new Error(`[${err.name}] ${errMsg}`);
        }

        const result = promptData?.parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n") || "";
        task.result = result;

        task.status = "completed";
        task.completedAt = Date.now();

        log(`Background task completed`, { taskId, duration: task.completedAt - task.startedAt });

        ctx.client.tui.showToast({
          body: {
            title: "Background Task Completed",
            message: `${description.substring(0, 40)}...`,
            variant: "success" as const,
            duration: 3000,
          },
        }).catch((err) => {
          log(`Toast notification failed`, { taskId, error: String(err) });
        });

      } catch (err) {
        task.status = "failed";
        task.error = String(err);
        task.completedAt = Date.now();

        log(`Background task failed`, { taskId, error: task.error });
      }
    })();

    return task;
  };

  const getTask = (taskId: string): BackgroundTask | undefined => {
    return tasks.get(taskId);
  };

  const getTasksByParentSession = (sessionID: string): BackgroundTask[] => {
    const result: BackgroundTask[] = [];
    for (const task of tasks.values()) {
      if (task.parentSessionID === sessionID) {
        result.push(task);
      }
    }
    return result;
  };

  const cancelTask = (taskId: string): boolean => {
    const task = tasks.get(taskId);
    if (!task || task.status !== "running") return false;

    task.status = "cancelled";
    task.completedAt = Date.now();

    // Abort the running session
    if (task.sessionID) {
      ctx.client.session.abort({
        path: { id: task.sessionID },
        query: { directory: ctx.directory },
      }).catch((err) => {
        log(`Failed to abort session for task ${taskId}`, { error: String(err) });
      });
    }

    log(`Background task cancelled`, { taskId });
    return true;
  };

  const cancelAllTasks = (parentSessionID?: string): number => {
    let count = 0;
    for (const task of tasks.values()) {
      if (task.status === "running") {
        if (!parentSessionID || task.parentSessionID === parentSessionID) {
          task.status = "cancelled";
          task.completedAt = Date.now();
          count++;

          // Abort the running session
          if (task.sessionID) {
            ctx.client.session.abort({
              path: { id: task.sessionID },
              query: { directory: ctx.directory },
            }).catch((err) => {
              log(`Failed to abort session for task ${task.id}`, { error: String(err) });
            });
          }
        }
      }
    }
    log(`Cancelled ${count} background tasks`, { parentSessionID });
    return count;
  };

  const waitForTask = async (taskId: string, timeoutMs = 120000): Promise<BackgroundTask> => {
    const task = tasks.get(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== "running") return task;

    const startTime = Date.now();
    while (task.status === "running") {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Task ${taskId} timed out after ${timeoutMs}ms`);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return task;
  };

  return {
    createTask,
    getTask,
    getTasksByParentSession,
    cancelTask,
    cancelAllTasks,
    waitForTask,
    getParentSessionModel,
  };
}
