/**
 * Persistent Mode Handler
 *
 * Unified handler for persistent work modes: ultrawork, ralph-loop, and todo-continuation.
 * This module intercepts session.idle events and enforces work continuation based on:
 * 1. Active ralph-loop with incomplete promise
 * 2. Active ultrawork mode with pending todos
 * 3. Any pending todos (general enforcement)
 *
 * Priority order: Ralph Loop > Ultrawork > Todo Continuation
 *
 * Based on oh-my-claude-sisyphus persistent-mode hook.
 */
import type { PluginInput } from "@opencode-ai/plugin";
export interface PersistentModeResult {
    /** Whether to inject a continuation message */
    shouldContinue: boolean;
    /** Message to inject into context */
    message: string;
    /** Which mode triggered the continuation */
    mode: "ralph-loop" | "ultrawork" | "todo-continuation" | "none";
    /** Additional metadata */
    metadata?: {
        todoCount?: number;
        iteration?: number;
        maxIterations?: number;
        reinforcementCount?: number;
        todoContinuationAttempts?: number;
    };
}
export interface PersistentModeOptions {
    /** Maximum todo-continuation attempts before giving up (prevents infinite loops) */
    maxTodoContinuationAttempts?: number;
    /** Whether to inject notepad context */
    injectNotepadContext?: boolean;
    /** Whether to prune old entries on session start */
    pruneOnStart?: boolean;
}
/**
 * Reset todo-continuation attempt counter (call when todos actually change)
 */
export declare function resetTodoContinuationAttempts(sessionId: string): void;
/**
 * Main persistent mode checker
 * Checks all persistent modes in priority order and returns appropriate action
 */
export declare function checkPersistentModes(ctx: PluginInput, sessionId: string, options?: PersistentModeOptions): Promise<PersistentModeResult>;
/**
 * Create the persistent mode hook
 */
export declare function createPersistentModeHook(ctx: PluginInput, options?: PersistentModeOptions): {
    /**
     * Check persistent modes on session.idle
     */
    checkOnIdle: (sessionId: string) => Promise<PersistentModeResult>;
    /**
     * Reset continuation attempts (call when todos change)
     */
    resetAttempts: (sessionId: string) => void;
};
