import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";
import type { RalphLoopConfig } from "../config";

interface RalphLoopState {
  sessionID: string;
  prompt: string;
  iteration: number;
  maxIterations: number;
  completionPromise: string;
  isActive: boolean;
  startedAt: number;
}

interface RalphLoopOptions {
  config?: RalphLoopConfig;
}

const states = new Map<string, RalphLoopState>();

const DEFAULT_COMPLETION_PROMISE = "<promise>DONE</promise>";

export function createRalphLoopHook(ctx: PluginInput, options: RalphLoopOptions = {}) {
  const maxIterations = options.config?.default_max_iterations ?? 100;
  const isEnabled = options.config?.enabled !== false;

  const startLoop = (
    sessionID: string,
    prompt: string,
    opts?: { maxIterations?: number; completionPromise?: string }
  ): boolean => {
    if (!isEnabled) {
      log(`Ralph loop disabled`, { sessionID });
      return false;
    }

    if (states.has(sessionID)) {
      log(`Ralph loop already active`, { sessionID });
      return false;
    }

    const state: RalphLoopState = {
      sessionID,
      prompt,
      iteration: 0,
      maxIterations: opts?.maxIterations ?? maxIterations,
      completionPromise: opts?.completionPromise ?? DEFAULT_COMPLETION_PROMISE,
      isActive: true,
      startedAt: Date.now(),
    };

    states.set(sessionID, state);

    log(`Ralph loop started`, {
      sessionID,
      prompt: prompt.substring(0, 50),
      maxIterations: state.maxIterations,
    });

    ctx.client.tui.showToast({
      body: {
        title: "Ralph Loop Started",
        message: `Task: ${prompt.substring(0, 50)}...`,
        variant: "success" as const,
        duration: 3000,
      },
    }).catch(() => {});

    return true;
  };

  const cancelLoop = (sessionID: string): boolean => {
    const state = states.get(sessionID);
    if (!state) {
      log(`No active ralph loop to cancel`, { sessionID });
      return false;
    }

    states.delete(sessionID);
    log(`Ralph loop cancelled`, { sessionID, iteration: state.iteration });

    ctx.client.tui.showToast({
      body: {
        title: "Ralph Loop Cancelled",
        message: `Stopped after ${state.iteration} iterations`,
        variant: "warning" as const,
        duration: 3000,
      },
    }).catch(() => {});

    return true;
  };

  const getState = (): RalphLoopState | null => {
    for (const state of states.values()) {
      if (state.isActive) return state;
    }
    return null;
  };

  const event = async (input: { event: { type: string; properties?: unknown } }): Promise<void> => {
    const { event } = input;
    const props = event.properties as Record<string, unknown> | undefined;

    if (event.type === "session.idle") {
      const sessionID = props?.sessionID as string | undefined;
      if (!sessionID) return;

      const state = states.get(sessionID);
      if (!state || !state.isActive) return;

      state.iteration++;

      if (state.iteration >= state.maxIterations) {
        log(`Ralph loop max iterations reached`, {
          sessionID,
          iteration: state.iteration,
        });
        states.delete(sessionID);

        ctx.client.tui.showToast({
          body: {
            title: "Ralph Loop Completed",
            message: `Max iterations (${state.maxIterations}) reached`,
            variant: "info" as const,
            duration: 5000,
          },
        }).catch(() => {});
        return;
      }

      log(`Ralph loop continuing`, {
        sessionID,
        iteration: state.iteration,
        maxIterations: state.maxIterations,
      });

      const continuePrompt = `[Ralph Loop - Iteration ${state.iteration}/${state.maxIterations}]

Continue working on the task. When complete, output: ${state.completionPromise}

Original task: ${state.prompt}`;

      try {
        await ctx.client.session.prompt({
          path: { id: sessionID },
          body: {
            parts: [{ type: "text", text: continuePrompt }],
          },
          query: { directory: ctx.directory },
        });
      } catch (err) {
        log(`Ralph loop injection failed`, { sessionID, error: String(err) });
      }
    }

    if (event.type === "message.updated") {
      const info = props?.info as Record<string, unknown> | undefined;
      const sessionID = info?.sessionID as string | undefined;
      const role = info?.role as string | undefined;

      if (!sessionID || role !== "assistant") return;

      const state = states.get(sessionID);
      if (!state || !state.isActive) return;

      try {
        const messagesResp = await ctx.client.session.messages({
          path: { id: sessionID },
        });
        const messages = (messagesResp.data ?? []) as Array<{
          info?: { role?: string };
          parts?: Array<{ type: string; text?: string }>;
        }>;

        const lastAssistant = [...messages].reverse().find(m => m.info?.role === "assistant");
        if (!lastAssistant?.parts) return;

        const content = lastAssistant.parts
          .filter(p => p.type === "text" && p.text)
          .map(p => p.text)
          .join("\n");

        if (content.includes(state.completionPromise)) {
          log(`Ralph loop completion detected`, { sessionID });
          states.delete(sessionID);

          ctx.client.tui.showToast({
            body: {
              title: "Ralph Loop Completed",
              message: `Task finished in ${state.iteration} iterations`,
              variant: "success" as const,
              duration: 5000,
            },
          }).catch(() => {});
        }
      } catch {
      }
    }

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined;
      if (sessionInfo?.id) {
        states.delete(sessionInfo.id);
      }
    }
  };

  return {
    startLoop,
    cancelLoop,
    getState,
    event,
  };
}
