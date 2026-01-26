export type ModelTier = "haiku" | "sonnet" | "opus";
export type ConcreteModel = string;
export interface TierModelMapping {
    haiku: ConcreteModel;
    sonnet: ConcreteModel;
    opus: ConcreteModel;
}
export interface ModelMappingConfig {
    tierDefaults?: Partial<TierModelMapping>;
    debugLogging?: boolean;
}
export interface AgentModelConfig {
    model?: ConcreteModel;
    tier?: ModelTier;
    temperature?: number;
    top_p?: number;
    disable?: boolean;
    prompt_append?: string;
}
export interface ModelResolutionResult {
    model: ConcreteModel;
    source: "per-agent-override" | "tier-default" | "hardcoded-fallback";
    originalTier?: ModelTier;
}
/**
 * Default tier-to-model mapping.
 * These use generic names - configure model_mapping.tierDefaults in
 * ~/.config/opencode/oh-my-opencode.json for your specific provider.
 *
 * Example config:
 * {
 *   "model_mapping": {
 *     "tierDefaults": {
 *       "haiku": "google/gemini-2.0-flash",
 *       "sonnet": "anthropic/claude-sonnet-4",
 *       "opus": "anthropic/claude-opus-4"
 *     }
 *   }
 * }
 */
export declare const HARDCODED_TIER_DEFAULTS: TierModelMapping;
/**
 * Check if model follows "provider/model-name" pattern or is a simple tier name
 */
export declare function isValidModelFormat(model: string): boolean;
/**
 * Log warning if invalid format (skip for simple tier names)
 */
export declare function validateModelFormat(model: string, context: string): void;
export declare class ModelResolver {
    private tierDefaults;
    private debugLogging;
    constructor(config?: ModelMappingConfig);
    /**
     * Resolve model for an agent based on priority chain
     */
    resolve(agentName: string, agentDefinitionTier: ModelTier | undefined, agentOverride?: AgentModelConfig): ModelResolutionResult;
    /**
     * Get current tier defaults
     */
    getTierDefaults(): TierModelMapping;
}
