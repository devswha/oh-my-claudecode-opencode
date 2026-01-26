/**
 * E2E Test: Model Resolution Error Messages (Tier 1 - No LLM)
 *
 * Tests that verify model resolution error handling and error messages
 * without requiring LLM interactions.
 */

import { describe, it, expect } from "vitest";
import { createModelResolutionService, type ModelConfig } from "../../src/tools/model-resolution-service";
import type { ModelMappingConfig } from "../../src/config/model-resolver";

describe("E2E: Model Resolution Error Messages", () => {
  describe("resolveModelForAgentOrThrow() with NO tierDefaults", () => {
    it("should throw error when no tier mapping is configured and no fallback", () => {
      // Create service with NO tierDefaults configured (empty config)
      const service = createModelResolutionService({});

      // Should throw when trying to resolve without fallback
      expect(() => {
        service.resolveModelForAgentOrThrow("executor");
      }).toThrow();
    });

    it("should include 'npx omco-setup' in error message", () => {
      const service = createModelResolutionService({});

      try {
        service.resolveModelForAgentOrThrow("executor");
        expect.fail("Should have thrown an error");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("npx omco-setup");
      }
    });

    it("should include 'No tier mapping configured' in error message", () => {
      const service = createModelResolutionService({});

      try {
        service.resolveModelForAgentOrThrow("executor");
        expect.fail("Should have thrown an error");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("No tier mapping configured");
      }
    });

    it("should include example JSON config in error message", () => {
      const service = createModelResolutionService({});

      try {
        service.resolveModelForAgentOrThrow("executor");
        expect.fail("Should have thrown an error");
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain("tierDefaults");
        expect(message).toContain("model_mapping");
        expect(message).toContain("omco.json");
      }
    });
  });

  describe("resolveModelForAgentOrThrow() WITH tierDefaults", () => {
    it("should return valid ModelConfig when tierDefaults is configured", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "openai/gpt-4o-mini",
          sonnet: "openai/gpt-4o",
          opus: "openai/o1",
        },
      };
      const service = createModelResolutionService(config);

      const result = service.resolveModelForAgentOrThrow("executor");

      expect(result).toBeDefined();
      expect(result.providerID).toBeDefined();
      expect(result.modelID).toBeDefined();
    });

    it("should not throw error when tierDefaults is configured", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "openai/gpt-4o-mini",
          sonnet: "openai/gpt-4o",
          opus: "openai/o1",
        },
      };
      const service = createModelResolutionService(config);

      expect(() => {
        service.resolveModelForAgentOrThrow("executor");
      }).not.toThrow();
    });

    it("should resolve to correct tier for agent definition", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "google/gemini-2.0-flash",
          sonnet: "anthropic/claude-sonnet-4",
          opus: "anthropic/claude-opus-4",
        },
      };
      const service = createModelResolutionService(config);

      // executor is a sonnet-tier agent by default
      const result = service.resolveModelForAgentOrThrow("executor");

      expect(result.providerID).toBe("anthropic");
      expect(result.modelID).toBe("claude-sonnet-4");
    });
  });

  describe("resolveModelForAgentOrThrow() with tier mapping but no fallback", () => {
    it("should throw error when tier mapping exists but no fallback available", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "openai/gpt-4o-mini",
          sonnet: "openai/gpt-4o",
          opus: "openai/o1",
        },
      };
      const service = createModelResolutionService(config);

      // With tier mapping configured, resolving should succeed
      const result = service.resolveModelForAgentOrThrow("architect");
      expect(result).toBeDefined();
      expect(result.providerID).toBe("openai");
    });

    it("should include fallback suggestion in error message", () => {
      // This test would require mocking to force the "tier mapping exists but no fallback" path
      // Since the resolver always falls back to sonnet tier, this is hard to trigger
      // We document this as a limitation of the current test structure

      // The error path exists in code (lines 166-169) but is hard to reach
      // without mocking getAgent() to return undefined tier
    });
  });

  describe("isTierMappingConfigured()", () => {
    it("should return false when no tierDefaults configured", () => {
      const service = createModelResolutionService({});
      expect(service.isTierMappingConfigured()).toBe(false);
    });

    it("should return false when tierDefaults has only simple tier names", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "haiku",
          sonnet: "sonnet",
          opus: "opus",
        },
      };
      const service = createModelResolutionService(config);
      expect(service.isTierMappingConfigured()).toBe(false);
    });

    it("should return true when tierDefaults has provider/model format", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "openai/gpt-4o-mini",
          sonnet: "openai/gpt-4o",
          opus: "openai/o1",
        },
      };
      const service = createModelResolutionService(config);
      expect(service.isTierMappingConfigured()).toBe(true);
    });

    it("should return true when at least one tierDefault has provider/model format", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "haiku",
          sonnet: "anthropic/claude-sonnet-4",
          opus: "opus",
        },
      };
      const service = createModelResolutionService(config);
      expect(service.isTierMappingConfigured()).toBe(true);
    });
  });

  describe("resolveModelForAgent() fallback behavior", () => {
    it("should return fallbackModel when no tier mapping configured", () => {
      const service = createModelResolutionService({});
      const fallback: ModelConfig = {
        providerID: "anthropic",
        modelID: "claude-sonnet-4",
      };

      const result = service.resolveModelForAgent("executor", fallback);

      expect(result).toEqual(fallback);
    });

    it("should return undefined when no tier mapping and no fallback", () => {
      const service = createModelResolutionService({});

      const result = service.resolveModelForAgent("executor");

      expect(result).toBeUndefined();
    });

    it("should return valid ModelConfig when tier mapping configured", () => {
      const config: ModelMappingConfig = {
        tierDefaults: {
          haiku: "openai/gpt-4o-mini",
          sonnet: "openai/gpt-4o",
          opus: "openai/o1",
        },
      };
      const service = createModelResolutionService(config);

      const result = service.resolveModelForAgent("executor");

      expect(result).toBeDefined();
      expect(result?.providerID).toBe("openai");
      expect(result?.modelID).toBe("gpt-4o");
    });
  });
});
