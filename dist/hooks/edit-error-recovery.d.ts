import type { PluginInput } from "@opencode-ai/plugin";
export interface EditErrorRecoveryOptions {
    enabled?: boolean;
    maxRetries?: number;
}
export declare function createEditErrorRecoveryHook(_ctx: PluginInput, options?: EditErrorRecoveryOptions): {
    "tool.execute.after": (input: {
        tool: string;
        sessionID: string;
        callID: string;
    }, output: {
        title: string;
        output: string;
        metadata: any;
    }) => Promise<void>;
};
