import type { PluginInput } from "@opencode-ai/plugin";
export type ActiveMode = "ultrawork" | "ralph-loop" | "ultrawork-ralph" | null;
interface ModeState {
    mode: ActiveMode;
    sessionID: string;
    startedAt: number;
    task?: string;
}
export declare function createSystemPromptInjector(_ctx: PluginInput): {
    setMode: (sessionID: string, mode: ActiveMode, task?: string) => void;
    getMode: (sessionID: string) => ModeState | undefined;
    clearMode: (sessionID: string) => void;
    getSystemPromptForMode: (mode: ActiveMode) => string | null;
    "experimental.chat.system.transform": (input: {
        sessionID: string;
    }, output: {
        system: string[];
    }) => Promise<void>;
};
export {};
