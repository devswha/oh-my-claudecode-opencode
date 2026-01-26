/**
 * Model Resolution Service
 * 
 * Centralized model resolution for agent invocations.
 * Connects ModelResolver (config-based tier mapping) to runtime tool calls.
 * 
 * Priority chain:
 * 1. Per-agent config model override
 * 2. Per-agent config tier → tierDefaults
 * 3. Agent definition tier → tierDefaults  
 * 4. Fallback to sonnet tier
 * 5. If all else fails, use parent session model
 * 
 * Workaround:
 * - opusReadOnlyFallbackToSonnet: opus + readOnly agents → sonnet (OpenCode bug workaround)
 */

import { ModelResolver, type ModelTier, type AgentModelConfig, type ModelMappingConfig } from "../config/model-resolver";
import { getAgent } from "../agents";
import { log } from "../shared/logger";

export interface ModelConfig {
  providerID: string;
  modelID: string;
}

export interface ModelResolutionService {
  /**
   * Resolve model for an agent based on tier configuration
   * @param agentName - Name of the agent (canonical or alias)
   * @param fallbackModel - Parent session model to use if resolution fails
   * @returns Resolved ModelConfig or undefined if should use fallback
   */
  resolveModelForAgent(
    agentName: string,
    fallbackModel?: ModelConfig
  ): ModelConfig | undefined;

  /**
   * Resolve model for an agent, always returning a result or throwing
   * @param agentName - Name of the agent (canonical or alias)
   * @param fallbackModel - Parent session model to use if resolution fails
   * @returns Resolved ModelConfig (never undefined)
   * @throws Error with actionable message if model cannot be resolved
   */
  resolveModelForAgentOrThrow(
    agentName: string,
    fallbackModel?: ModelConfig
  ): ModelConfig;

  /**
   * Check if tier mapping is configured (tierDefaults has provider/model format)
   */
  isTierMappingConfigured(): boolean;

  /**
   * Resolve model for a category-based tier (abstract tier name)
   * @param categoryTier - Abstract tier name (haiku, sonnet, opus)
   * @param fallbackModel - Parent session model to use if resolution fails
   * @returns Resolved ModelConfig or undefined if no mapping found
   */
  resolveModelForCategory(
    categoryTier: string,
    fallbackModel?: ModelConfig
  ): ModelConfig | undefined;
}

/**
 * Parse a model string in "providerID/modelID" format to ModelConfig
 */
function parseModelString(model: string): ModelConfig | undefined {
  // Simple tier names like "haiku", "sonnet", "opus" are not resolvable to provider/model
  if (!model.includes("/")) {
    return undefined;
  }
  
  const [providerID, ...rest] = model.split("/");
  const modelID = rest.join("/"); // Handle models with "/" in name
  
  if (!providerID || !modelID) {
    return undefined;
  }
  
  return { providerID, modelID };
}

/**
 * Create a ModelResolutionService instance
 * 
 * @param modelMappingConfig - Config from omco.json model_mapping section
 * @param agentOverrides - Per-agent config overrides from omco.json agents section
 */
