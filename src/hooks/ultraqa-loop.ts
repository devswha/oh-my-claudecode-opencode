import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";
import {
  type UltraQAState,
  readUltraQAState,
  writeUltraQAState,
  clearUltraQAState,
  createUltraQAState,
  updateUltraQAIteration,
  markUltraQAComplete,
  isUltraQAPassing,
} from "../state/ultraqa-state";

export interface UltraQALoopOptions {
  config?: {
    enabled?: boolean;
    maxIterations?: number;
    buildCommand?: string;
    testCommand?: string;
    lintCommand?: string;
  };
  onCycleComplete?: (sessionId: string, state: UltraQAState) => void;
}

const ULTRAQA_TRIGGERS = [
  /^\/ultraqa\s/i,
  /ultraqa:/i,
];

export function createUltraQALoopHook(
  ctx: PluginInput,
  options: UltraQALoopOptions = {}
) {
  const { config = {}, onCycleComplete } = options;
  const {
    enabled = true,
    maxIterations = 10,
    buildCommand = 'bun run build',
    testCommand = 'bun test',
    lintCommand = 'bun run lint',
  } = config;

  const activeSessions = new Map<string, UltraQAState>();

  function detectUltraQATrigger(text: string): { triggered: boolean; goal?: string } {
    for (const pattern of ULTRAQA_TRIGGERS) {
      const match = text.match(pattern);
      if (match) {
        const afterTrigger = text.slice(match.index! + match[0].length).trim();
        return { triggered: true, goal: afterTrigger || undefined };
      }
    }
    return { triggered: false };
  }

  function startUltraQA(sessionId: string, goal: string): void {
    const state = createUltraQAState(sessionId, goal, maxIterations);
    activeSessions.set(sessionId, state);
    writeUltraQAState(ctx.directory, state);

    log("[ultraqa] Started UltraQA session", {
      sessionId,
      goal: goal.substring(0, 100),
      maxIterations,
    });
  }

  function updateCycle(
    sessionId: string,
    results: { build?: 'pass' | 'fail'; lint?: 'pass' | 'fail'; test?: 'pass' | 'fail' }
  ): void {
    const state = activeSessions.get(sessionId);
    if (!state) return;

    updateUltraQAIteration(ctx.directory, state, results);

    log("[ultraqa] Cycle updated", {
      sessionId,
      iteration: state.iteration,
      results,
    });

    if (isUltraQAPassing(state)) {
      completeUltraQA(sessionId, 'success');
    } else if (state.iteration >= state.maxIterations) {
      completeUltraQA(sessionId, 'max_iterations');
    }

    if (onCycleComplete) {
      onCycleComplete(sessionId, state);
    }
  }

  function completeUltraQA(sessionId: string, reason: 'success' | 'max_iterations' | 'cancelled'): void {
    const state = activeSessions.get(sessionId);
    if (state) {
      markUltraQAComplete(ctx.directory, state);
      activeSessions.delete(sessionId);

      log("[ultraqa] UltraQA completed", {
        sessionId,
        reason,
        iterations: state.iteration,
        passing: isUltraQAPassing(state),
      });
    }
  }

  function cancelUltraQA(sessionId: string): void {
    completeUltraQA(sessionId, 'cancelled');
    clearUltraQAState(ctx.directory);
  }

  function getQAPrompt(state: UltraQAState): string {
    const commands = [
      `Build: \`${buildCommand}\``,
      `Lint: \`${lintCommand}\``,
      `Test: \`${testCommand}\``,
    ].join('\n');

    return `[ULTRAQA LOOP - Iteration ${state.iteration + 1}/${state.maxIterations}]

Goal: ${state.goal}

Run these checks in order:
${commands}

For each failing check:
1. Analyze the error
2. Fix the issue
3. Re-run the check

Continue until ALL checks pass or report what's blocking progress.

Current status:
- Build: ${state.lastBuildResult || 'not run'}
- Lint: ${state.lastLintResult || 'not run'}
- Test: ${state.lastTestResult || 'not run'}

When ALL pass, output: QA_COMPLETE`;
  }

  // Load existing state
  const existingState = readUltraQAState(ctx.directory);
  if (existingState?.active) {
    activeSessions.set(existingState.sessionId, existingState);
    log("[ultraqa] Restored active session", {
      sessionId: existingState.sessionId,
      iteration: existingState.iteration,
    });
  }

  return {
    // Public API
    startUltraQA,
    cancelUltraQA,
    updateCycle,
    getState: (sessionId: string) => activeSessions.get(sessionId),
    isActive: (sessionId: string) => activeSessions.has(sessionId),
    getQAPrompt,

    // Hook handlers
    "chat.message": async (
      input: { sessionID: string },
      output: { parts: Array<{ type: string; text?: string }> }
    ) => {
      if (!enabled) return;

      const promptText = output.parts
        ?.filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("\n")
        .trim() || "";

      const { triggered, goal } = detectUltraQATrigger(promptText);
      if (triggered && !activeSessions.has(input.sessionID)) {
        startUltraQA(input.sessionID, goal || "Pass all QA checks");
      }

      if (/cancel.*ultraqa|\/cancel-ultraqa/i.test(promptText)) {
        cancelUltraQA(input.sessionID);
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
        if (!state || !state.active) return;

        // Check for QA_COMPLETE signal
        const lastOutput = props?.lastOutput as string | undefined;
        if (lastOutput && /QA_COMPLETE/i.test(lastOutput)) {
          completeUltraQA(sessionId, 'success');
        }
      }
    },
  };
}
