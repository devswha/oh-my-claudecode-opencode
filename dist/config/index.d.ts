import { z } from "zod";
declare const AgentConfigSchema: z.ZodObject<{
    model: z.ZodOptional<z.ZodString>;
    temperature: z.ZodOptional<z.ZodNumber>;
    top_p: z.ZodOptional<z.ZodNumber>;
    disable: z.ZodOptional<z.ZodBoolean>;
    prompt_append: z.ZodOptional<z.ZodString>;
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
declare const OmoOmcsConfigSchema: z.ZodObject<{
    $schema: z.ZodOptional<z.ZodString>;
    agents: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        model: z.ZodOptional<z.ZodString>;
        temperature: z.ZodOptional<z.ZodNumber>;
        top_p: z.ZodOptional<z.ZodNumber>;
        disable: z.ZodOptional<z.ZodBoolean>;
        prompt_append: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
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
    sisyphus_agent: z.ZodOptional<z.ZodObject<{
        disabled: z.ZodOptional<z.ZodBoolean>;
        planner_enabled: z.ZodOptional<z.ZodBoolean>;
        replace_plan: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type OmoOmcsConfig = z.infer<typeof OmoOmcsConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type BackgroundTaskConfig = z.infer<typeof BackgroundTaskConfigSchema>;
export type RalphLoopConfig = z.infer<typeof RalphLoopConfigSchema>;
export type HookName = "todo-continuation-enforcer" | "keyword-detector" | "ralph-loop" | "session-recovery" | "agent-usage-reminder" | "context-window-monitor" | "comment-checker" | "tool-output-truncator" | "system-prompt-injector" | "persistent-mode" | "remember-tag-processor";
export type AgentName = "oracle" | "librarian" | "explore" | "frontend-ui-ux-engineer" | "document-writer" | "multimodal-looker";
export declare function loadConfig(directory: string): OmoOmcsConfig;
export {};
