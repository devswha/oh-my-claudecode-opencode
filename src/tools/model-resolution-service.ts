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
   * Check if tier mapping is configured (tierDefaults has provider/model format)
   */
  isTierMappingConfigured(): boolean;
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
  
  const isTierMappingConfigured = (): boolean => {
    return hasConfiguredTiers;
  };
  
  return {
    resolveModelForAgent,
    isTierMappingConfigured,
  };
}
