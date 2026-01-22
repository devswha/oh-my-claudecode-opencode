import type { PluginInput } from "@opencode-ai/plugin";
export interface ContextRecoveryOptions {
    enabled?: boolean;
}
export declare function createContextRecoveryHook(_ctx: PluginInput, options?: ContextRecoveryOptions): {
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
