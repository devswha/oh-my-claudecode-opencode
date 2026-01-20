import type { PluginInput } from "@opencode-ai/plugin";
import { log } from "../shared/logger";

const ULTRAWORK_KEYWORDS = ["ultrawork", "ulw", "ultrathink"];
const SEARCH_KEYWORDS = ["deepsearch", "search", "find", "찾아", "検索"];
const ANALYZE_KEYWORDS = ["analyze", "investigate", "분석", "調査"];

function removeCodeBlocks(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]+`/g, "");
}

function detectKeywords(text: string): { type: string; message: string }[] {
  const cleanText = removeCodeBlocks(text).toLowerCase();
  const detected: { type: string; message: string }[] = [];

  for (const keyword of ULTRAWORK_KEYWORDS) {
    if (cleanText.includes(keyword)) {
      detected.push({
        type: "ultrawork",
        message: `[ultrawork-mode]

ULTRAWORK MODE ACTIVATED. Maximum performance engaged.

- Execute all tasks with maximum parallelism
- Delegate aggressively to background agents
- Do not stop until all tasks are complete
- Use TODO tracking obsessively`,
      });
      break;
    }
  }

  for (const keyword of SEARCH_KEYWORDS) {
    if (cleanText.includes(keyword)) {
      detected.push({
        type: "search",
        message: `[search-mode]

SEARCH MODE ACTIVATED. Maximum search effort enabled.

- Use explore and librarian agents in parallel
- Search both internal codebase and external resources
- Cast a wide net before narrowing down`,
      });
      break;
    }
  }

  for (const keyword of ANALYZE_KEYWORDS) {
    if (cleanText.includes(keyword)) {
      detected.push({
        type: "analyze",
        message: `[analyze-mode]

ANALYZE MODE ACTIVATED. Deep analysis enabled.

- Consult oracle for architectural guidance
- Gather comprehensive context before conclusions
- Consider multiple perspectives`,
      });
      break;
    }
  }

  return detected;
}

export function createKeywordDetectorHook(ctx: PluginInput) {
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
      const promptText = output.parts
        ?.filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("\n")
        .trim() || "";

      const detectedKeywords = detectKeywords(promptText);

      if (detectedKeywords.length === 0) {
        return;
      }

      const hasUltrawork = detectedKeywords.some((k) => k.type === "ultrawork");
      if (hasUltrawork) {
        log(`Ultrawork mode activated`, { sessionID: input.sessionID });

        if (output.message.variant === undefined) {
          output.message.variant = "max";
        }

        ctx.client.tui
          .showToast({
            body: {
              title: "Ultrawork Mode Activated",
              message: "Maximum precision engaged. All agents at your disposal.",
              variant: "success" as const,
              duration: 3000,
            },
          })
          .catch(() => {});
      }

      for (const keyword of detectedKeywords) {
        output.parts.push({
          type: "text",
          text: keyword.message,
        });
      }

      log(`Detected ${detectedKeywords.length} keywords`, {
        sessionID: input.sessionID,
        types: detectedKeywords.map((k) => k.type),
      });
    },
  };
}
