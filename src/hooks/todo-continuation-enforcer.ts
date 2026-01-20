import type { PluginInput } from "@opencode-ai/plugin";
import type { BackgroundManager } from "../tools/background-manager";
import { log } from "../shared/logger";
import { getMainSessionID } from "../shared/session-state";

export interface TodoContinuationEnforcerOptions {
  backgroundManager?: BackgroundManager;
}

interface Todo {
  content: string;
  status: string;
  priority: string;
  id: string;
}

interface SessionState {
  countdownTimer?: ReturnType<typeof setTimeout>;
  countdownInterval?: ReturnType<typeof setInterval>;
  isRecovering?: boolean;
  countdownStartedAt?: number;
  abortDetectedAt?: number;
}

const CONTINUATION_PROMPT = `[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list. Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done`;

const COUNTDOWN_SECONDS = 2;
const TOAST_DURATION_MS = 900;

function getIncompleteCount(todos: Todo[]): number {
  return todos.filter(t => t.status !== "completed" && t.status !== "cancelled").length;
}

export function createTodoContinuationEnforcer(
  ctx: PluginInput,
  options: TodoContinuationEnforcerOptions = {}
) {
  const { backgroundManager } = options;
  const sessions = new Map<string, SessionState>();

  function getState(sessionID: string): SessionState {
    let state = sessions.get(sessionID);
    if (!state) {
      state = {};
      sessions.set(sessionID, state);
    }
    return state;
  }

  function cancelCountdown(sessionID: string): void {
    const state = sessions.get(sessionID);
    if (!state) return;

    if (state.countdownTimer) {
      clearTimeout(state.countdownTimer);
      state.countdownTimer = undefined;
    }
    if (state.countdownInterval) {
      clearInterval(state.countdownInterval);
      state.countdownInterval = undefined;
    }
    state.countdownStartedAt = undefined;
  }

  const markRecovering = (sessionID: string): void => {
    const state = getState(sessionID);
    state.isRecovering = true;
    cancelCountdown(sessionID);
    log(`Session marked as recovering`, { sessionID });
  };

  const markRecoveryComplete = (sessionID: string): void => {
    const state = sessions.get(sessionID);
    if (state) {
      state.isRecovering = false;
      log(`Session recovery complete`, { sessionID });
    }
  };

  async function showCountdownToast(seconds: number, incompleteCount: number): Promise<void> {
    await ctx.client.tui.showToast({
      body: {
        title: "Todo Continuation",
        message: `Resuming in ${seconds}s... (${incompleteCount} tasks remaining)`,
        variant: "warning" as const,
        duration: TOAST_DURATION_MS,
      },
    }).catch(() => {});
  }

  async function injectContinuation(sessionID: string, _incompleteCount: number): Promise<void> {
    const state = sessions.get(sessionID);

    if (state?.isRecovering) {
      log(`Skipped injection: in recovery`, { sessionID });
      return;
    }

    const hasRunningBgTasks = backgroundManager
      ? backgroundManager.getTasksByParentSession(sessionID).some(t => t.status === "running")
      : false;

    if (hasRunningBgTasks) {
      log(`Skipped injection: background tasks running`, { sessionID });
      return;
    }

    let todos: Todo[] = [];
    try {
      const response = await ctx.client.session.todo({ path: { id: sessionID } });
      todos = (response.data ?? response) as Todo[];
    } catch {
      return;
    }

    const freshIncompleteCount = getIncompleteCount(todos);
    if (freshIncompleteCount === 0) {
      log(`Skipped injection: no incomplete todos`, { sessionID });
      return;
    }

    const prompt = `${CONTINUATION_PROMPT}\n\n[Status: ${todos.length - freshIncompleteCount}/${todos.length} completed, ${freshIncompleteCount} remaining]`;

    try {
      log(`Injecting continuation`, { sessionID, incompleteCount: freshIncompleteCount });

      await ctx.client.session.prompt({
        path: { id: sessionID },
        body: {
          parts: [{ type: "text", text: prompt }],
        },
        query: { directory: ctx.directory },
      });

      log(`Injection successful`, { sessionID });
    } catch (err) {
      log(`Injection failed`, { sessionID, error: String(err) });
    }
  }

  function startCountdown(sessionID: string, incompleteCount: number): void {
    const state = getState(sessionID);
    cancelCountdown(sessionID);

    let secondsRemaining = COUNTDOWN_SECONDS;
    showCountdownToast(secondsRemaining, incompleteCount);
    state.countdownStartedAt = Date.now();

    state.countdownInterval = setInterval(() => {
      secondsRemaining--;
      if (secondsRemaining > 0) {
        showCountdownToast(secondsRemaining, incompleteCount);
      }
    }, 1000);

    state.countdownTimer = setTimeout(() => {
      cancelCountdown(sessionID);
      injectContinuation(sessionID, incompleteCount);
    }, COUNTDOWN_SECONDS * 1000);

    log(`Countdown started`, { sessionID, seconds: COUNTDOWN_SECONDS, incompleteCount });
  }

  const handler = async ({ event }: { event: { type: string; properties?: unknown } }): Promise<void> => {
    const props = event.properties as Record<string, unknown> | undefined;

    if (event.type === "session.error") {
      const sessionID = props?.sessionID as string | undefined;
      if (!sessionID) return;

      const error = props?.error as { name?: string } | undefined;
      if (error?.name === "MessageAbortedError" || error?.name === "AbortError") {
        const state = getState(sessionID);
        state.abortDetectedAt = Date.now();
        log(`Abort detected`, { sessionID, errorName: error.name });
      }

      cancelCountdown(sessionID);
      return;
    }

    if (event.type === "session.idle") {
      const sessionID = props?.sessionID as string | undefined;
      if (!sessionID) return;

      log(`session.idle`, { sessionID });

      const mainSessionID = getMainSessionID();
      const isMainSession = sessionID === mainSessionID;

      if (mainSessionID && !isMainSession) {
        log(`Skipped: not main session`, { sessionID });
        return;
      }

      const state = getState(sessionID);

      if (state.isRecovering) {
        log(`Skipped: in recovery`, { sessionID });
        return;
      }

      if (state.abortDetectedAt) {
        const timeSinceAbort = Date.now() - state.abortDetectedAt;
        const ABORT_WINDOW_MS = 3000;
        if (timeSinceAbort < ABORT_WINDOW_MS) {
          log(`Skipped: abort detected ${timeSinceAbort}ms ago`, { sessionID });
          state.abortDetectedAt = undefined;
          return;
        }
        state.abortDetectedAt = undefined;
      }

      const hasRunningBgTasks = backgroundManager
        ? backgroundManager.getTasksByParentSession(sessionID).some(t => t.status === "running")
        : false;

      if (hasRunningBgTasks) {
        log(`Skipped: background tasks running`, { sessionID });
        return;
      }

      let todos: Todo[] = [];
      try {
        const response = await ctx.client.session.todo({ path: { id: sessionID } });
        todos = (response.data ?? response) as Todo[];
      } catch {
        return;
      }

      if (!todos || todos.length === 0) {
        log(`No todos`, { sessionID });
        return;
      }

      const incompleteCount = getIncompleteCount(todos);
      if (incompleteCount === 0) {
        log(`All todos complete`, { sessionID, total: todos.length });
        return;
      }

      startCountdown(sessionID, incompleteCount);
      return;
    }

    if (event.type === "message.updated") {
      const info = props?.info as Record<string, unknown> | undefined;
      const sessionID = info?.sessionID as string | undefined;
      const role = info?.role as string | undefined;

      if (!sessionID) return;

      if (role === "user" || role === "assistant") {
        const state = sessions.get(sessionID);
        if (state) state.abortDetectedAt = undefined;
        cancelCountdown(sessionID);
      }
      return;
    }

    if (event.type === "tool.execute.before" || event.type === "tool.execute.after") {
      const sessionID = props?.sessionID as string | undefined;
      if (sessionID) {
        const state = sessions.get(sessionID);
        if (state) state.abortDetectedAt = undefined;
        cancelCountdown(sessionID);
      }
      return;
    }

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined;
      if (sessionInfo?.id) {
        cancelCountdown(sessionInfo.id);
        sessions.delete(sessionInfo.id);
        log(`Session deleted: cleaned up`, { sessionID: sessionInfo.id });
      }
      return;
    }
  };

  return {
    handler,
    markRecovering,
    markRecoveryComplete,
  };
}
