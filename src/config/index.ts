import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const AgentConfigSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  disable: z.boolean().optional(),
  prompt_append: z.string().optional(),
});

const BackgroundTaskConfigSchema = z.object({
  defaultConcurrency: z.number().min(1).max(20).optional(),
  providerConcurrency: z.record(z.string(), z.number()).optional(),
  modelConcurrency: z.record(z.string(), z.number()).optional(),
});

const RalphLoopConfigSchema = z.object({
  enabled: z.boolean().optional(),
  default_max_iterations: z.number().min(1).max(1000).optional(),
});

const OmoOmcsConfigSchema = z.object({
  $schema: z.string().optional(),
  agents: z.record(z.string(), AgentConfigSchema).optional(),
  disabled_hooks: z.array(z.string()).optional(),
  disabled_agents: z.array(z.string()).optional(),
  disabled_skills: z.array(z.string()).optional(),
  disabled_mcps: z.array(z.string()).optional(),
  background_task: BackgroundTaskConfigSchema.optional(),
  ralph_loop: RalphLoopConfigSchema.optional(),
  sisyphus_agent: z.object({
    disabled: z.boolean().optional(),
    planner_enabled: z.boolean().optional(),
    replace_plan: z.boolean().optional(),
  }).optional(),
});

export type OmoOmcsConfig = z.infer<typeof OmoOmcsConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type BackgroundTaskConfig = z.infer<typeof BackgroundTaskConfigSchema>;
export type RalphLoopConfig = z.infer<typeof RalphLoopConfigSchema>;

export type HookName =
  | "todo-continuation-enforcer"
  | "keyword-detector"
  | "ralph-loop"
  | "session-recovery"
  | "agent-usage-reminder"
  | "context-window-monitor"
  | "comment-checker"
  | "tool-output-truncator";

export type AgentName =
  | "oracle"
  | "librarian"
  | "explore"
  | "frontend-ui-ux-engineer"
  | "document-writer"
  | "multimodal-looker";

function stripJsonComments(content: string): string {
  return content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

export function loadConfig(directory: string): OmoOmcsConfig {
  const configPaths = [
    join(directory, ".opencode", "omo-omcs.json"),
    join(directory, ".opencode", "omo-omcs.jsonc"),
    join(process.env.HOME || "", ".config", "opencode", "omo-omcs.json"),
    join(process.env.HOME || "", ".config", "opencode", "omo-omcs.jsonc"),
  ];

  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      try {
        const content = readFileSync(configPath, "utf-8");
        const jsonContent = stripJsonComments(content);
        const parsed = JSON.parse(jsonContent);
        return OmoOmcsConfigSchema.parse(parsed);
      } catch (error) {
        console.warn(`Failed to load config from ${configPath}:`, error);
      }
    }
  }

  return {
    agents: {
      oracle: { model: "openai/gpt-5.2" },
      librarian: { model: "google/gemini-3-flash" },
      explore: { model: "google/gemini-3-flash" },
      "frontend-ui-ux-engineer": { model: "google/gemini-3-pro-preview" },
      "document-writer": { model: "google/gemini-3-flash" },
      "multimodal-looker": { model: "google/gemini-3-flash" },
    },
    background_task: {
      defaultConcurrency: 5,
    },
    ralph_loop: {
      enabled: true,
      default_max_iterations: 100,
    },
  };
}
