/**
 * ModelResolver Tests
 *
 * Tests for the model resolution and tier mapping system.
 */

import { describe, test, expect } from "bun:test";
import { ModelResolver, isValidModelFormat, HARDCODED_TIER_DEFAULTS } from "../src/config/model-resolver";
import type { AgentModelConfig } from "../src/config/model-resolver";

describe("isValidModelFormat", () => {
  describe("valid formats", () => {
    test("accepts anthropic/claude-sonnet-4", () => {
      expect(isValidModelFormat("anthropic/claude-sonnet-4")).toBe(true);
    });

    test("accepts openai/gpt-4o", () => {
      expect(isValidModelFormat("openai/gpt-4o")).toBe(true);
    });

    test("accepts google/gemini-2-flash", () => {
      expect(isValidModelFormat("google/gemini-2-flash")).toBe(true);
    });

    test("accepts provider with underscores and model with dots", () => {
      expect(isValidModelFormat("open_ai/gpt-4.5-turbo")).toBe(true);
    });

    test("accepts provider with hyphens", () => {
      expect(isValidModelFormat("custom-provider/model-name")).toBe(true);
    });
  });

  describe("invalid formats", () => {
    test("rejects model without slash", () => {
      expect(isValidModelFormat("claude")).toBe(false);
    });

    test("rejects arbitrary string", () => {
      expect(isValidModelFormat("invalid")).toBe(false);
    });

    test("rejects phrase without slash", () => {
      expect(isValidModelFormat("no-slash")).toBe(false);
    });

    test("rejects empty string", () => {
      expect(isValidModelFormat("")).toBe(false);
    });

    test("rejects only slash", () => {
      expect(isValidModelFormat("/")).toBe(false);
    });

    test("rejects slash at start", () => {
      expect(isValidModelFormat("/model-name")).toBe(false);
    });

    test("rejects slash at end", () => {
      expect(isValidModelFormat("provider/")).toBe(false);
    });

    test("rejects multiple slashes", () => {
      expect(isValidModelFormat("provider/model/extra")).toBe(false);
    });

    test("rejects special characters in provider", () => {
      expect(isValidModelFormat("provider@bad/model")).toBe(false);
    });

    test("rejects special characters in model", () => {
      expect(isValidModelFormat("provider/model@bad")).toBe(false);
    });
  });
});

