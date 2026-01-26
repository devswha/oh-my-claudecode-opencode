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
import { type AgentModelConfig, type ModelMappingConfig } from "../config/model-resolver";
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
    resolveModelForAgent(agentName: string, fallbackModel?: ModelConfig): ModelConfig | undefined;
    /**
     * Check if tier mapping is configured (tierDefaults has provider/model format)
     */
    isTierMappingConfigured(): boolean;
}
/**
 * Create a ModelResolutionService instance
 *
 * @param modelMappingConfig - Config from omco.json model_mapping section
 * @param agentOverrides - Per-agent config overrides from omco.json agents section
 */
export declare function createModelResolutionService(modelMappingConfig?: ModelMappingConfig, agentOverrides?: Record<string, AgentModelConfig>): ModelResolutionService;
