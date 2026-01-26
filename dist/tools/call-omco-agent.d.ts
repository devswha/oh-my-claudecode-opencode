import { type PluginInput, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";
import type { ModelResolutionService } from "./model-resolution-service";
import type { CategoriesConfig } from "../categories/types";
export declare function createCallOmcoAgent(ctx: PluginInput, manager: BackgroundManager, modelService?: ModelResolutionService, userCategories?: CategoriesConfig): ToolDefinition;