describe("ModelResolver.resolve", () => {
  describe("per-agent model override takes precedence", () => {
    test("uses explicit model when provided in override", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {
        model: "openai/gpt-4o",
      };

      const result = resolver.resolve("test-agent", "haiku", agentOverride);

      expect(result.model).toBe("openai/gpt-4o");
      expect(result.source).toBe("per-agent-override");
      expect(result.originalTier).toBeUndefined();
    });

    test("ignores tier override when explicit model provided", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {
        model: "openai/gpt-4o",
        tier: "opus", // This should be ignored
      };

      const result = resolver.resolve("test-agent", "haiku", agentOverride);

      expect(result.model).toBe("openai/gpt-4o");
      expect(result.source).toBe("per-agent-override");
    });

    test("ignores definition tier when explicit model provided", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {
        model: "google/gemini-2-flash",
      };

      const result = resolver.resolve("test-agent", "opus", agentOverride);

      expect(result.model).toBe("google/gemini-2-flash");
      expect(result.source).toBe("per-agent-override");
    });
  });

  describe("per-agent tier override takes precedence over definition tier", () => {
    test("uses tier override instead of definition tier", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {
        tier: "opus",
      };

      const result = resolver.resolve("test-agent", "haiku", agentOverride);

      expect(result.model).toBe(HARDCODED_TIER_DEFAULTS.opus);
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("opus");
    });

    test("resolves haiku tier from override", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {
        tier: "haiku",
      };

      const result = resolver.resolve("test-agent", "sonnet", agentOverride);

      expect(result.model).toBe(HARDCODED_TIER_DEFAULTS.haiku);
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("haiku");
    });

    test("resolves sonnet tier from override", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {
        tier: "sonnet",
      };

      const result = resolver.resolve("test-agent", "opus", agentOverride);

      expect(result.model).toBe(HARDCODED_TIER_DEFAULTS.sonnet);
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("sonnet");
    });
  });

  describe("agent definition tier is used when no override", () => {
    test("uses definition tier when no override provided", () => {
      const resolver = new ModelResolver();

      const result = resolver.resolve("test-agent", "haiku", undefined);

      expect(result.model).toBe(HARDCODED_TIER_DEFAULTS.haiku);
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("haiku");
    });

    test("uses definition tier when empty override provided", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {};

      const result = resolver.resolve("test-agent", "opus", agentOverride);

      expect(result.model).toBe(HARDCODED_TIER_DEFAULTS.opus);
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("opus");
    });

    test("respects all three tier levels", () => {
      const resolver = new ModelResolver();

      const haikuResult = resolver.resolve("agent-1", "haiku");
      expect(haikuResult.model).toBe(HARDCODED_TIER_DEFAULTS.haiku);

      const sonnetResult = resolver.resolve("agent-2", "sonnet");
      expect(sonnetResult.model).toBe(HARDCODED_TIER_DEFAULTS.sonnet);

      const opusResult = resolver.resolve("agent-3", "opus");
      expect(opusResult.model).toBe(HARDCODED_TIER_DEFAULTS.opus);
    });
  });

  describe("fallback to sonnet when no tier defined", () => {
    test("falls back to sonnet when no tier provided anywhere", () => {
      const resolver = new ModelResolver();

      const result = resolver.resolve("test-agent", undefined, undefined);

      expect(result.model).toBe(HARDCODED_TIER_DEFAULTS.sonnet);
      expect(result.source).toBe("hardcoded-fallback");
      expect(result.originalTier).toBeUndefined();
    });

    test("falls back to sonnet when override has no tier or model", () => {
      const resolver = new ModelResolver();
      const agentOverride: AgentModelConfig = {
        temperature: 0.7,
      };

      const result = resolver.resolve("test-agent", undefined, agentOverride);

      expect(result.model).toBe(HARDCODED_TIER_DEFAULTS.sonnet);
      expect(result.source).toBe("hardcoded-fallback");
    });
  });

  describe("custom tierDefaults are applied correctly", () => {
    test("uses custom haiku model from config", () => {
      const resolver = new ModelResolver({
        tierDefaults: {
          haiku: "custom/haiku-model",
        },
      });

      const result = resolver.resolve("test-agent", "haiku");

      expect(result.model).toBe("custom/haiku-model");
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("haiku");
    });

    test("uses custom sonnet model from config", () => {
      const resolver = new ModelResolver({
        tierDefaults: {
          sonnet: "custom/sonnet-model",
        },
      });

      const result = resolver.resolve("test-agent", "sonnet");

      expect(result.model).toBe("custom/sonnet-model");
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("sonnet");
    });

    test("uses custom opus model from config", () => {
      const resolver = new ModelResolver({
        tierDefaults: {
          opus: "custom/opus-model",
        },
      });

      const result = resolver.resolve("test-agent", "opus");

      expect(result.model).toBe("custom/opus-model");
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("opus");
    });

    test("merges custom tierDefaults with hardcoded defaults", () => {
      const resolver = new ModelResolver({
        tierDefaults: {
          haiku: "custom/haiku-model",
          // sonnet and opus not provided, should use hardcoded defaults
        },
      });

      const haikuResult = resolver.resolve("agent-1", "haiku");
      expect(haikuResult.model).toBe("custom/haiku-model");

      const sonnetResult = resolver.resolve("agent-2", "sonnet");
      expect(sonnetResult.model).toBe(HARDCODED_TIER_DEFAULTS.sonnet);

      const opusResult = resolver.resolve("agent-3", "opus");
      expect(opusResult.model).toBe(HARDCODED_TIER_DEFAULTS.opus);
    });

    test("uses custom sonnet as fallback when no tier defined", () => {
      const resolver = new ModelResolver({
        tierDefaults: {
          sonnet: "custom/sonnet-fallback",
        },
      });

      const result = resolver.resolve("test-agent", undefined);

      expect(result.model).toBe("custom/sonnet-fallback");
      expect(result.source).toBe("hardcoded-fallback");
    });

    test("custom tier overrides apply to tier overrides", () => {
      const resolver = new ModelResolver({
        tierDefaults: {
          opus: "custom/opus-model",
        },
      });

      const agentOverride: AgentModelConfig = {
        tier: "opus",
      };

      const result = resolver.resolve("test-agent", "haiku", agentOverride);

      expect(result.model).toBe("custom/opus-model");
      expect(result.source).toBe("tier-default");
      expect(result.originalTier).toBe("opus");
    });
  });
});

describe("ModelResolver.getTierDefaults", () => {
  test("returns hardcoded defaults when no config provided", () => {
    const resolver = new ModelResolver();

    const defaults = resolver.getTierDefaults();

    expect(defaults.haiku).toBe(HARDCODED_TIER_DEFAULTS.haiku);
    expect(defaults.sonnet).toBe(HARDCODED_TIER_DEFAULTS.sonnet);
    expect(defaults.opus).toBe(HARDCODED_TIER_DEFAULTS.opus);
  });

  test("returns merged defaults when custom config provided", () => {
    const resolver = new ModelResolver({
      tierDefaults: {
        haiku: "custom/haiku-model",
        sonnet: "custom/sonnet-model",
      },
    });

    const defaults = resolver.getTierDefaults();

    expect(defaults.haiku).toBe("custom/haiku-model");
    expect(defaults.sonnet).toBe("custom/sonnet-model");
    expect(defaults.opus).toBe(HARDCODED_TIER_DEFAULTS.opus);
  });

  test("returns copy of defaults, not reference", () => {
    const resolver = new ModelResolver();

    const defaults1 = resolver.getTierDefaults();
    const defaults2 = resolver.getTierDefaults();

    expect(defaults1).not.toBe(defaults2);
    expect(defaults1).toEqual(defaults2);
  });

  test("modifying returned defaults does not affect resolver", () => {
    const resolver = new ModelResolver();

    const defaults = resolver.getTierDefaults();
    defaults.haiku = "modified/model";

    const defaultsAgain = resolver.getTierDefaults();
    expect(defaultsAgain.haiku).toBe(HARDCODED_TIER_DEFAULTS.haiku);
  });
});
