import type { PluginInput } from "@opencode-ai/plugin";
export declare function createAgentUsageReminderHook(_ctx: PluginInput): {
    "tool.execute.after": (input: {
        tool: string;
        sessionID?: string;
    }, output: {
        output?: string;
    }) => Promise<void>;
};
