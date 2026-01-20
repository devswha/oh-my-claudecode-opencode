import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";
import type { RalphLoopConfig } from "../config";
import type { ActiveMode } from "./system-prompt-injector";
import * as fs from "fs";
import * as path from "path";

export interface UserStory {
  id: string;
  title: string;
  description?: string;
  acceptanceCriteria: string[];
  priority: number;
  passes: boolean;
  notes?: string;
}

export interface PRD {
  project: string;
  branchName?: string;
  description: string;
  userStories: UserStory[];
}

interface RalphLoopState {
  sessionID: string;
  prompt: string;
  iteration: number;
  maxIterations: number;
  completionPromise: string;
  isActive: boolean;
  startedAt: number;
  mode: "ralph-loop" | "ultrawork-ralph";
  prdPath?: string;
}

interface RalphLoopOptions {
  config?: RalphLoopConfig;
  onModeChange?: (sessionID: string, mode: ActiveMode, task?: string) => void;
}

const states = new Map<string, RalphLoopState>();
const COMPLETION_PROMISE = "<promise>TASK_COMPLETE</promise>";
const LEGACY_COMPLETION_PROMISE = "<promise>DONE</promise>";
const PRD_FILENAME = "prd.json";
const PROGRESS_FILENAME = "progress.txt";

