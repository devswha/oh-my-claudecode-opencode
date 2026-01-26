/**
 * test-agents tool tests
 *
 * Tests for the agent testing utility that validates agent health
 */

import { describe, it, expect } from "bun:test";
import { createTestAgentsTool } from "../src/tools/test-agents";
import type { PluginInput } from "@opencode-ai/plugin";
import type { BackgroundManager } from "../src/tools/background-manager";

// Mock PluginInput for testing
const mockCtx: PluginInput = {
  directory: "/test/dir",
  client: {
    session: {
      create: async () => ({ data: { id: "test-session-id" } }),
      prompt: async () => ({
        data: {
          parts: [{ type: "text", text: "OMCO_AGENT_TEST_OK" }]
        }
      }),
    },
  } as any,
};

// Mock BackgroundManager for testing
const mockManager: BackgroundManager = {
  createTask: async () => ({
    id: "test-task",
    status: "running",
    description: "test",
    parentSessionID: "parent",
    startedAt: Date.now(),
  }),
  getTask: () => undefined,
  getTasksByParentSession: () => [],
  cancelTask: () => false,
  cancelAllTasks: () => 0,
  waitForTask: async () => ({
    id: "test-task",
    status: "completed",
    description: "test",
    parentSessionID: "parent",
    startedAt: Date.now(),
    completedAt: Date.now(),
  }),
  getParentSessionModel: async () => ({
    providerID: "anthropic",
    modelID: "claude-sonnet-4",
  }),
};

describe("test-agents tool", () => {
  describe("Tool definition", () => {
    it("should create a valid tool definition", () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      expect(tool).toBeDefined();
      expect(tool.description).toContain("Test OMCO agents");
      expect(tool.execute).toBeDefined();
    });
  });

  describe("Quick validation mode", () => {
    it("should validate agent definitions without API calls", async () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      const result = await tool.execute(
        { agent_name: "executor", quick: true },
        { sessionID: "test-session" } as any
      );

      const output = JSON.parse(result);
      expect(output.mode).toBe("quick");
      expect(output.summary).toBeDefined();
      expect(output.summary.total).toBe(1);
      expect(output.results).toHaveLength(1);
      expect(output.results[0].agent).toBe("executor");
      expect(output.results[0].status).toBe("pass");
    });

    it("should detect invalid agent names", async () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      const result = await tool.execute(
        { agent_name: "nonexistent-agent", quick: true },
        { sessionID: "test-session" } as any
      );

      const output = JSON.parse(result);
      expect(output.results[0].status).toBe("fail");
      expect(output.results[0].message).toContain("not found");
    });

    it("should test all agents when no agent_name specified", async () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      const result = await tool.execute(
        { quick: true },
        { sessionID: "test-session" } as any
      );

      const output = JSON.parse(result);
      expect(output.mode).toBe("quick");
      expect(output.summary.total).toBeGreaterThan(20); // At least 20+ agents
    });
  });

  describe("Summary reporting", () => {
    it("should calculate correct summary stats", async () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      const result = await tool.execute(
        { quick: true },
        { sessionID: "test-session" } as any
      );

      const output = JSON.parse(result);
      const { total, pass, fail, skip } = output.summary;

      expect(total).toBe(pass + fail + skip);
      expect(total).toBeGreaterThan(0);
    });

    it("should include test results for each agent", async () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      const result = await tool.execute(
        { agent_name: "executor", quick: true },
        { sessionID: "test-session" } as any
      );

      const output = JSON.parse(result);
      const testResult = output.results[0];

      expect(testResult.agent).toBe("executor");
      expect(testResult.status).toMatch(/pass|fail|skip/);
      expect(testResult.message).toBeDefined();
      expect(testResult.duration_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Alias handling", () => {
    it("should validate aliases in quick mode", async () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      const result = await tool.execute(
        { agent_name: "oracle", quick: true }, // oracle is alias for architect
        { sessionID: "test-session" } as any
      );

      const output = JSON.parse(result);
      expect(output.results[0].status).toBe("pass");
      expect(output.results[0].message).toContain("alias for architect");
    });

    it("should skip aliases in full test mode", async () => {
      const tool = createTestAgentsTool(mockCtx, mockManager);

      const result = await tool.execute(
        { agent_name: "oracle", quick: false },
        { sessionID: "test-session" } as any
      );

      const output = JSON.parse(result);
      expect(output.results[0].status).toBe("skip");
      expect(output.results[0].message).toContain("alias");
    });
  });
});
