import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";
import type { ActiveMode } from "./system-prompt-injector";

const ULTRAWORK_KEYWORDS = ["ultrawork", "ulw", "uw"];
const SEARCH_KEYWORDS = ["deepsearch", "search", "find"];
const ANALYZE_KEYWORDS = ["analyze", "investigate"];

function removeCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
}

export interface KeywordDetectorOptions {
  onModeChange?: (sessionID: string, mode: ActiveMode, task?: string) => void;
}

function detectKeywords(text: string): { type: string; detected: boolean }[] {
  const cleanText = removeCodeBlocks(text).toLowerCase();
  const results: { type: string; detected: boolean }[] = [];

  const hasUltrawork = ULTRAWORK_KEYWORDS.some((k) => cleanText.includes(k));
  results.push({ type: "ultrawork", detected: hasUltrawork });

  const hasSearch = SEARCH_KEYWORDS.some((k) => cleanText.includes(k));
  results.push({ type: "search", detected: hasSearch });

  const hasAnalyze = ANALYZE_KEYWORDS.some((k) => cleanText.includes(k));
  results.push({ type: "analyze", detected: hasAnalyze });

  return results;
}

function extractTaskFromPrompt(text: string): string {
  let task = text;

  for (const keyword of [...ULTRAWORK_KEYWORDS]) {
    const regex = new RegExp(`${keyword}[:\\s]*`, "gi");
    task = task.replace(regex, "");
  }

  task = task
    .replace(/\/ultrawork-ralph\s*/gi, "")
    .replace(/\/ralph-loop\s*/gi, "")
    .replace(/\/ultrawork\s*/gi, "")
    .trim();

  return task || "Complete the task";
}

export function createKeywordDetectorHook(
  ctx: PluginInput,
  options: KeywordDetectorOptions = {}
) {
  return {
    "chat.message": async (
      input: {
        sessionID: string;
        agent?: string;
        model?: { providerID: string; modelID: string };
        messageID?: string;
      },
      output: {
        message: Record<string, unknown>;
        parts: Array<{ type: string; text?: string; [key: string]: unknown }>;
      }
    ): Promise<void> => {
      const promptText =
        output.parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n")
          .trim() || "";

      const detectedKeywords = detectKeywords(promptText);
      const hasUltrawork = detectedKeywords.find((k) => k.type === "ultrawork")?.detected;
      const hasSearch = detectedKeywords.find((k) => k.type === "search")?.detected;
      const hasAnalyze = detectedKeywords.find((k) => k.type === "analyze")?.detected;

      const isUltraworkRalph = promptText.toLowerCase().includes("/ultrawork-ralph");
      const isRalphLoop =
        promptText.toLowerCase().includes("/ralph-loop") && !isUltraworkRalph;
      const isUltraworkCommand =
        promptText.toLowerCase().includes("/ultrawork") &&
        !isUltraworkRalph &&
        !isRalphLoop;

      if (isUltraworkRalph) {
        const task = extractTaskFromPrompt(promptText);
        options.onModeChange?.(input.sessionID, "ultrawork-ralph", task);
        log(`Ultrawork-Ralph mode activated`, { sessionID: input.sessionID });

        ctx.client.tui
          .showToast({
            body: {
              title: "Ultrawork-Ralph Activated",
              message: "Maximum intensity + completion guarantee",
              variant: "success" as const,
              duration: 3000,
            },
          })
          .catch(() => {});

        output.parts.push({
          type: "text",
          text: `\n\n[ULTRAWORK-RALPH MODE ACTIVATED]
Task: ${task}

You are now in ULTRAWORK-RALPH mode. Maximum intensity with completion guarantee.
- PARALLEL EVERYTHING
- DELEGATE AGGRESSIVELY  
- Create and track PRD in .sisyphus/prd.json
- Do NOT stop until you output: <promise>TASK_COMPLETE</promise>`,
        });
        return;
      }

      if (isRalphLoop) {
        const task = extractTaskFromPrompt(promptText);
        options.onModeChange?.(input.sessionID, "ralph-loop", task);
        log(`Ralph Loop mode activated`, { sessionID: input.sessionID });
        return;
      }

      if (isUltraworkCommand || hasUltrawork) {
        const task = extractTaskFromPrompt(promptText);
        options.onModeChange?.(input.sessionID, "ultrawork", task);
        log(`Ultrawork mode activated`, { sessionID: input.sessionID });

        if (output.message.variant === undefined) {
          output.message.variant = "max";
        }

        ctx.client.tui
          .showToast({
            body: {
              title: "Ultrawork Mode Activated",
              message: "Maximum performance engaged. All agents at your disposal.",
              variant: "success" as const,
              duration: 3000,
            },
          })
          .catch(() => {});

        output.parts.push({
          type: "text",
          text: `\n\n[ULTRAWORK MODE ACTIVATED]
- Execute all tasks with maximum parallelism
- Delegate aggressively to background agents
- Do not stop until all tasks are complete
- Use TODO tracking obsessively`,
        });
      }

      if (hasSearch) {
        output.parts.push({
          type: "text",
          text: `\n\n[SEARCH MODE]
- Use explore and librarian agents in parallel
- Search both internal codebase and external resources
- Cast a wide net before narrowing down`,
        });
      }

      if (hasAnalyze) {
        output.parts.push({
          type: "text",
          text: `\n\n[ANALYZE MODE]
- Consult oracle for architectural guidance
- Gather comprehensive context before conclusions
- Consider multiple perspectives`,
        });
      }

      if (hasUltrawork || hasSearch || hasAnalyze) {
        log(`Detected keywords`, {
          sessionID: input.sessionID,
          ultrawork: hasUltrawork,
          search: hasSearch,
          analyze: hasAnalyze,
        });
      }
    },
  };
}
