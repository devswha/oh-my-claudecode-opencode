/**
 * call-omo-agent Tests
 *
 * Tests for the agent spawning tool and agent registry integration.
 */

import { describe, it, expect } from "bun:test";
import { listAgentNames, getAgent, isAlias, getCanonicalName } from "../src/agents";

describe("Agent Registry", () => {
  describe("listAgentNames()", () => {
    it("should return all agent names including aliases", () => {
      const names = listAgentNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(20);
    });

    it("should include primary agent names", () => {
      const names = listAgentNames();
      expect(names).toContain("architect");
      expect(names).toContain("executor");
      expect(names).toContain("explore");
      expect(names).toContain("designer");
      expect(names).toContain("researcher");
      expect(names).toContain("planner");
      expect(names).toContain("analyst");
      expect(names).toContain("critic");
      expect(names).toContain("vision");
      expect(names).toContain("scientist");
      expect(names).toContain("coordinator");
    });

    it("should include all tier variants", () => {
      const names = listAgentNames();
      expect(names).toContain("architect-low");
      expect(names).toContain("architect-medium");
      expect(names).toContain("executor-low");
      expect(names).toContain("executor-high");
      expect(names).toContain("explore-medium");
      expect(names).toContain("designer-low");
      expect(names).toContain("designer-high");
      expect(names).toContain("researcher-low");
      expect(names).toContain("scientist-low");
      expect(names).toContain("scientist-high");
      expect(names).toContain("qa-tester");
      expect(names).toContain("qa-tester-high");
    });

    it("should include backward-compatibility aliases", () => {
      const names = listAgentNames();
      expect(names).toContain("oracle");
      expect(names).toContain("librarian");
      expect(names).toContain("sisyphus-junior");
      expect(names).toContain("frontend-engineer");
      expect(names).toContain("document-writer");
      expect(names).toContain("prometheus");
      expect(names).toContain("metis");
      expect(names).toContain("momus");
      expect(names).toContain("multimodal-looker");
    });
  });

  describe("getAgent()", () => {
    it("should return agent definition for primary names", () => {
      const architect = getAgent("architect");
      expect(architect).toBeDefined();
      expect(architect?.name).toBe("architect");
      expect(architect?.model).toBe("opus");
      expect(architect?.readOnly).toBe(true);
      expect(architect?.description).toMatch(/architecture/i);
      expect(architect?.systemPrompt).toBeDefined();
    });

    it("should return executor agent with sonnet model", () => {
      const executor = getAgent("executor");
      expect(executor).toBeDefined();
      expect(executor?.name).toBe("executor");
      expect(executor?.model).toBe("sonnet");
      expect(executor?.description).toMatch(/executor/i);
    });

    it("should return agent definition for tier variants", () => {
      const architectLow = getAgent("architect-low");
      expect(architectLow).toBeDefined();
      expect(architectLow?.name).toBe("architect-low");
      expect(architectLow?.model).toBe("haiku");

      const executorHigh = getAgent("executor-high");
      expect(executorHigh).toBeDefined();
      expect(executorHigh?.name).toBe("executor-high");
      expect(executorHigh?.model).toBe("opus");
    });

    it("should return agent definition for alias names", () => {
      const oracleAlias = getAgent("oracle");
      const architectPrimary = getAgent("architect");
      expect(oracleAlias).toEqual(architectPrimary);
    });

    it("should return undefined for unknown agent", () => {
      const unknown = getAgent("unknown-agent-xyz");
      expect(unknown).toBeUndefined();
    });

    it("should include systemPrompt in all agent definitions", () => {
      const names = listAgentNames();
      for (const name of names) {
        const agent = getAgent(name);
        expect(agent?.systemPrompt).toBeDefined();
        expect(agent?.systemPrompt?.length).toBeGreaterThan(0);
      }
    });

    it("should have description for all agents", () => {
      const names = listAgentNames();
      for (const name of names) {
        const agent = getAgent(name);
        expect(agent?.description).toBeDefined();
        expect(agent?.description?.length).toBeGreaterThan(0);
      }
    });
  });

  describe("isAlias()", () => {
    it("should correctly identify aliases", () => {
      expect(isAlias("oracle")).toBe(true);
      expect(isAlias("librarian")).toBe(true);
      expect(isAlias("sisyphus-junior")).toBe(true);
      expect(isAlias("frontend-engineer")).toBe(true);
      expect(isAlias("document-writer")).toBe(true);
      expect(isAlias("prometheus")).toBe(true);
      expect(isAlias("metis")).toBe(true);
      expect(isAlias("momus")).toBe(true);
      expect(isAlias("multimodal-looker")).toBe(true);
    });

    it("should correctly identify non-aliases", () => {
      expect(isAlias("architect")).toBe(false);
      expect(isAlias("executor")).toBe(false);
      expect(isAlias("explore")).toBe(false);
      expect(isAlias("designer")).toBe(false);
      expect(isAlias("researcher")).toBe(false);
      expect(isAlias("planner")).toBe(false);
      expect(isAlias("analyst")).toBe(false);
      expect(isAlias("critic")).toBe(false);
      expect(isAlias("vision")).toBe(false);
      expect(isAlias("scientist")).toBe(false);
    });

    it("should identify tier variants as non-aliases", () => {
      expect(isAlias("architect-low")).toBe(false);
      expect(isAlias("architect-medium")).toBe(false);
      expect(isAlias("executor-low")).toBe(false);
      expect(isAlias("executor-high")).toBe(false);
    });

    it("should return false for unknown names", () => {
      expect(isAlias("unknown-agent")).toBe(false);
      expect(isAlias("fake-alias")).toBe(false);
    });

    it("should identify old tier variants as aliases", () => {
      expect(isAlias("oracle-low")).toBe(true);
      expect(isAlias("oracle-medium")).toBe(true);
      expect(isAlias("librarian-low")).toBe(true);
      expect(isAlias("sisyphus-junior-low")).toBe(true);
      expect(isAlias("sisyphus-junior-high")).toBe(true);
      expect(isAlias("frontend-engineer-low")).toBe(true);
      expect(isAlias("frontend-engineer-high")).toBe(true);
    });
  });

  describe("getCanonicalName()", () => {
    it("should resolve oracle to architect", () => {
      expect(getCanonicalName("oracle")).toBe("architect");
      expect(getCanonicalName("oracle-low")).toBe("architect-low");
      expect(getCanonicalName("oracle-medium")).toBe("architect-medium");
    });

    it("should resolve librarian to researcher", () => {
      expect(getCanonicalName("librarian")).toBe("researcher");
      expect(getCanonicalName("librarian-low")).toBe("researcher-low");
    });

    it("should resolve sisyphus-junior to executor", () => {
      expect(getCanonicalName("sisyphus-junior")).toBe("executor");
      expect(getCanonicalName("sisyphus-junior-low")).toBe("executor-low");
      expect(getCanonicalName("sisyphus-junior-high")).toBe("executor-high");
    });

    it("should resolve frontend-engineer to designer", () => {
      expect(getCanonicalName("frontend-engineer")).toBe("designer");
      expect(getCanonicalName("frontend-engineer-low")).toBe("designer-low");
      expect(getCanonicalName("frontend-engineer-high")).toBe("designer-high");
    });

    it("should resolve document-writer to writer", () => {
      expect(getCanonicalName("document-writer")).toBe("writer");
    });

    it("should resolve planning agent aliases", () => {
      expect(getCanonicalName("prometheus")).toBe("planner");
      expect(getCanonicalName("metis")).toBe("analyst");
      expect(getCanonicalName("momus")).toBe("critic");
      expect(getCanonicalName("multimodal-looker")).toBe("vision");
    });

    it("should return unchanged name for non-aliases", () => {
      expect(getCanonicalName("architect")).toBe("architect");
      expect(getCanonicalName("executor")).toBe("executor");
      expect(getCanonicalName("explore")).toBe("explore");
      expect(getCanonicalName("designer")).toBe("designer");
      expect(getCanonicalName("planner")).toBe("planner");
    });

    it("should return unchanged name for unknown names", () => {
      expect(getCanonicalName("unknown-agent")).toBe("unknown-agent");
    });
  });

  describe("Agent Model Tiers", () => {
    it("should have haiku agents defined", () => {
      const haikus = ["architect-low", "executor-low", "explore", "designer-low", "researcher-low", "writer", "scientist-low"];
      for (const name of haikus) {
        const agent = getAgent(name);
        expect(agent?.model).toBe("haiku");
      }
    });

    it("should have sonnet agents defined", () => {
      const sonnets = ["executor", "designer", "researcher", "vision", "qa-tester", "scientist"];
      for (const name of sonnets) {
        const agent = getAgent(name);
        expect(agent?.model).toBe("sonnet");
      }
    });

    it("should have opus agents defined", () => {
      const opus = ["architect", "executor-high", "planner", "analyst", "critic", "qa-tester-high", "scientist-high"];
      for (const name of opus) {
        const agent = getAgent(name);
        expect(agent?.model).toBe("opus");
      }
    });
  });

  describe("Read-Only Agents", () => {
    it("should mark read-only agents correctly", () => {
      const readOnlyAgents = ["architect", "architect-low", "architect-medium", "explore", "explore-medium", "planner", "analyst", "critic", "vision"];

      for (const name of readOnlyAgents) {
        const agent = getAgent(name);
        expect(agent?.readOnly).toBe(true);
      }
    });

    it("should not mark executor agents as read-only", () => {
      const executors = ["executor", "executor-low", "executor-high"];

      for (const name of executors) {
        const agent = getAgent(name);
        expect(agent?.readOnly).toBeUndefined();
      }
    });
  });

  describe("Agent Properties", () => {
    it("should have required fields for all agents", () => {
      const names = listAgentNames();

      for (const name of names) {
        const agent = getAgent(name);
        expect(agent).toBeDefined();
        expect(agent?.name).toBeDefined();
        expect(agent?.description).toBeDefined();
        expect(agent?.systemPrompt).toBeDefined();
      }
    });

    it("should have unique agent definitions (no duplication of primary agents)", () => {
      const primaryNames = [
        "architect",
        "architect-low",
        "architect-medium",
        "executor",
        "executor-low",
        "executor-high",
        "explore",
        "explore-medium",
        "researcher",
        "researcher-low",
        "designer",
        "designer-low",
        "designer-high",
        "writer",
        "qa-tester",
        "qa-tester-high",
        "planner",
        "analyst",
        "critic",
        "vision",
        "scientist",
        "scientist-low",
        "scientist-high",
        "coordinator",
      ];

      const agents = primaryNames.map(name => getAgent(name));
      expect(agents.length).toEqual(primaryNames.length);

      // All should be defined
      agents.forEach((agent, index) => {
        expect(agent).toBeDefined();
      });
    });
  });
});
