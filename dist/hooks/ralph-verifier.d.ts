import type { PluginInput } from "@opencode-ai/plugin";
export interface RalphVerifierOptions {
    maxVerificationAttempts?: number;
    oracleModel?: string;
    onVerified?: (sessionID: string) => void;
    onRejected?: (sessionID: string, feedback: string) => void;
}
export declare function createRalphVerifierHook(ctx: PluginInput, options?: RalphVerifierOptions): {
    event: (input: {
        event: {
            type: string;
            properties?: unknown;
        };
    }) => Promise<void>;
    isPendingVerification: () => boolean;
    cancelVerification: () => void;
    checkForCompletionClaim: (content: string) => string | null;
    checkForOracleVerdict: (content: string) => {
        approved: boolean;
        feedback: string;
    } | null;
};
