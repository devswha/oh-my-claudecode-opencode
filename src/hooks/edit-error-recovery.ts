import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";

export interface EditErrorRecoveryOptions {
  enabled?: boolean;
  maxRetries?: number;
}

const EDIT_ERROR_PATTERNS = [
  /old_string.*not.*found/i,
  /no.*match.*found/i,
  /file.*not.*found/i,
  /permission.*denied/i,
  /cannot.*edit/i,
  /edit.*failed/i,
];

interface EditErrorState {
  consecutiveErrors: number;
  lastErrorFile?: string;
  lastErrorType?: string;
}

const sessionErrors = new Map<string, EditErrorState>();

export function createEditErrorRecoveryHook(
  _ctx: PluginInput,
  options: EditErrorRecoveryOptions = {}
) {
  const { enabled = true, maxRetries = 3 } = options;

  function getErrorState(sessionId: string): EditErrorState {
    if (!sessionErrors.has(sessionId)) {
      sessionErrors.set(sessionId, { consecutiveErrors: 0 });
    }
    return sessionErrors.get(sessionId)!;
  }

  function clearErrorState(sessionId: string): void {
    sessionErrors.delete(sessionId);
  }

  return {
    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { title: string; output: string; metadata: any }
    ): Promise<void> => {
      if (!enabled) return;
      if (input.tool !== "Edit" && input.tool !== "edit") return;

      const errorStr = output.output || "";

      const isEditError = EDIT_ERROR_PATTERNS.some(pattern =>
        pattern.test(errorStr)
      );

      const state = getErrorState(input.sessionID);

      if (isEditError) {
        state.consecutiveErrors++;
        state.lastErrorFile = (output.metadata as any)?.file_path as string | undefined;

        // Determine error type
        if (/old_string.*not.*found/i.test(errorStr)) {
          state.lastErrorType = "string_not_found";
        } else if (/file.*not.*found/i.test(errorStr)) {
          state.lastErrorType = "file_not_found";
        } else if (/permission/i.test(errorStr)) {
          state.lastErrorType = "permission_denied";
        } else {
          state.lastErrorType = "unknown";
        }

        log("[edit-error-recovery] Edit error detected", {
          sessionID: input.sessionID,
          consecutiveErrors: state.consecutiveErrors,
          errorType: state.lastErrorType,
          file: state.lastErrorFile,
        });

        if (state.consecutiveErrors >= maxRetries) {
          log("[edit-error-recovery] Max retries reached, suggesting alternative approach", {
            sessionID: input.sessionID,
          });
          // Could integrate with system-prompt-injector for recovery guidance
        }
      } else {
        // Successful edit, clear error state
        if (state.consecutiveErrors > 0) {
          log("[edit-error-recovery] Edit succeeded after errors, clearing state", {
            sessionID: input.sessionID,
          });
          clearErrorState(input.sessionID);
        }
      }
    },
  };
}
