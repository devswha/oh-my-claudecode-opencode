import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { loadConfig } from "./config";
import { createBackgroundManager } from "./tools/background-manager";
import { createBackgroundTools } from "./tools/background-tools";
import { createCallOmcoAgent } from "./tools/call-omco-agent";
import { createTestAgentsTool } from "./tools/test-agents";
import { createModelResolutionService } from "./tools/model-resolution-service";
import { createConfigHandler } from "./plugin-handlers/config-handler";
import { createRalphLoopHook } from "./hooks/ralph-loop";
import { createPersistentModeHook, checkPersistentModes } from "./hooks/persistent-mode";
import { createSystemPromptInjector, type ActiveMode } from "./hooks/system-prompt-injector";
import { createRememberTagProcessor } from "./hooks/remember-tag-processor";
import { createSkillInjector } from "./hooks/skill-injector";
import { createAutopilotHook } from "./hooks/autopilot";
import { createUltraQALoopHook } from "./hooks/ultraqa-loop";
import { createContextRecoveryHook } from "./hooks/context-recovery";
import { createEditErrorRecoveryHook } from "./hooks/edit-error-recovery";
import { createOmcOrchestratorHook } from "./hooks/omc-orchestrator";
import { createTuiStatusHook } from "./hooks/tui-status";
import { log } from "./shared/logger";
import { resumeSession, isSessionPaused } from "./state/session-pause-state";

