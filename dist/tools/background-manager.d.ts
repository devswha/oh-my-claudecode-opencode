import type { PluginInput } from "@opencode-ai/plugin";
import type { BackgroundTaskConfig } from "../config";
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
    createTask: (parentSessionID: string, description: string, prompt: string, agent: string) => Promise<BackgroundTask>;
    getTask: (taskId: string) => BackgroundTask | undefined;
    getTasksByParentSession: (sessionID: string) => BackgroundTask[];
    cancelTask: (taskId: string) => boolean;
    cancelAllTasks: (parentSessionID?: string) => number;
    waitForTask: (taskId: string, timeoutMs?: number) => Promise<BackgroundTask>;
}
export declare function createBackgroundManager(ctx: PluginInput, config?: BackgroundTaskConfig): BackgroundManager;
