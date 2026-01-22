import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const AgentConfigSchema = z.object({
  model: z.string().optional(),
  tier: z.enum(["haiku", "sonnet", "opus"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  disable: z.boolean().optional(),
  prompt_append: z.string().optional(),
});

const ModelMappingConfigSchema = z.object({
  tierDefaults: z.object({
    haiku: z.string().optional(),
    sonnet: z.string().optional(),
    opus: z.string().optional(),
  }).optional(),
  debugLogging: z.boolean().optional(),
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

const AutopilotConfigSchema = z.object({
  enabled: z.boolean().optional(),
  maxPhaseRetries: z.number().min(1).max(10).optional(),
  delegationEnforcement: z.enum(['strict', 'warn', 'off']).optional(),
});

const UltraQAConfigSchema = z.object({
  enabled: z.boolean().optional(),
  maxIterations: z.number().min(1).max(100).optional(),
  buildCommand: z.string().optional(),
  testCommand: z.string().optional(),
  lintCommand: z.string().optional(),
});

const ScientistConfigSchema = z.object({
  enabled: z.boolean().optional(),
  replFallback: z.enum(['bash', 'disabled']).optional(),
});

const OrchestratorConfigSchema = z.object({
  delegationEnforcement: z.enum(['strict', 'warn', 'off']).optional(),
  auditLogEnabled: z.boolean().optional(),
});

const ContextRecoveryConfigSchema = z.object({
  enabled: z.boolean().optional(),
});

const EditErrorRecoveryConfigSchema = z.object({
  enabled: z.boolean().optional(),
  maxRetries: z.number().min(1).max(10).optional(),
  showToasts: z.boolean().optional(),
});

const TuiStatusConfigSchema = z.object({
  enabled: z.boolean().optional(),
  showAgentNotifications: z.boolean().optional(),
  showModeChanges: z.boolean().optional(),
  toastDuration: z.number().min(500).max(30000).optional(),
  trackMetrics: z.boolean().optional(),
});

export type TuiStatusConfig = z.infer<typeof TuiStatusConfigSchema>;

const OmoOmcsConfigSchema = z.object({
  $schema: z.string().optional(),
  agents: z.record(z.string(), AgentConfigSchema).optional(),
  model_mapping: ModelMappingConfigSchema.optional(),
  disabled_hooks: z.array(z.string()).optional(),
  disabled_agents: z.array(z.string()).optional(),
  disabled_skills: z.array(z.string()).optional(),
  disabled_mcps: z.array(z.string()).optional(),
  background_task: BackgroundTaskConfigSchema.optional(),
  ralph_loop: RalphLoopConfigSchema.optional(),
  autopilot: AutopilotConfigSchema.optional(),
  ultraqa: UltraQAConfigSchema.optional(),
  scientist: ScientistConfigSchema.optional(),
  orchestrator: OrchestratorConfigSchema.optional(),
  context_recovery: ContextRecoveryConfigSchema.optional(),
  edit_error_recovery: EditErrorRecoveryConfigSchema.optional(),
  tui_status: TuiStatusConfigSchema.optional(),
  sisyphus_agent: z.object({
    disabled: z.boolean().optional(),
    planner_enabled: z.boolean().optional(),
    replace_plan: z.boolean().optional(),
  }).optional(),
});

export type OmoOmcsConfig = z.infer<typeof OmoOmcsConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type ModelMappingConfig = z.infer<typeof ModelMappingConfigSchema>;
export type BackgroundTaskConfig = z.infer<typeof BackgroundTaskConfigSchema>;
export type RalphLoopConfig = z.infer<typeof RalphLoopConfigSchema>;
export type AutopilotConfig = z.infer<typeof AutopilotConfigSchema>;
export type UltraQAConfig = z.infer<typeof UltraQAConfigSchema>;
export type ScientistConfig = z.infer<typeof ScientistConfigSchema>;
export type OrchestratorConfig = z.infer<typeof OrchestratorConfigSchema>;
export type ContextRecoveryConfig = z.infer<typeof ContextRecoveryConfigSchema>;
export type EditErrorRecoveryConfig = z.infer<typeof EditErrorRecoveryConfigSchema>;

export type HookName =
  | "todo-continuation-enforcer"
  | "keyword-detector"
  | "ralph-loop"
  | "session-recovery"
  | "agent-usage-reminder"
  | "context-window-monitor"
  | "comment-checker"
  | "tool-output-truncator"
  | "system-prompt-injector"
  | "persistent-mode"
  | "remember-tag-processor"
  | "autopilot"
  | "ultraqa-loop"
  | "context-recovery"
  | "edit-error-recovery"
  | "omc-orchestrator";

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
    autopilot: {
      enabled: true,
      maxPhaseRetries: 3,
      delegationEnforcement: 'warn',
    },
    ultraqa: {
      enabled: true,
      maxIterations: 10,
    },
    orchestrator: {
      delegationEnforcement: 'warn',
      auditLogEnabled: true,
    },
  };
}
