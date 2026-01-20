/**
 * Remember Tag Processor Hook
 *
 * Processes <remember> tags from Task agent output.
 * Saves to .sisyphus/notepad.md for compaction-resilient memory.
 *
 * Based on oh-my-claude-sisyphus post-tool-use hook.
 *
 * Tag formats:
 * - <remember>content</remember> → Working Memory (auto-pruned after 7 days)
 * - <remember priority>content</remember> → Priority Context (always loaded)
 */
import type { PluginInput } from "@opencode-ai/plugin";
export interface RememberTagProcessorOptions {
    /** Only process tags from Task tool output */
    taskToolOnly?: boolean;
    /** Tools to process (if not taskToolOnly) */
    toolNames?: string[];
}
/**
 * Create the Remember Tag Processor hook
 */
export declare function createRememberTagProcessor(ctx: PluginInput, options?: RememberTagProcessorOptions): {
    /**
     * Process tool output for <remember> tags
     */
    "tool.execute.after": (input: {
        tool: string;
        sessionID?: string;
        args?: Record<string, unknown>;
    }, output: {
        result?: unknown;
    }) => Promise<void>;
};
/**
 * Extract and process remember tags from arbitrary content
 */
export declare function extractRememberTags(content: string): {
    priority: string[];
    working: string[];
};
/**
 * Format remember tags for output
 */
export declare function formatRememberTag(content: string, priority?: boolean): string;
