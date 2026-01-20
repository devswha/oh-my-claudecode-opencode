import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { createTodoContinuationEnforcer } from "./hooks/todo-continuation-enforcer";
import { createKeywordDetectorHook } from "./hooks/keyword-detector";
import { createRalphLoopHook } from "./hooks/ralph-loop";
import { createSessionRecoveryHook } from "./hooks/session-recovery";
import { createAgentUsageReminderHook } from "./hooks/agent-usage-reminder";
import { createBackgroundManager } from "./tools/background-manager";
import { createBackgroundTools } from "./tools/background-tools";
import { createCallOmoAgent } from "./tools/call-omo-agent";
import { builtinTools } from "./tools/builtin";
import { loadConfig } from "./config";
import { setMainSessionID } from "./shared/session-state";

let mainSessionID: string | undefined;

const OmoOmcsPlugin: Plugin = async (ctx: PluginInput) => {
  const config = loadConfig(ctx.directory);
  const disabledHooks = new Set(config.disabled_hooks ?? []);
  const isHookEnabled = (hookName: string) => !disabledHooks.has(hookName);

  const backgroundManager = createBackgroundManager(ctx, config.background_task);

  const todoContinuationEnforcer = isHookEnabled("todo-continuation-enforcer")
    ? createTodoContinuationEnforcer(ctx, { backgroundManager })
    : null;

  const keywordDetector = isHookEnabled("keyword-detector")
    ? createKeywordDetectorHook(ctx)
    : null;

  const ralphLoop = isHookEnabled("ralph-loop")
    ? createRalphLoopHook(ctx, { config: config.ralph_loop })
    : null;

  const sessionRecovery = isHookEnabled("session-recovery")
    ? createSessionRecoveryHook(ctx)
    : null;

  const agentUsageReminder = isHookEnabled("agent-usage-reminder")
    ? createAgentUsageReminderHook(ctx)
    : null;

  if (sessionRecovery && todoContinuationEnforcer) {
    sessionRecovery.setOnAbortCallback(todoContinuationEnforcer.markRecovering);
    sessionRecovery.setOnRecoveryCompleteCallback(
      todoContinuationEnforcer.markRecoveryComplete
    );
  }

  const backgroundTools = createBackgroundTools(backgroundManager, ctx.client);
  const callOmoAgent = createCallOmoAgent(ctx, backgroundManager);

  return {
    tool: {
      ...builtinTools,
      ...backgroundTools,
      call_omo_agent: callOmoAgent,
    },

    "chat.message": async (input, output) => {
      await keywordDetector?.["chat.message"]?.(input, output);

      if (ralphLoop) {
        const parts = (output as { parts?: Array<{ type: string; text?: string }> }).parts;
        const promptText = parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n")
          .trim() || "";

        if (promptText.includes("/ralph-loop")) {
          const taskMatch = promptText.match(/\/ralph-loop\s+["']?(.+?)["']?$/);
          const prompt = taskMatch?.[1] || "Complete the task";
          ralphLoop.startLoop(input.sessionID, prompt);
        } else if (promptText.includes("/cancel-ralph")) {
          ralphLoop.cancelLoop(input.sessionID);
        }
      }
    },

    event: async (input) => {
      const { event } = input;
      const props = event.properties as Record<string, unknown> | undefined;

      await todoContinuationEnforcer?.handler(input);
      await ralphLoop?.event(input);

      if (event.type === "session.created") {
        const sessionInfo = props?.info as { id?: string; parentID?: string } | undefined;
        if (!sessionInfo?.parentID) {
          mainSessionID = sessionInfo?.id;
          setMainSessionID(mainSessionID);
        }
      }

      if (event.type === "session.deleted") {
        const sessionInfo = props?.info as { id?: string } | undefined;
        if (sessionInfo?.id === mainSessionID) {
          mainSessionID = undefined;
          setMainSessionID(undefined);
        }
      }

      if (event.type === "session.error" && sessionRecovery) {
        const error = props?.error;
        if (sessionRecovery.isRecoverableError(error)) {
          const sessionID = props?.sessionID as string | undefined;
          await sessionRecovery.handleSessionRecovery({ sessionID, error });
        }
      }
    },

    "tool.execute.before": async (_input, output) => {
      if (_input.tool === "task") {
        const args = output.args as Record<string, unknown>;
        args.tools = {
          ...(args.tools as Record<string, boolean> | undefined),
          delegate_task: false,
        };
      }
    },

    "tool.execute.after": async (input, output) => {
      await agentUsageReminder?.["tool.execute.after"]?.(input, output);
    },
  };
};

export default OmoOmcsPlugin;

export type { OmoOmcsConfig } from "./config";
export { getMainSessionID } from "./shared/session-state";
