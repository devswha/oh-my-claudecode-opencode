import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";

interface RecoveryCallbacks {
  onAbort?: (sessionID: string) => void;
  onRecoveryComplete?: (sessionID: string) => void;
}

const RECOVERABLE_ERRORS = [
  "MessageAbortedError",
  "AbortError",
  "ThinkingBlockError",
  "EmptyMessageError",
];

export function createSessionRecoveryHook(ctx: PluginInput) {
  const callbacks: RecoveryCallbacks = {};

  const setOnAbortCallback = (cb: (sessionID: string) => void) => {
    callbacks.onAbort = cb;
  };

  const setOnRecoveryCompleteCallback = (cb: (sessionID: string) => void) => {
    callbacks.onRecoveryComplete = cb;
  };

  const isRecoverableError = (error: unknown): boolean => {
    if (!error || typeof error !== "object") return false;
    const errorName = (error as { name?: string }).name;
    return RECOVERABLE_ERRORS.includes(errorName || "");
  };

  const handleSessionRecovery = async (messageInfo: {
    sessionID?: string;
    error?: unknown;
  }): Promise<boolean> => {
    const { sessionID, error } = messageInfo;
    if (!sessionID) return false;

    log(`Attempting session recovery`, { sessionID, error: String(error) });

    callbacks.onAbort?.(sessionID);

    try {
      await ctx.client.session.prompt({
        path: { id: sessionID },
        body: {
          parts: [{ type: "text", text: "continue" }],
        },
        query: { directory: ctx.directory },
      });

      log(`Session recovery successful`, { sessionID });
      callbacks.onRecoveryComplete?.(sessionID);
      return true;
    } catch (err) {
      log(`Session recovery failed`, { sessionID, error: String(err) });
      return false;
    }
  };

  return {
    setOnAbortCallback,
    setOnRecoveryCompleteCallback,
    isRecoverableError,
    handleSessionRecovery,
  };
}
