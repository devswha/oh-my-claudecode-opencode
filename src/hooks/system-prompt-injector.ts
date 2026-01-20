import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";
import {
  ULTRAWORK_SYSTEM_PROMPT,
  RALPH_LOOP_SYSTEM_PROMPT,
  ULTRAWORK_RALPH_SYSTEM_PROMPT,
} from "../prompts/ultrawork";

export type ActiveMode = "ultrawork" | "ralph-loop" | "ultrawork-ralph" | null;

interface ModeState {
  mode: ActiveMode;
  sessionID: string;
  startedAt: number;
  task?: string;
}

const sessionModes = new Map<string, ModeState>();

export function createSystemPromptInjector(_ctx: PluginInput) {
  const setMode = (sessionID: string, mode: ActiveMode, task?: string): void => {
    if (mode === null) {
      sessionModes.delete(sessionID);
      log(`Mode cleared`, { sessionID });
    } else {
      sessionModes.set(sessionID, {
        mode,
        sessionID,
        startedAt: Date.now(),
        task,
      });
      log(`Mode set`, { sessionID, mode, task: task?.substring(0, 50) });
    }
  };

  const getMode = (sessionID: string): ModeState | undefined => {
    return sessionModes.get(sessionID);
  };

  const clearMode = (sessionID: string): void => {
    sessionModes.delete(sessionID);
  };

  const getSystemPromptForMode = (mode: ActiveMode): string | null => {
    switch (mode) {
      case "ultrawork":
        return ULTRAWORK_SYSTEM_PROMPT;
      case "ralph-loop":
        return RALPH_LOOP_SYSTEM_PROMPT;
      case "ultrawork-ralph":
        return ULTRAWORK_RALPH_SYSTEM_PROMPT;
      default:
        return null;
    }
  };

  const systemTransformHook = async (
    input: { sessionID: string },
    output: { system: string[] }
  ): Promise<void> => {
    const state = sessionModes.get(input.sessionID);
    if (!state?.mode) return;

    const systemPrompt = getSystemPromptForMode(state.mode);
    if (systemPrompt) {
      output.system.push(systemPrompt);
      log(`Injected system prompt`, { sessionID: input.sessionID, mode: state.mode });
    }
  };

  return {
    setMode,
    getMode,
    clearMode,
    getSystemPromptForMode,
    "experimental.chat.system.transform": systemTransformHook,
  };
}
