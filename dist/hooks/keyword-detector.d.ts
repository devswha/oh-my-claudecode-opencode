import type { PluginInput } from "@opencode-ai/plugin";
import type { ActiveMode } from "./system-prompt-injector";
export interface KeywordDetectorOptions {
    onModeChange?: (sessionID: string, mode: ActiveMode, task?: string) => void;
}
export declare function createKeywordDetectorHook(ctx: PluginInput, options?: KeywordDetectorOptions): {
    "chat.message": (input: {
        sessionID: string;
        agent?: string;
        model?: {
            providerID: string;
            modelID: string;
        };
        messageID?: string;
    }, output: {
        message: Record<string, unknown>;
        parts: Array<{
            type: string;
            text?: string;
            [key: string]: unknown;
        }>;
    }) => Promise<void>;
};
