import type { PluginInput } from "@opencode-ai/plugin";
export declare function createSessionRecoveryHook(ctx: PluginInput): {
    setOnAbortCallback: (cb: (sessionID: string) => void) => void;
    setOnRecoveryCompleteCallback: (cb: (sessionID: string) => void) => void;
    isRecoverableError: (error: unknown) => boolean;
    handleSessionRecovery: (messageInfo: {
        sessionID?: string;
        error?: unknown;
    }) => Promise<boolean>;
};
