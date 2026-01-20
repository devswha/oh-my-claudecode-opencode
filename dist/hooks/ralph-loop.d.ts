import type { PluginInput } from "@opencode-ai/plugin";
import type { RalphLoopConfig } from "../config";
import type { ActiveMode } from "./system-prompt-injector";
import { type PRD, type UserStory } from "../prd/prd-manager";
export type { PRD, UserStory };
interface RalphLoopState {
    sessionID: string;
    prompt: string;
    iteration: number;
    maxIterations: number;
    completionPromise: string;
    isActive: boolean;
    startedAt: number;
    mode: "ralph-loop" | "ultrawork-ralph";
    prdPath?: string;
}
interface RalphLoopOptions {
    config?: RalphLoopConfig;
    onModeChange?: (sessionID: string, mode: ActiveMode, task?: string) => void;
}
export declare function createRalphLoopHook(ctx: PluginInput, options?: RalphLoopOptions): {
    startLoop: (sessionID: string, prompt: string, opts?: {
        maxIterations?: number;
        mode?: "ralph-loop" | "ultrawork-ralph";
    }) => boolean;
    cancelLoop: (sessionID: string) => boolean;
    getState: (sessionID?: string) => RalphLoopState | null;
    event: (input: {
        event: {
            type: string;
            properties?: unknown;
        };
    }) => Promise<void>;
    readPrd: () => PRD | null;
    writePrd: (prd: PRD) => void;
    checkCompletionInContent: (content: string) => boolean;
};
