/**
 * Remember Tag Processor Hook
 *
 * Processes <remember> tags from Task agent output.
 * Saves to .omc/notepad.md for compaction-resilient memory.
 *
 * Based on oh-my-claude-sisyphus post-tool-use hook.
 *
 * Tag formats:
 * - <remember>content</remember> → Working Memory (auto-pruned after 7 days)
 * - <remember priority>content</remember> → Priority Context (always loaded)
 */

import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";
import { processRememberTags } from "./notepad";

// ============================================================================
// Types
// ============================================================================

export interface RememberTagProcessorOptions {
  /** Only process tags from Task tool output */
  taskToolOnly?: boolean;
  /** Tools to process (if not taskToolOnly) */
  toolNames?: string[];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TOOLS = ["Task", "task", "call_omco_agent"];

// ============================================================================
// Hook Factory
// ============================================================================

/**
 * Create the Remember Tag Processor hook
 */
export function createRememberTagProcessor(
  ctx: PluginInput,
  options: RememberTagProcessorOptions = {}
) {
  const taskToolOnly = options.taskToolOnly ?? true;
  const toolNames = options.toolNames ?? DEFAULT_TOOLS;

  return {
    /**
     * Process tool output for <remember> tags
     */
    "tool.execute.after": async (
      input: {
        tool: string;
        sessionID: string;
        callID: string;
      },
      output: {
        title: string;
        output: string;
        metadata: unknown;
      }
    ): Promise<void> => {
      // Check if we should process this tool
      if (taskToolOnly) {
        if (!toolNames.includes(input.tool)) {
          return;
        }
      }

      // Get tool output
      const result = output.output;
      if (!result) {
        return;
      }

      // Convert result to string
      const content = result;

      // Check for <remember> tags
      if (!content.includes("<remember")) {
        return;
      }

      log(`Processing remember tags from ${input.tool} output`);

      // Process tags
      const { processed, errors } = processRememberTags(ctx.directory, content);

      if (processed > 0) {
        log(`Processed ${processed} remember tags`, { errors });

        // Show toast notification
        ctx.client.tui
          .showToast({
            body: {
              title: "Memory Saved",
              message: `${processed} item(s) saved to notepad`,
              variant: "success" as const,
              duration: 2000,
            },
          })
          .catch(() => {});
      }

      if (errors > 0) {
        log(`Failed to process ${errors} remember tags`);
      }
    },
  };
}

/**
 * Extract and process remember tags from arbitrary content
 */
export function extractRememberTags(content: string): {
  priority: string[];
  working: string[];
} {
  const priority: string[] = [];
  const working: string[] = [];

  // Extract priority tags
  const priorityRegex = /<remember\s+priority>([\s\S]*?)<\/remember>/gi;
  let match;
  while ((match = priorityRegex.exec(content)) !== null) {
    const tagContent = match[1].trim();
    if (tagContent) {
      priority.push(tagContent);
    }
  }

  // Extract regular tags
  const regularRegex = /<remember>(?!priority)([\s\S]*?)<\/remember>/gi;
  while ((match = regularRegex.exec(content)) !== null) {
    const tagContent = match[1].trim();
    if (tagContent) {
      working.push(tagContent);
    }
  }

  return { priority, working };
}

/**
 * Format remember tags for output
 */
export function formatRememberTag(content: string, priority: boolean = false): string {
  if (priority) {
    return `<remember priority>${content}</remember>`;
  }
  return `<remember>${content}</remember>`;
}