export function createModelResolutionService(
  modelMappingConfig?: ModelMappingConfig,
  agentOverrides?: Record<string, AgentModelConfig>
): ModelResolutionService {
  const resolver = new ModelResolver(modelMappingConfig);
  const debugLogging = modelMappingConfig?.debugLogging ?? false;
  const opusReadOnlyFallback = modelMappingConfig?.opusReadOnlyFallbackToSonnet ?? false;
  
  // Check if any tierDefault has a real provider/model format
  const tierDefaults = resolver.getTierDefaults();
  const hasConfiguredTiers = Object.values(tierDefaults).some(m => m.includes("/"));
  
  const resolveModelForAgent = (
    agentName: string,
    fallbackModel?: ModelConfig
  ): ModelConfig | undefined => {
    // Get agent definition to find its tier and readOnly status
    const agentDef = getAgent(agentName);
    const agentTier: ModelTier | undefined = agentDef?.model;
    const isReadOnly = agentDef?.readOnly ?? false;
    
    // Workaround: opus + readOnly → sonnet (OpenCode runtime bug)
    let effectiveTier = agentTier;
    if (opusReadOnlyFallback && agentTier === "opus" && isReadOnly) {
      effectiveTier = "sonnet";
      if (debugLogging) {
        log(`[model-resolution] ${agentName}: opus+readOnly fallback to sonnet (opusReadOnlyFallbackToSonnet enabled)`);
      }
    }
    
    // Get per-agent override from config
    const agentOverride = agentOverrides?.[agentName];
    
    // Resolve via ModelResolver (handles priority chain)
    const resolution = resolver.resolve(agentName, effectiveTier, agentOverride);
    
    // Parse the resolved model string to ModelConfig
    const modelConfig = parseModelString(resolution.model);
    
    if (modelConfig) {
      if (debugLogging) {
        log(`[model-resolution] Resolved ${agentName}: ${resolution.model} (source: ${resolution.source})`);
      }
      return modelConfig;
    }
    
    // Model string wasn't in provider/model format (e.g., just "sonnet")
    // This means no tier mapping configured - use fallback
    if (debugLogging) {
      log(`[model-resolution] ${agentName}: No provider mapping for "${resolution.model}", using fallback`, {
        fallback: fallbackModel ? `${fallbackModel.providerID}/${fallbackModel.modelID}` : "none",
      });
    }
    
    return fallbackModel;
  };
  
  const resolveModelForAgentOrThrow = (
    agentName: string,
    fallbackModel?: ModelConfig
  ): ModelConfig => {
    const result = resolveModelForAgent(agentName, fallbackModel);

    if (result) return result;

    // No model could be resolved - throw with actionable error
    const tierDefaults = resolver.getTierDefaults();
    const hasConfiguredTiers = Object.values(tierDefaults).some(m => m.includes("/"));

    let errorMessage = `[OMCO] Cannot resolve model for agent "${agentName}".`;

    if (!hasConfiguredTiers) {
      errorMessage += `\n\nNo tier mapping configured. Run one of:\n` +
        `  1. npx omco-setup (interactive setup)\n` +
        `  2. Add tierDefaults to ~/.config/opencode/omco.json:\n` +
        `     {\n` +
        `       "model_mapping": {\n` +
        `         "tierDefaults": {\n` +
        `           "haiku": "openai/gpt-4o-mini",\n` +
        `           "sonnet": "openai/gpt-4o",\n` +
        `           "opus": "openai/o1"\n` +
        `         }\n` +
        `       }\n` +
        `     }`;
    } else {
      errorMessage += `\n\nTier mapping is configured but no fallback model available.\n` +
        `This usually means the parent session hasn't started yet.\n` +
        `Try sending a message first to establish the session model.`;
    }

    throw new Error(errorMessage);
  };

  const isTierMappingConfigured = (): boolean => {
    return hasConfiguredTiers;
  };

  const resolveModelForCategory = (
    categoryTier: string,
    fallbackModel?: ModelConfig
  ): ModelConfig | undefined => {
    // Get the tier mapping from tierDefaults
    const tierDefaults = resolver.getTierDefaults();
    const mappedModel = tierDefaults[categoryTier as ModelTier];

    // Try to parse the mapped model to provider/model format
    if (mappedModel) {
      const modelConfig = parseModelString(mappedModel);

      if (modelConfig) {
        if (debugLogging) {
          log(`[model-resolution] Resolved category tier "${categoryTier}": ${mappedModel}`);
        }
        return modelConfig;
      }
    }

    // No valid mapping found, use fallback
    if (debugLogging) {
      log(`[model-resolution] No mapping for category tier "${categoryTier}", using fallback`, {
        fallback: fallbackModel ? `${fallbackModel.providerID}/${fallbackModel.modelID}` : "none",
      });
    }

    return fallbackModel;
  };

  return {
    resolveModelForAgent,
    resolveModelForAgentOrThrow,
    isTierMappingConfigured,
    resolveModelForCategory,
  };
}