const OmoOmcsPlugin: Plugin = async (ctx: PluginInput) => {
  const pluginConfig = loadConfig(ctx.directory);
  console.log("[omco] Config loaded:", pluginConfig);

  // Create model resolution service for tier-based model mapping
  const modelService = createModelResolutionService(
    pluginConfig.model_mapping,
    pluginConfig.agents
  );
  
  if (modelService.isTierMappingConfigured()) {
    log("[omco] Model tier mapping configured - agents will use tier-specific models");
  }

  const backgroundManager = createBackgroundManager(ctx, pluginConfig.background_task, modelService);
  const backgroundTools = createBackgroundTools(backgroundManager, ctx.client);
  const callOmcoAgent = createCallOmcoAgent(ctx, backgroundManager, modelService, pluginConfig.categories);
  const testAgentsTool = createTestAgentsTool(ctx, backgroundManager);

  // Create system prompt injector for mode tracking
  const systemPromptInjector = createSystemPromptInjector(ctx);

  // Create skill injector instance
  const skillInjector = createSkillInjector(ctx);

  // Create ralph loop hook with mode change callback
  const ralphLoop = createRalphLoopHook(ctx, {
    config: pluginConfig.ralph_loop,
    onModeChange: (sessionID: string, mode: ActiveMode | null, task?: string) => {
      if (mode) {
        systemPromptInjector.setMode(sessionID, mode, task);
      } else {
        systemPromptInjector.clearMode(sessionID);
      }
    },
  });

  // Initialize persistent mode hook (checkPersistentModes is used directly in event handler)
  createPersistentModeHook(ctx, {
    injectNotepadContext: true,
  });

  // Create remember tag processor for tool.execute.after
  const rememberTagProcessor = createRememberTagProcessor(ctx);

  // Create new v0.2.0 hooks
  const autopilot = createAutopilotHook(ctx, {
    config: pluginConfig.autopilot,
    onPhaseChange: (sessionID: string, phase) => {
      log("[autopilot] Phase changed", { sessionID, phase });
    },
  });

  const ultraqaLoop = createUltraQALoopHook(ctx, {
    config: pluginConfig.ultraqa,
  });

  const contextRecovery = createContextRecoveryHook(ctx, {
    enabled: pluginConfig.context_recovery?.enabled ?? true,
  });

  const editErrorRecovery = createEditErrorRecoveryHook(ctx, {
    enabled: pluginConfig.edit_error_recovery?.enabled ?? true,
    maxRetries: pluginConfig.edit_error_recovery?.maxRetries ?? 3,
    showToasts: pluginConfig.edit_error_recovery?.showToasts ?? true,
  });

  const omcOrchestrator = createOmcOrchestratorHook(ctx, {
    delegationEnforcement: pluginConfig.orchestrator?.delegationEnforcement ?? 'warn',
    auditLogEnabled: pluginConfig.orchestrator?.auditLogEnabled ?? true,
  });

  // Create TUI status hook for agent visibility notifications and metrics
  const tuiStatus = createTuiStatusHook(ctx, {
    enabled: pluginConfig.tui_status?.enabled ?? true,
    showAgentNotifications: pluginConfig.tui_status?.showAgentNotifications ?? true,
    showModeChanges: pluginConfig.tui_status?.showModeChanges ?? true,
    toastDuration: pluginConfig.tui_status?.toastDuration ?? 3000,
    trackMetrics: pluginConfig.tui_status?.trackMetrics ?? true,
  });

  // Create config handler for agent/command registration
  const configHandler = createConfigHandler({
    ctx,
    pluginConfig,
  });

  return {
    config: configHandler,
    event: async (input: { event: { type: string; properties?: unknown } }) => {
      const { event } = input;
      const props = event.properties as Record<string, unknown> | undefined;

      // Handle ralph loop events
      await ralphLoop.event(input);

      // Handle autopilot events
      await autopilot.event(input);

      // Handle ultraqa events
      await ultraqaLoop.event(input);

      // Handle session.idle for persistent mode continuation
      if (event.type === "session.idle") {
        const sessionID = props?.sessionID as string | undefined;
        if (sessionID) {
          const result = await checkPersistentModes(ctx, sessionID, {
            injectNotepadContext: true,
          });

          if (result.shouldContinue && result.message) {
            log(`Persistent mode continuation`, { mode: result.mode, sessionID });
            // The continuation is handled by ralph-loop or persistent-mode hook
          }
        }
      }
    },
    "chat.message": async (
      input: { sessionID: string; agent?: string },
      output: { message: unknown; parts: Array<{ type: string; text?: string }> }
    ) => {
      // Detect ralph-loop/ultrawork-ralph activation from slash command
      const promptText = output.parts
        ?.filter((p) => p.type === "text" && p.text)
        .map((p) => p.text)
        .join("\n")
        .trim() || "";

      const isRalphLoopTemplate = promptText.includes("RALPH LOOP ACTIVATED") ||
        promptText.includes("ULTRAWORK-RALPH ACTIVATED");
      const isCancelRalphTemplate = promptText.includes("Cancel the currently active Ralph Loop");

      if (isRalphLoopTemplate) {
        const taskMatch = promptText.match(/<user-task>\s*([\s\S]*?)\s*<\/user-task>/i);
        const rawTask = taskMatch?.[1]?.trim() || "";
        const prompt = rawTask || "Complete the task as instructed";
        const isUltraworkRalph = promptText.includes("ULTRAWORK-RALPH");

        log("[ralph-loop] Starting loop from chat.message", {
          sessionID: input.sessionID,
          prompt: prompt.substring(0, 50),
          mode: isUltraworkRalph ? "ultrawork-ralph" : "ralph-loop",
        });

        ralphLoop.startLoop(input.sessionID, prompt, {
          mode: isUltraworkRalph ? "ultrawork-ralph" : "ralph-loop",
        });
      }

      if (isCancelRalphTemplate) {
        log("[ralph-loop] Cancelling loop from chat.message", {
          sessionID: input.sessionID,
        });
        ralphLoop.cancelLoop(input.sessionID);
      }

      // Detect and inject skills based on context
      const skillInjection = skillInjector.detectAndInject(input.sessionID, promptText);
      if (skillInjection.skill) {
        systemPromptInjector.setSkillInjection(input.sessionID, skillInjection);
      } else {
        // Clear skill injection when no context detected (prevents persistence bug)
        systemPromptInjector.clearSkillInjection(input.sessionID);
      }

      // Auto-resume session on any user prompt (clears ESC/abort pause)
      if (isSessionPaused(input.sessionID)) {
        resumeSession(input.sessionID);
        log("[session] Auto-resumed on user prompt", { sessionID: input.sessionID });
      }

      // Handle autopilot chat messages
      await autopilot["chat.message"](input, output);

      // Handle ultraqa chat messages
      await ultraqaLoop["chat.message"](input, output);
    },
    "experimental.chat.system.transform": systemPromptInjector["experimental.chat.system.transform"],
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> }
    ): Promise<void> => {
      // Block delegate_task in task tool to prevent infinite delegation loops
      if (input.tool === "task") {
        const tools = output.args?.tools as Record<string, boolean> | undefined;
        if (tools) {
          tools.delegate_task = false;
          log("Blocked delegate_task in task tool");
        }
      }

      // Run orchestrator validation
      await omcOrchestrator["tool.execute.before"](input, output);

      // TUI status - notify agent spawning
      await tuiStatus["tool.execute.before"](input, output);
    },
    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { title: string; output: string; metadata: any }
    ): Promise<void> => {
      // Process remember tags
      await rememberTagProcessor["tool.execute.after"](input, output);

      // Context recovery
      await contextRecovery["tool.execute.after"](input, output);

      // Edit error recovery
      await editErrorRecovery["tool.execute.after"](input, output);

      // TUI status - notify agent completion
      await tuiStatus["tool.execute.after"](input, output);
    },
    tool: {
      ...backgroundTools,
      call_omco_agent: callOmcoAgent,
      test_omco_agents: testAgentsTool,
    },
  };
};

export default OmoOmcsPlugin;
