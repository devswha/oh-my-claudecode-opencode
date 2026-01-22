import type { PluginInput } from "@opencode-ai/plugin";
import { type AutopilotState } from "../state/autopilot-state";
export interface AutopilotHookOptions {
    config?: {
        enabled?: boolean;
        maxPhaseRetries?: number;
        delegationEnforcement?: 'strict' | 'warn' | 'off';
    };
    onPhaseChange?: (sessionId: string, phase: AutopilotState['phase']) => void;
}
export declare function createAutopilotHook(ctx: PluginInput, options?: AutopilotHookOptions): {
    startAutopilot: (sessionId: string, task?: string) => void;
    cancelAutopilot: (sessionId: string) => void;
    getState: (sessionId: string) => AutopilotState | undefined;
    isActive: (sessionId: string) => boolean;
    "chat.message": (input: {
        sessionID: string;
        agent?: string;
    }, output: {
        message: unknown;
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
