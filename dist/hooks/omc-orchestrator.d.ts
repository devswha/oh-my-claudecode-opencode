import type { PluginInput } from "@opencode-ai/plugin";
export interface OmcOrchestratorOptions {
    delegationEnforcement?: 'strict' | 'warn' | 'off';
    auditLogEnabled?: boolean;
}
export declare function createOmcOrchestratorHook(ctx: PluginInput, options?: OmcOrchestratorOptions): {
    "tool.execute.before": (input: {
        tool: string;
        sessionID: string;
        callID: string;
    }, output: {
        args: Record<string, unknown>;
    }) => Promise<void>;
};
