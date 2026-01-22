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
export declare const HARDCODED_TIER_DEFAULTS: TierModelMapping;
/**
 * Check if model follows "provider/model-name" pattern
 */
export declare function isValidModelFormat(model: string): boolean;
/**
 * Log warning if invalid format
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
