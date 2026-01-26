import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const AgentConfigSchema = z.object({
  model: z.string().optional(),
  tier: z.enum(["haiku", "sonnet", "opus"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  disable: z.boolean().optional(),
  enabled: z.boolean().optional(),
  prompt_append: z.string().optional(),
});

// Features configuration
const FeaturesConfigSchema = z.object({
  parallelExecution: z.boolean().optional(),
  lspTools: z.boolean().optional(),
  astTools: z.boolean().optional(),
  continuationEnforcement: z.boolean().optional(),
  autoContextInjection: z.boolean().optional(),
});

// MCP Servers configuration
const McpServerConfigSchema = z.object({
  enabled: z.boolean().optional(),
  apiKey: z.string().optional(),
});

const McpServersConfigSchema = z.object({
  exa: McpServerConfigSchema.optional(),
  context7: McpServerConfigSchema.optional(),
  grepApp: McpServerConfigSchema.optional(),
});

// Permissions configuration
const PermissionsConfigSchema = z.object({
  allowBash: z.boolean().optional(),
  allowEdit: z.boolean().optional(),
  allowWrite: z.boolean().optional(),
  maxBackgroundTasks: z.number().min(1).max(20).optional(),
});

// Magic Keywords configuration
const MagicKeywordsConfigSchema = z.object({
  ultrawork: z.array(z.string()).optional(),
  search: z.array(z.string()).optional(),
  analyze: z.array(z.string()).optional(),
  ultrathink: z.array(z.string()).optional(),
});

// Routing configuration
const AgentOverrideSchema = z.object({
  tier: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  reason: z.string().optional(),
});

const RoutingConfigSchema = z.object({
  enabled: z.boolean().optional(),
  defaultTier: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  escalationEnabled: z.boolean().optional(),
  maxEscalations: z.number().min(0).max(5).optional(),
  tierModels: z.object({
    LOW: z.string().optional(),
    MEDIUM: z.string().optional(),
    HIGH: z.string().optional(),
  }).optional(),
  agentOverrides: z.record(z.string(), AgentOverrideSchema).optional(),
  escalationKeywords: z.array(z.string()).optional(),
  simplificationKeywords: z.array(z.string()).optional(),
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
  features: FeaturesConfigSchema.optional(),
  mcpServers: McpServersConfigSchema.optional(),
  permissions: PermissionsConfigSchema.optional(),
  magicKeywords: MagicKeywordsConfigSchema.optional(),
  routing: RoutingConfigSchema.optional(),
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
  omco_agent: z.object({
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
export type FeaturesConfig = z.infer<typeof FeaturesConfigSchema>;
export type McpServersConfig = z.infer<typeof McpServersConfigSchema>;
export type PermissionsConfig = z.infer<typeof PermissionsConfigSchema>;
export type MagicKeywordsConfig = z.infer<typeof MagicKeywordsConfigSchema>;
export type RoutingConfig = z.infer<typeof RoutingConfigSchema>;

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
  | "omc"
  | "architect"
  | "researcher"
  | "explore"
  | "frontendEngineer"
  | "documentWriter"
  | "multimodalLooker"
  | "critic"
  | "analyst"
  | "planner"
  // Legacy names for backward compatibility
  | "oracle"
  | "librarian"
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
    join(directory, ".opencode", "omco.json"),
    join(directory, ".opencode", "omco.jsonc"),
    join(process.env.HOME || "", ".config", "opencode", "omco.json"),
    join(process.env.HOME || "", ".config", "opencode", "omco.jsonc"),
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
      omc: { tier: 'opus', enabled: true },
      architect: { tier: 'opus', enabled: true },
      researcher: { tier: 'sonnet', enabled: true },
      explore: { tier: 'haiku', enabled: true },
      frontendEngineer: { tier: 'sonnet', enabled: true },
      documentWriter: { tier: 'haiku', enabled: true },
      multimodalLooker: { tier: 'sonnet', enabled: true },
      critic: { tier: 'opus', enabled: true },
      analyst: { tier: 'opus', enabled: true },
      planner: { tier: 'opus', enabled: true },
    },
    features: {
      parallelExecution: true,
      lspTools: true,
      astTools: true,
      continuationEnforcement: true,
      autoContextInjection: true,
    },
    mcpServers: {
      exa: { enabled: true },
      context7: { enabled: true },
      grepApp: { enabled: true },
    },
    permissions: {
      allowBash: true,
      allowEdit: true,
      allowWrite: true,
      maxBackgroundTasks: 5,
    },
    magicKeywords: {
      ultrawork: ['ultrawork', 'ulw', 'uw'],
      search: ['search', 'find', 'locate'],
      analyze: ['analyze', 'investigate', 'examine'],
      ultrathink: ['ultrathink', 'think', 'reason', 'ponder'],
    },
    routing: {
      enabled: true,
      defaultTier: 'MEDIUM',
      escalationEnabled: true,
      maxEscalations: 2,
      agentOverrides: {
        architect: { tier: 'HIGH', reason: 'Advisory agent requires deep reasoning' },
        planner: { tier: 'HIGH', reason: 'Strategic planning requires deep reasoning' },
        critic: { tier: 'HIGH', reason: 'Critical review requires deep reasoning' },
        analyst: { tier: 'HIGH', reason: 'Pre-planning analysis requires deep reasoning' },
        explore: { tier: 'LOW', reason: 'Exploration is search-focused' },
        documentWriter: { tier: 'LOW', reason: 'Documentation is straightforward' },
      },
      escalationKeywords: [
        'critical', 'production', 'urgent', 'security', 'breaking',
        'architecture', 'refactor', 'redesign', 'root cause',
      ],
      simplificationKeywords: [
        'find', 'list', 'show', 'where', 'search', 'locate', 'grep',
      ],
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
    omco_agent: {
      disabled: false,
    },
  };
}
