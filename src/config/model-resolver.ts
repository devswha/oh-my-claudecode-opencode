import { log, warn } from "../shared/logger";

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
  /**
   * Workaround for OpenCode runtime bug where readOnly + opus agents fail
   * with "JSON Parse error: Unexpected EOF".
   * When enabled, opus tier agents with readOnly=true will use sonnet instead.
   */
  opusReadOnlyFallbackToSonnet?: boolean;
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
export const HARDCODED_TIER_DEFAULTS: TierModelMapping = {
  haiku: "haiku",
  sonnet: "sonnet",
  opus: "opus",
};

/**
 * Simple tier names that don't need provider prefix
 */
const SIMPLE_TIER_NAMES = new Set(["haiku", "sonnet", "opus"]);

/**
 * Check if model follows "provider/model-name" pattern or is a simple tier name
 */
export function isValidModelFormat(model: string): boolean {
  // Allow simple tier names
  if (SIMPLE_TIER_NAMES.has(model.toLowerCase())) {
    return true;
  }
  // Standard provider/model format
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(model);
}

/**
 * Log warning if invalid format (skip for simple tier names)
 */
export function validateModelFormat(model: string, context: string): void {
  if (!isValidModelFormat(model)) {
    warn(`[model-resolver] [${context}] Model "${model}" does not follow "provider/model-name" format. Configure model_mapping.tierDefaults in oh-my-opencode.json`);
  }
}

export class ModelResolver {
  private tierDefaults: TierModelMapping;
  private debugLogging: boolean;

  constructor(config?: ModelMappingConfig) {
    this.tierDefaults = {
      ...HARDCODED_TIER_DEFAULTS,
      ...config?.tierDefaults,
    };
    this.debugLogging = config?.debugLogging ?? false;
  }

  /**
   * Resolve model for an agent based on priority chain
   */
  resolve(
    agentName: string,
    agentDefinitionTier: ModelTier | undefined,
    agentOverride?: AgentModelConfig
  ): ModelResolutionResult {
    // Priority 1: Per-agent override model
    if (agentOverride?.model) {
      validateModelFormat(agentOverride.model, `agent=${agentName}`);
      if (this.debugLogging) {
        log(`[model-resolver] ${agentName}: per-agent-override model="${agentOverride.model}"`);
      }
      return {
        model: agentOverride.model,
        source: "per-agent-override",
      };
    }

    // Priority 2: Per-agent override tier → tier defaults
    if (agentOverride?.tier) {
      const model = this.tierDefaults[agentOverride.tier];
      validateModelFormat(model, `agent=${agentName},tier=${agentOverride.tier}`);
      if (this.debugLogging) {
        log(`[model-resolver] ${agentName}: tier-default for tier="${agentOverride.tier}" model="${model}"`);
      }
      return {
        model,
        source: "tier-default",
        originalTier: agentOverride.tier,
      };
    }

    // Priority 3: Agent definition tier → tier defaults
    if (agentDefinitionTier) {
      const model = this.tierDefaults[agentDefinitionTier];
      validateModelFormat(model, `agent=${agentName},tier=${agentDefinitionTier}`);
      if (this.debugLogging) {
        log(`[model-resolver] ${agentName}: tier-default for definition tier="${agentDefinitionTier}" model="${model}"`);
      }
      return {
        model,
        source: "tier-default",
        originalTier: agentDefinitionTier,
      };
    }

    // Priority 4: Fallback to sonnet
    const model = this.tierDefaults.sonnet;
    validateModelFormat(model, `agent=${agentName},fallback=sonnet`);
    if (this.debugLogging) {
      log(`[model-resolver] ${agentName}: hardcoded-fallback model="${model}"`);
    }
    return {
      model,
      source: "hardcoded-fallback",
    };
  }

  /**
   * Get current tier defaults
   */
  getTierDefaults(): TierModelMapping {
    return { ...this.tierDefaults };
  }
}
