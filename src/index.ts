import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import { loadConfig } from "./config";
import { createBackgroundManager } from "./tools/background-manager";
import { createBackgroundTools } from "./tools/background-tools";
import { createCallOmoAgent } from "./tools/call-omo-agent";

const OmoOmcsPlugin: Plugin = async (ctx: PluginInput) => {
  const config = loadConfig(ctx.directory);
  console.log("[omo-omcs] Config loaded:", config);

  const backgroundManager = createBackgroundManager(ctx, config.background_task);
  const backgroundTools = createBackgroundTools(backgroundManager, ctx.client);
  const callOmoAgent = createCallOmoAgent(ctx, backgroundManager);

  return {
    config: async () => {},
    event: async () => {},
    tool: {
      ...backgroundTools,
      call_omo_agent: callOmoAgent,
    },
  };
};

export default OmoOmcsPlugin;
