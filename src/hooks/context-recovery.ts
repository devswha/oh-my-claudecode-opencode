import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";

export interface ContextRecoveryOptions {
  enabled?: boolean;
}

const CONTEXT_LIMIT_PATTERNS = [
  /context.*window.*limit/i,
  /token.*limit.*exceeded/i,
  /maximum.*context.*length/i,
  /context.*too.*long/i,
  /prompt.*too.*large/i,
];

export function createContextRecoveryHook(
  _ctx: PluginInput,
  options: ContextRecoveryOptions = {}
) {
  const { enabled = true } = options;

  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { title: string; output: string; metadata: any }
    ): Promise<void> => {
      if (!enabled) return;

      const errorStr = output.output || "";

      const isContextLimitError = CONTEXT_LIMIT_PATTERNS.some(pattern =>
        pattern.test(errorStr)
      );

      if (isContextLimitError) {
        log("[context-recovery] Context limit error detected", {
          sessionID: input.sessionID,
          tool: input.tool,
        });

        // Inject recovery guidance
        // OpenCode doesn't have direct message injection, so we log for now
        // The system-prompt-injector can pick this up on next turn

        log("[context-recovery] Suggested action: Summarize context or split task");
      }
    },
  };
}
