import type { PluginInput } from "@opencode-ai/plugin";
import type { BackgroundTaskConfig } from "../config";
import { log } from "../shared/logger";

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

export interface BackgroundManager {
  createTask: (
    parentSessionID: string,
    description: string,
    prompt: string,
    agent: string
  ) => Promise<BackgroundTask>;
  getTask: (taskId: string) => BackgroundTask | undefined;
  getTasksByParentSession: (sessionID: string) => BackgroundTask[];
  cancelTask: (taskId: string) => boolean;
  cancelAllTasks: (parentSessionID?: string) => number;
  waitForTask: (taskId: string, timeoutMs?: number) => Promise<BackgroundTask>;
}

let taskCounter = 0;

function generateTaskId(): string {
  taskCounter++;
  return `bg_${Date.now().toString(36)}_${taskCounter.toString(36)}`;
}

export function createBackgroundManager(
  ctx: PluginInput,
  config?: BackgroundTaskConfig
): BackgroundManager {
  const tasks = new Map<string, BackgroundTask>();
  const defaultConcurrency = config?.defaultConcurrency ?? 5;

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

  const createTask = async (
    parentSessionID: string,
    description: string,
    prompt: string,
    agent: string
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

        await ctx.client.session.prompt({
          path: { id: sessionID },
          body: {
            parts: [{ type: "text", text: prompt }],
          },
          query: { directory: ctx.directory },
        });

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
        }).catch(() => {});

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
  };
}
