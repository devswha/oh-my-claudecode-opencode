import type { PluginInput } from "@opencode-ai/plugin";
import type { BackgroundManager } from "../tools/background-manager";
export interface TodoContinuationEnforcerOptions {
    backgroundManager?: BackgroundManager;
    /** Countdown seconds before resuming (default: 2) */
    countdownSeconds?: number;
    /** Skip countdown if completion percentage is above this threshold */
    skipCountdownAbovePercent?: number;
    /** Vary countdown based on task complexity */
    adaptiveCountdown?: boolean;
}
export declare function createTodoContinuationEnforcer(ctx: PluginInput, options?: TodoContinuationEnforcerOptions): {
    handler: ({ event }: {
        event: {
            type: string;
            properties?: unknown;
        };
    }) => Promise<void>;
    markRecovering: (sessionID: string) => void;
    markRecoveryComplete: (sessionID: string) => void;
};