export function createRalphLoopHook(ctx: PluginInput, options: RalphLoopOptions = {}) {
  const maxIterations = options.config?.default_max_iterations ?? 50;
  const isEnabled = options.config?.enabled !== false;

  const getSisyphusDir = (): string => {
    return path.join(ctx.directory, ".sisyphus");
  };

  const getPrdPath = (): string => {
    return path.join(getSisyphusDir(), PRD_FILENAME);
  };

  const getProgressPath = (): string => {
    return path.join(getSisyphusDir(), PROGRESS_FILENAME);
  };

  const ensureSisyphusDir = (): void => {
    const dir = getSisyphusDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };

  const readPrd = (): PRD | null => {
    const prdPath = getPrdPath();
    if (!fs.existsSync(prdPath)) return null;
    try {
      const content = fs.readFileSync(prdPath, "utf-8");
      return JSON.parse(content) as PRD;
    } catch {
      return null;
    }
  };

  const writePrd = (prd: PRD): void => {
    ensureSisyphusDir();
    fs.writeFileSync(getPrdPath(), JSON.stringify(prd, null, 2));
  };

  const initializeProgress = (task: string): void => {
    ensureSisyphusDir();
    const progressPath = getProgressPath();
    if (!fs.existsSync(progressPath)) {
      const content = `# Ralph Progress Log
Started: ${new Date().toISOString()}
Task: ${task}

## Codebase Patterns
(No patterns discovered yet)

---

`;
      fs.writeFileSync(progressPath, content);
    }
  };

  const createInitialPrd = (task: string): PRD => {
    return {
      project: "Ralph Loop Task",
      description: task,
      userStories: [
        {
          id: "US-001",
          title: "Complete the requested task",
          description: task,
          acceptanceCriteria: [
            "Task is fully implemented",
            "All tests pass (if applicable)",
            "No errors or warnings",
          ],
          priority: 1,
          passes: false,
        },
      ],
    };
  };

  const startLoop = (
    sessionID: string,
    prompt: string,
    opts?: {
      maxIterations?: number;
      mode?: "ralph-loop" | "ultrawork-ralph";
    }
  ): boolean => {
    if (!isEnabled) {
      log(`Ralph loop disabled`, { sessionID });
      return false;
    }

    if (states.has(sessionID)) {
      log(`Ralph loop already active`, { sessionID });
      return false;
    }

    const mode = opts?.mode ?? "ralph-loop";

    let prd = readPrd();
    if (!prd) {
      prd = createInitialPrd(prompt);
      writePrd(prd);
      log(`Created initial PRD`, { sessionID });
    }
    initializeProgress(prompt);

    const state: RalphLoopState = {
      sessionID,
      prompt,
      iteration: 0,
      maxIterations: opts?.maxIterations ?? maxIterations,
      completionPromise: COMPLETION_PROMISE,
      isActive: true,
      startedAt: Date.now(),
      mode,
      prdPath: getPrdPath(),
    };

    states.set(sessionID, state);

    options.onModeChange?.(sessionID, mode, prompt);

    log(`Ralph loop started`, {
      sessionID,
      prompt: prompt.substring(0, 50),
      maxIterations: state.maxIterations,
      mode,
    });

    ctx.client.tui
      .showToast({
        body: {
          title: mode === "ultrawork-ralph" ? "Ultrawork-Ralph Activated" : "Ralph Loop Started",
          message: `Task: ${prompt.substring(0, 50)}...`,
          variant: "success" as const,
          duration: 3000,
        },
      })
      .catch(() => {});

    return true;
  };

  const cancelLoop = (sessionID: string): boolean => {
    const state = states.get(sessionID);
    if (!state) {
      log(`No active ralph loop to cancel`, { sessionID });
      return false;
    }

    states.delete(sessionID);
    options.onModeChange?.(sessionID, null);

    log(`Ralph loop cancelled`, { sessionID, iteration: state.iteration });

    ctx.client.tui
      .showToast({
        body: {
          title: "Ralph Loop Cancelled",
          message: `Stopped after ${state.iteration} iterations`,
          variant: "warning" as const,
          duration: 3000,
        },
      })
      .catch(() => {});

    return true;
  };

  const getState = (sessionID?: string): RalphLoopState | null => {
    if (sessionID) {
      return states.get(sessionID) ?? null;
    }
    for (const state of states.values()) {
      if (state.isActive) return state;
    }
    return null;
  };

  const checkCompletionInContent = (content: string): boolean => {
    return (
      content.includes(COMPLETION_PROMISE) || content.includes(LEGACY_COMPLETION_PROMISE)
    );
  };

  const event = async (input: {
    event: { type: string; properties?: unknown };
  }): Promise<void> => {
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
        options.onModeChange?.(sessionID, null);

        ctx.client.tui
          .showToast({
            body: {
              title: "Ralph Loop Safety Limit",
              message: `Max iterations (${state.maxIterations}) reached`,
              variant: "warning" as const,
              duration: 5000,
            },
          })
          .catch(() => {});
        return;
      }

      const prd = readPrd();
      const incompleteStories = prd?.userStories.filter((s) => !s.passes) ?? [];
      const prdStatus = prd
        ? `PRD Status: ${prd.userStories.filter((s) => s.passes).length}/${prd.userStories.length} stories complete`
        : "No PRD found - create one to track progress";

      const nextStory = incompleteStories[0];
      const nextStoryHint = nextStory
        ? `\nNext story: ${nextStory.id} - ${nextStory.title}`
        : "";

      log(`Ralph loop continuing`, {
        sessionID,
        iteration: state.iteration,
        maxIterations: state.maxIterations,
        incompleteStories: incompleteStories.length,
      });

      const continuePrompt = `[RALPH LOOP CONTINUATION - Iteration ${state.iteration}/${state.maxIterations}]

${prdStatus}${nextStoryHint}

You stopped without completing your promise. The work is NOT done yet.
Continue working on incomplete items. Do not stop until you can truthfully output:
\`${state.completionPromise}\`

Original task: ${state.prompt}

**REMINDER**: 
- Check .sisyphus/prd.json for user stories
- Update story "passes" to true when complete
- Log learnings in .sisyphus/progress.txt
- Only output the promise tag when ALL stories pass`;

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

    if (event.type === "message.updated" || event.type === "message.created") {
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

        const lastAssistant = [...messages]
          .reverse()
          .find((m) => m.info?.role === "assistant");
        if (!lastAssistant?.parts) return;

        const content = lastAssistant.parts
          .filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n");

        if (checkCompletionInContent(content)) {
          log(`Ralph loop completion detected`, { sessionID });
          states.delete(sessionID);
          options.onModeChange?.(sessionID, null);

          const duration = Date.now() - state.startedAt;
          const minutes = Math.floor(duration / 60000);
          const seconds = Math.floor((duration % 60000) / 1000);

          ctx.client.tui
            .showToast({
              body: {
                title: "Ralph Loop Completed!",
                message: `Task finished in ${state.iteration} iterations (${minutes}m ${seconds}s)`,
                variant: "success" as const,
                duration: 5000,
              },
            })
            .catch(() => {});
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
    readPrd,
    writePrd,
    checkCompletionInContent,
  };
}
