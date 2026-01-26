import { z } from "zod";
declare const AgentConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    tier: z.ZodOptional<z.ZodEnum<{
        haiku: "haiku";
        sonnet: "sonnet";
        opus: "opus";
    }>>;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
    disable: z.ZodOptional<z.ZodBoolean>;
    enabled: z.ZodOptional<z.ZodBoolean>;
    prompt_append: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const FeaturesConfigSchema: z.ZodObject<{
    parallelExecution: z.ZodOptional<z.ZodBoolean>;
    lspTools: z.ZodOptional<z.ZodBoolean>;
    astTools: z.ZodOptional<z.ZodBoolean>;
    continuationEnforcement: z.ZodOptional<z.ZodBoolean>;
    autoContextInjection: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const McpServersConfigSchema: z.ZodObject<{
    exa: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        apiKey: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    context7: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        apiKey: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    grepApp: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        apiKey: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
declare const PermissionsConfigSchema: z.ZodObject<{
    allowBash: z.ZodOptional<z.ZodBoolean>;
    allowEdit: z.ZodOptional<z.ZodBoolean>;
    allowWrite: z.ZodOptional<z.ZodBoolean>;
    maxBackgroundTasks: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const MagicKeywordsConfigSchema: z.ZodObject<{
    ultrawork: z.ZodOptional<z.ZodArray<z.ZodString>>;
    search: z.ZodOptional<z.ZodArray<z.ZodString>>;
    analyze: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ultrathink: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
declare const RoutingConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    defaultTier: z.ZodOptional<z.ZodEnum<{
        LOW: "LOW";
        MEDIUM: "MEDIUM";
        HIGH: "HIGH";
    }>>;
    escalationEnabled: z.ZodOptional<z.ZodBoolean>;
    maxEscalations: z.ZodOptional<z.ZodNumber>;
    tierModels: z.ZodOptional<z.ZodObject<{
        LOW: z.ZodOptional<z.ZodString>;
        MEDIUM: z.ZodOptional<z.ZodString>;
        HIGH: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    agentOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        tier: z.ZodEnum<{
            LOW: "LOW";
            MEDIUM: "MEDIUM";
            HIGH: "HIGH";
        }>;
        reason: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    escalationKeywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
    simplificationKeywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
declare const ModelMappingConfigSchema: z.ZodObject<{
    tierDefaults: z.ZodOptional<z.ZodObject<{
        haiku: z.ZodOptional<z.ZodString>;
        sonnet: z.ZodOptional<z.ZodString>;
        opus: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    debugLogging: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const BackgroundTaskConfigSchema: z.ZodObject<{
    defaultConcurrency: z.ZodOptional<z.ZodNumber>;
    providerConcurrency: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    modelConcurrency: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
}, z.core.$strip>;
declare const RalphLoopConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    default_max_iterations: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
declare const AutopilotConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    maxPhaseRetries: z.ZodOptional<z.ZodNumber>;
    delegationEnforcement: z.ZodOptional<z.ZodEnum<{
        strict: "strict";
        warn: "warn";
        off: "off";
    }>>;
}, z.core.$strip>;
declare const UltraQAConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    maxIterations: z.ZodOptional<z.ZodNumber>;
    buildCommand: z.ZodOptional<z.ZodString>;
    testCommand: z.ZodOptional<z.ZodString>;
    lintCommand: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
declare const ScientistConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    replFallback: z.ZodOptional<z.ZodEnum<{
        bash: "bash";
        disabled: "disabled";
    }>>;
}, z.core.$strip>;
declare const OrchestratorConfigSchema: z.ZodObject<{
    delegationEnforcement: z.ZodOptional<z.ZodEnum<{
        strict: "strict";
        warn: "warn";
        off: "off";
    }>>;
    auditLogEnabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const ContextRecoveryConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const EditErrorRecoveryConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    maxRetries: z.ZodOptional<z.ZodNumber>;
    showToasts: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
declare const TuiStatusConfigSchema: z.ZodObject<{
    enabled: z.ZodOptional<z.ZodBoolean>;
    showAgentNotifications: z.ZodOptional<z.ZodBoolean>;
    showModeChanges: z.ZodOptional<z.ZodBoolean>;
    toastDuration: z.ZodOptional<z.ZodNumber>;
    trackMetrics: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type TuiStatusConfig = z.infer<typeof TuiStatusConfigSchema>;
declare const OmoOmcsConfigSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    agents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        tier: z.ZodOptional<z.ZodEnum<{
            haiku: "haiku";
            sonnet: "sonnet";
            opus: "opus";
        }>>;
        temperature: z.ZodOptional<z.ZodNumber>;
        top_p: z.ZodOptional<z.ZodNumber>;
        disable: z.ZodOptional<z.ZodBoolean>;
        enabled: z.ZodOptional<z.ZodBoolean>;
        prompt_append: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
    model_mapping: z.ZodOptional<z.ZodObject<{
        tierDefaults: z.ZodOptional<z.ZodObject<{
            haiku: z.ZodOptional<z.ZodString>;
            sonnet: z.ZodOptional<z.ZodString>;
            opus: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        debugLogging: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    features: z.ZodOptional<z.ZodObject<{
        parallelExecution: z.ZodOptional<z.ZodBoolean>;
        lspTools: z.ZodOptional<z.ZodBoolean>;
        astTools: z.ZodOptional<z.ZodBoolean>;
        continuationEnforcement: z.ZodOptional<z.ZodBoolean>;
        autoContextInjection: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    mcpServers: z.ZodOptional<z.ZodObject<{
        exa: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            apiKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        context7: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            apiKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        grepApp: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            apiKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    permissions: z.ZodOptional<z.ZodObject<{
        allowBash: z.ZodOptional<z.ZodBoolean>;
        allowEdit: z.ZodOptional<z.ZodBoolean>;
        allowWrite: z.ZodOptional<z.ZodBoolean>;
        maxBackgroundTasks: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    magicKeywords: z.ZodOptional<z.ZodObject<{
        ultrawork: z.ZodOptional<z.ZodArray<z.ZodString>>;
        search: z.ZodOptional<z.ZodArray<z.ZodString>>;
        analyze: z.ZodOptional<z.ZodArray<z.ZodString>>;
        ultrathink: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    routing: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        defaultTier: z.ZodOptional<z.ZodEnum<{
            LOW: "LOW";
            MEDIUM: "MEDIUM";
            HIGH: "HIGH";
        }>>;
        escalationEnabled: z.ZodOptional<z.ZodBoolean>;
        maxEscalations: z.ZodOptional<z.ZodNumber>;
        tierModels: z.ZodOptional<z.ZodObject<{
            LOW: z.ZodOptional<z.ZodString>;
            MEDIUM: z.ZodOptional<z.ZodString>;
            HIGH: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        agentOverrides: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            tier: z.ZodEnum<{
                LOW: "LOW";
                MEDIUM: "MEDIUM";
                HIGH: "HIGH";
            }>;
            reason: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>>;
        escalationKeywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
        simplificationKeywords: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>;
    disabled_hooks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    disabled_agents: z.ZodOptional<z.ZodArray<z.ZodString>>;
    disabled_skills: z.ZodOptional<z.ZodArray<z.ZodString>>;
    disabled_mcps: z.ZodOptional<z.ZodArray<z.ZodString>>;
    background_task: z.ZodOptional<z.ZodObject<{
        defaultConcurrency: z.ZodOptional<z.ZodNumber>;
        providerConcurrency: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        modelConcurrency: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    }, z.core.$strip>>;
    ralph_loop: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        default_max_iterations: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    autopilot: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        maxPhaseRetries: z.ZodOptional<z.ZodNumber>;
        delegationEnforcement: z.ZodOptional<z.ZodEnum<{
            strict: "strict";
            warn: "warn";
            off: "off";
        }>>;
    }, z.core.$strip>>;
    ultraqa: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        maxIterations: z.ZodOptional<z.ZodNumber>;
        buildCommand: z.ZodOptional<z.ZodString>;
        testCommand: z.ZodOptional<z.ZodString>;
        lintCommand: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    scientist: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        replFallback: z.ZodOptional<z.ZodEnum<{
            bash: "bash";
            disabled: "disabled";
        }>>;
    }, z.core.$strip>>;
    orchestrator: z.ZodOptional<z.ZodObject<{
        delegationEnforcement: z.ZodOptional<z.ZodEnum<{
            strict: "strict";
            warn: "warn";
            off: "off";
        }>>;
        auditLogEnabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    context_recovery: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    edit_error_recovery: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        maxRetries: z.ZodOptional<z.ZodNumber>;
        showToasts: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    tui_status: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodOptional<z.ZodBoolean>;
        showAgentNotifications: z.ZodOptional<z.ZodBoolean>;
        showModeChanges: z.ZodOptional<z.ZodBoolean>;
        toastDuration: z.ZodOptional<z.ZodNumber>;
        trackMetrics: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    omco_agent: z.ZodOptional<z.ZodObject<{
        disabled: z.ZodOptional<z.ZodBoolean>;
        planner_enabled: z.ZodOptional<z.ZodBoolean>;
        replace_plan: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
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
export type HookName = "todo-continuation-enforcer" | "keyword-detector" | "ralph-loop" | "session-recovery" | "agent-usage-reminder" | "context-window-monitor" | "comment-checker" | "tool-output-truncator" | "system-prompt-injector" | "persistent-mode" | "remember-tag-processor" | "autopilot" | "ultraqa-loop" | "context-recovery" | "edit-error-recovery" | "omc-orchestrator";
export type AgentName = "omc" | "architect" | "researcher" | "explore" | "frontendEngineer" | "documentWriter" | "multimodalLooker" | "critic" | "analyst" | "planner" | "oracle" | "librarian" | "frontend-ui-ux-engineer" | "document-writer" | "multimodal-looker";
export declare function loadConfig(directory: string): OmoOmcsConfig;
export {};
