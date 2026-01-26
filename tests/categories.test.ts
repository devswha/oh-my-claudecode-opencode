import { describe, expect, it } from "bun:test";
import {
  resolveCategoryConfig,
  getAvailableCategories,
  DEFAULT_CATEGORIES,
  CATEGORY_PROMPT_APPENDS,
  CATEGORY_DESCRIPTIONS,
} from "../src/categories";
import type { CategoriesConfig } from "../src/categories/types";

describe("Categories", () => {
  describe("DEFAULT_CATEGORIES", () => {
    it("should have 7 default categories", () => {
      expect(Object.keys(DEFAULT_CATEGORIES)).toHaveLength(7);
    });

    it("should include all expected categories", () => {
      const expected = [
        "visual-engineering",
        "ultrabrain",
        "artistry",
        "quick",
        "unspecified-low",
        "unspecified-high",
        "writing",
      ];
      for (const cat of expected) {
        expect(DEFAULT_CATEGORIES[cat]).toBeDefined();
      }
    });

    it("should have model defined for each category", () => {
      for (const [name, config] of Object.entries(DEFAULT_CATEGORIES)) {
        expect(config.model).toBeDefined();
        expect(typeof config.model).toBe("string");
      }
    });
  });

  describe("CATEGORY_PROMPT_APPENDS", () => {
    it("should have prompts for all default categories", () => {
      for (const name of Object.keys(DEFAULT_CATEGORIES)) {
        expect(CATEGORY_PROMPT_APPENDS[name]).toBeDefined();
        expect(typeof CATEGORY_PROMPT_APPENDS[name]).toBe("string");
      }
    });

    it("should have non-empty prompts", () => {
      for (const [name, prompt] of Object.entries(CATEGORY_PROMPT_APPENDS)) {
        expect(prompt.length).toBeGreaterThan(0);
      }
    });
  });

  describe("CATEGORY_DESCRIPTIONS", () => {
    it("should have descriptions for all default categories", () => {
      for (const name of Object.keys(DEFAULT_CATEGORIES)) {
        expect(CATEGORY_DESCRIPTIONS[name]).toBeDefined();
        expect(typeof CATEGORY_DESCRIPTIONS[name]).toBe("string");
      }
    });
  });

  describe("resolveCategoryConfig()", () => {
    it("should resolve default categories", () => {
      const result = resolveCategoryConfig("quick");
      expect(result).not.toBeNull();
      expect(result?.model).toBe("anthropic/claude-haiku-4-5");
    });

    it("should return correct model for each default category", () => {
      const expectedModels: Record<string, string> = {
        "visual-engineering": "anthropic/claude-sonnet-4-5",
        ultrabrain: "anthropic/claude-opus-4-5",
        artistry: "anthropic/claude-opus-4-5",
        quick: "anthropic/claude-haiku-4-5",
        "unspecified-low": "anthropic/claude-sonnet-4-5",
        "unspecified-high": "anthropic/claude-opus-4-5",
        writing: "anthropic/claude-sonnet-4-5",
      };

      for (const [name, expectedModel] of Object.entries(expectedModels)) {
        const result = resolveCategoryConfig(name);
        expect(result).not.toBeNull();
        expect(result?.model).toBe(expectedModel);
      }
    });

    it("should return null for unknown category", () => {
      const result = resolveCategoryConfig("unknown-category");
      expect(result).toBeNull();
    });

    it("should include prompt append in resolved config", () => {
      const result = resolveCategoryConfig("quick");
      expect(result?.promptAppend).toBeDefined();
      expect(result?.promptAppend).toContain("SMALL / QUICK tasks");
    });

    it("should include config in resolved result", () => {
      const result = resolveCategoryConfig("ultrabrain");
      expect(result?.config).toBeDefined();
      expect(result?.config.model).toBe("anthropic/claude-opus-4-5");
      expect(result?.config.variant).toBe("high");
    });

    describe("with user overrides", () => {
      it("should merge user category override with default", () => {
        const userCategories: CategoriesConfig = {
          quick: {
            model: "openai/gpt-4o-mini", // Override to different provider
          },
        };

        const result = resolveCategoryConfig("quick", userCategories);
        expect(result).not.toBeNull();
        expect(result?.model).toBe("openai/gpt-4o-mini"); // User override takes effect
      });

      it("should append user-defined prompt_append to default prompt", () => {
        const userCategories: CategoriesConfig = {
          quick: {
            prompt_append: "Custom quick prompt",
          },
        };

        const result = resolveCategoryConfig("quick", userCategories);
        // User prompt is appended to default prompt, not replacing it
        expect(result?.promptAppend).toContain("SMALL / QUICK tasks"); // Default still present
        expect(result?.promptAppend).toContain("Custom quick prompt"); // User addition present
      });

      it("should allow user to define new categories", () => {
        const userCategories: CategoriesConfig = {
          "my-custom-category": {
            model: "google/gemini-2.0-flash",
            description: "My custom category",
            prompt_append: "Custom prompt for my category",
          },
        };

        const result = resolveCategoryConfig("my-custom-category", userCategories);
        expect(result).not.toBeNull();
        expect(result?.model).toBe("google/gemini-2.0-flash");
        expect(result?.promptAppend).toBe("Custom prompt for my category");
      });

      it("should still resolve default categories with user categories present", () => {
        const userCategories: CategoriesConfig = {
          "my-custom-category": {
            model: "google/gemini-2.0-flash",
          },
        };

        const result = resolveCategoryConfig("visual-engineering", userCategories);
        expect(result).not.toBeNull();
        expect(result?.model).toBe("anthropic/claude-sonnet-4-5");
      });
    });
  });

  describe("getAvailableCategories()", () => {
    it("should return all default categories", () => {
      const categories = getAvailableCategories();
      expect(categories).toHaveLength(7);
      expect(categories).toContain("quick");
      expect(categories).toContain("visual-engineering");
      expect(categories).toContain("ultrabrain");
    });

    it("should include user categories when provided", () => {
      const userCategories: CategoriesConfig = {
        "my-custom-category": {
          model: "haiku",
        },
      };

      const categories = getAvailableCategories(userCategories);
      expect(categories).toContain("my-custom-category");
      // Should still include default categories
      expect(categories).toContain("quick");
    });

    it("should deduplicate when user overrides a default category", () => {
      const userCategories: CategoriesConfig = {
        quick: {
          model: "sonnet", // Override existing
        },
      };

      const categories = getAvailableCategories(userCategories);
      const quickCount = categories.filter(c => c === "quick").length;
      expect(quickCount).toBe(1); // Should not duplicate
    });
  });
});
