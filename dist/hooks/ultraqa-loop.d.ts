import type { PluginInput } from "@opencode-ai/plugin";
import { type UltraQAState } from "../state/ultraqa-state";
export interface UltraQALoopOptions {
    config?: {
        enabled?: boolean;
        maxIterations?: number;
        buildCommand?: string;
        testCommand?: string;
        lintCommand?: string;
    };
    onCycleComplete?: (sessionId: string, state: UltraQAState) => void;
}
export declare function createUltraQALoopHook(ctx: PluginInput, options?: UltraQALoopOptions): {
    startUltraQA: (sessionId: string, goal: string) => void;
    cancelUltraQA: (sessionId: string) => void;
    updateCycle: (sessionId: string, results: {
        build?: "pass" | "fail";
        lint?: "pass" | "fail";
        test?: "pass" | "fail";
    }) => void;
    getState: (sessionId: string) => UltraQAState | undefined;
    isActive: (sessionId: string) => boolean;
    getQAPrompt: (state: UltraQAState) => string;
    "chat.message": (input: {
        sessionID: string;
    }, output: {
        parts: Array<{
            type: string;
            text?: string;
        }>;
    }) => Promise<void>;
    event: (input: {
        event: {
            type: string;
            properties?: unknown;
        };
    }) => Promise<void>;
};
