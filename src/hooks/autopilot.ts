import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";
import {
  type AutopilotState,
  readAutopilotState,
  writeAutopilotState,
  clearAutopilotState,
  createAutopilotState,
  updateAutopilotPhase,
  markAutopilotComplete,
} from "../state/autopilot-state";

export interface AutopilotHookOptions {
  config?: {
    enabled?: boolean;
    maxPhaseRetries?: number;
    delegationEnforcement?: 'strict' | 'warn' | 'off';
  };
  onPhaseChange?: (sessionId: string, phase: AutopilotState['phase']) => void;
}

const AUTOPILOT_TRIGGERS = [
  /^\/autopilot\s/i,
  /autopilot:/i,
  /\bautopilot\b.*:/i,
];

const PHASE_COMPLETE_SIGNALS: Record<string, RegExp[]> = {
  expansion: [/EXPANSION_COMPLETE/i, /spec.*complete/i],
  planning: [/PLANNING_COMPLETE/i, /plan.*approved/i],
  execution: [/EXECUTION_COMPLETE/i, /implementation.*complete/i],
  qa: [/QA_COMPLETE/i, /all.*tests.*pass/i],
  validation: [/AUTOPILOT_COMPLETE/i, /validation.*approved/i],
};

export function createAutopilotHook(
  ctx: PluginInput,
  options: AutopilotHookOptions = {}
) {
  const { config = {}, onPhaseChange } = options;
  const { enabled = true, maxPhaseRetries: _maxPhaseRetries = 3 } = config;

  // Track active sessions
  const activeSessions = new Map<string, AutopilotState>();

  function detectAutopilotTrigger(text: string): { triggered: boolean; task?: string } {
    for (const pattern of AUTOPILOT_TRIGGERS) {
      const match = text.match(pattern);
      if (match) {
        // Extract task after trigger
        const afterTrigger = text.slice(match.index! + match[0].length).trim();
        return { triggered: true, task: afterTrigger || undefined };
      }
    }
    return { triggered: false };
  }

  function detectPhaseCompletion(text: string, currentPhase: AutopilotState['phase']): boolean {
    const signals = PHASE_COMPLETE_SIGNALS[currentPhase] || [];
    return signals.some(pattern => pattern.test(text));
  }

  function getNextPhase(current: AutopilotState['phase']): AutopilotState['phase'] {
    const order: AutopilotState['phase'][] = ['expansion', 'planning', 'execution', 'qa', 'validation', 'complete'];
    const idx = order.indexOf(current);
    return order[Math.min(idx + 1, order.length - 1)];
  }

  function startAutopilot(sessionId: string, task?: string): void {
    const state = createAutopilotState(sessionId, task);
    activeSessions.set(sessionId, state);
    writeAutopilotState(ctx.directory, state);

    log("[autopilot] Started autopilot session", {
      sessionId,
      phase: state.phase,
      task: task?.substring(0, 100),
    });

    if (onPhaseChange) {
      onPhaseChange(sessionId, state.phase);
    }
  }

  function advancePhase(sessionId: string): void {
    const state = activeSessions.get(sessionId);
    if (!state) return;

    const nextPhase = getNextPhase(state.phase);
    updateAutopilotPhase(ctx.directory, state, nextPhase);

    log("[autopilot] Phase advanced", {
      sessionId,
      from: state.phase,
      to: nextPhase,
    });

    state.phase = nextPhase;

    if (onPhaseChange) {
      onPhaseChange(sessionId, nextPhase);
    }

    if (nextPhase === 'complete') {
      markAutopilotComplete(ctx.directory, state);
      activeSessions.delete(sessionId);
      log("[autopilot] Autopilot completed", { sessionId });
    }
  }

  function cancelAutopilot(sessionId: string): void {
    activeSessions.delete(sessionId);
    clearAutopilotState(ctx.directory);
    log("[autopilot] Autopilot cancelled", { sessionId });
  }

  // Load existing state on init
  const existingState = readAutopilotState(ctx.directory);
  if (existingState?.active) {
    activeSessions.set(existingState.sessionId, existingState);
    log("[autopilot] Restored active session", {
      sessionId: existingState.sessionId,
      phase: existingState.phase,
    });
  }

  return {
    // Public API
    startAutopilot,
    cancelAutopilot,
    getState: (sessionId: string) => activeSessions.get(sessionId),
    isActive: (sessionId: string) => activeSessions.has(sessionId),

    // Hook handlers
    "chat.message": async (
      input: { sessionID: string; agent?: string },
      output: { message: unknown; parts: Array<{ type: string; text?: string }> }
    ) => {
      if (!enabled) return;

      const promptText = output.parts
        ?.filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("\n")
        .trim() || "";

      // Check for autopilot trigger
      const { triggered, task } = detectAutopilotTrigger(promptText);
      if (triggered && !activeSessions.has(input.sessionID)) {
        startAutopilot(input.sessionID, task);
      }

      // Check for cancel
      if (/cancel.*autopilot|\/cancel-autopilot/i.test(promptText)) {
        cancelAutopilot(input.sessionID);
      }
    },

    event: async (input: { event: { type: string; properties?: unknown } }) => {
      if (!enabled) return;

      const { event } = input;
      const props = event.properties as Record<string, unknown> | undefined;

      if (event.type === "session.idle") {
        const sessionId = props?.sessionID as string | undefined;
        if (!sessionId) return;

        const state = activeSessions.get(sessionId);
        if (!state || state.phase === 'complete') return;

        // Check for phase completion in recent output
        const recentOutput = props?.lastOutput as string | undefined;
        if (recentOutput && detectPhaseCompletion(recentOutput, state.phase)) {
          advancePhase(sessionId);
        }
      }
    },
  };
}
