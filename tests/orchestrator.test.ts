/**
 * Orchestrator Tests
 *
 * Tests for the orchestrator and agent call system integration.
 * Covers agent registry, config handler, and call-omo-agent tool.
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { createConfigHandler } from "../src/plugin-handlers/config-handler";
import { createCallOmoAgent } from "../src/tools/call-omo-agent";
import type { BackgroundManager } from "../src/tools/background-manager";
import type { OmoOmcsConfig } from "../src/config";
import {
  listAgentNames,
  getAgent,
  isAlias,
  getCanonicalName,
} from "../src/agents";

// Mock config for testing
const mockPluginConfig: OmoOmcsConfig = {
  omco_agent: {
    disabled: false,
  },
  model_mapping: {
    tierDefaults: {
      haiku: "anthropic/claude-3-5-haiku-20241022",
      sonnet: "anthropic/claude-3-5-sonnet-20241022",
      opus: "anthropic/claude-opus-4-5-20251101",
    },
  },
  disabled_skills: [],
};

// Mock OpenCode config structure
interface OpenCodeConfig {
  default_agent?: string;
  agent?: Record<
    string,
    {
      model?: string;
      temperature?: number;
      prompt?: string;
      description?: string;
      mode?: "subagent" | "primary" | "all";
      tools?: Record<string, boolean>;
    }
  >;
  command?: Record<
    string,
    {
      template: string;
      description?: string;
      agent?: string;
    }
  >;
}

describe("Orchestrator Integration", () => {
  describe("Agent Registry", () => {
    it("should return all agent names including aliases", () => {
      const names = listAgentNames();
      expect(Array.isArray(names)).toBe(true);
      expect(names.length).toBeGreaterThan(20);
    });

    it("should get correct agent definition with metadata", () => {
      const architect = getAgent("architect");
      expect(architect).toBeDefined();
      expect(architect?.name).toBe("architect");
      expect(architect?.model).toBe("opus");
      expect(architect?.readOnly).toBe(true);
      expect(architect?.systemPrompt).toContain("Oracle");
      expect(architect?.description).toBeDefined();
    });

    it("should resolve aliases to canonical agents", () => {
      const oracleAlias = getAgent("oracle");
      const architectPrimary = getAgent("architect");
      expect(oracleAlias).toEqual(architectPrimary);
    });

    it("should correctly identify aliases", () => {
      expect(isAlias("oracle")).toBe(true);
      expect(isAlias("architect")).toBe(false);
      expect(isAlias("librarian")).toBe(true);
      expect(isAlias("researcher")).toBe(false);
    });

    it("should resolve canonical names correctly", () => {
      expect(getCanonicalName("oracle")).toBe("architect");
      expect(getCanonicalName("architect")).toBe("architect");
      expect(getCanonicalName("librarian")).toBe("researcher");
      expect(getCanonicalName("omco-junior")).toBe("executor");
    });

    it("should have all expected tier variants", () => {
      const names = listAgentNames();
      expect(names).toContain("architect-low");
      expect(names).toContain("architect-medium");
      expect(names).toContain("executor-low");
      expect(names).toContain("executor-high");
      expect(names).toContain("explore-medium");
    });

    it("should have correct model tier for each agent type", () => {
      const architectLow = getAgent("architect-low");
      expect(architectLow?.model).toBe("haiku");

      const executor = getAgent("executor");
      expect(executor?.model).toBe("sonnet");

      const architectHigh = getAgent("architect");
      expect(architectHigh?.model).toBe("opus");
    });

    it("should mark read-only agents correctly", () => {
      const readOnlyAgents = [
        "architect",
        "architect-low",
        "architect-medium",
        "explore",
        "explore-medium",
        "planner",
        "analyst",
        "critic",
        "vision",
      ];

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

    it("should have tools specified for agents that need them", () => {
      const explore = getAgent("explore");
      expect(explore?.tools).toBeDefined();
      expect(explore?.tools).toContain("glob");
      expect(explore?.tools).toContain("grep");
      expect(explore?.tools).toContain("read");

      const researcher = getAgent("researcher");
      expect(researcher?.tools).toContain("web_search");
      expect(researcher?.tools).toContain("context7");
      expect(researcher?.tools).toContain("grep_app");
    });

    it("should have all required fields for each agent", () => {
      const names = listAgentNames();

      for (const name of names) {
        const agent = getAgent(name);
        expect(agent).toBeDefined();
        expect(agent?.name).toBeDefined();
        expect(agent?.description).toBeDefined();
        expect(agent?.systemPrompt).toBeDefined();
        expect(agent?.systemPrompt?.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Config Handler Integration", () => {
    let mockContext: PluginInput;
    let mockConfig: OpenCodeConfig;

    beforeEach(() => {
      // Create fresh config for each test
      mockConfig = {
        agent: {},
        command: {},
      };

      // Mock PluginInput
      mockContext = {
        directory: "/test/dir",
        client: {
          session: {
            create: mock(() =>
              Promise.resolve({
                data: { id: "test-session-id" },
              })
            ),
            prompt: mock(() => Promise.resolve({})),
            messages: mock(() =>
              Promise.resolve({
                data: [
                  {
                    info: { role: "assistant" },
                    parts: [{ type: "text", text: "Test response" }],
                  },
                ],
              })
            ),
          },
        },
      } as unknown as PluginInput;
    });

    it("should register OMCO as default agent", async () => {
      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      expect(mockConfig.default_agent).toBe("OMCO");
      expect(mockConfig.agent?.["OMCO"]).toBeDefined();
      expect(mockConfig.agent?.["OMCO"]?.mode).toBe("primary");
    });

    it("should register all subagent types", async () => {
      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      const expectedAgents = [
        "architect",
        "executor",
        "explore",
        "researcher",
        "designer",
        "planner",
        "analyst",
        "critic",
        "vision",
        "scientist",
        "coordinator",
      ];

      for (const agentName of expectedAgents) {
        expect(mockConfig.agent?.[agentName]).toBeDefined();
        expect(mockConfig.agent?.[agentName]?.mode).toBe("subagent");
      }
    });

    it("should register subagents with correct model tiers", async () => {
      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      // Models match mockPluginConfig.model_mapping.tierDefaults
      expect(mockConfig.agent?.["architect"]?.model).toBe(
        "anthropic/claude-opus-4-5-20251101"
      );
      expect(mockConfig.agent?.["architect-low"]?.model).toBe(
        "anthropic/claude-3-5-haiku-20241022"
      );
      expect(mockConfig.agent?.["executor"]?.model).toBe(
        "anthropic/claude-3-5-sonnet-20241022"
      );
      expect(mockConfig.agent?.["executor-high"]?.model).toBe(
        "anthropic/claude-opus-4-5-20251101"
      );
    });

    it("should register slash commands", async () => {
      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      const expectedCommands = [
        "ultrawork",
        "ralph-loop",
        "autopilot",
        "deepsearch",
        "analyze",
        "help",
        "doctor",
      ];

      for (const cmd of expectedCommands) {
        expect(mockConfig.command?.[cmd]).toBeDefined();
        expect(mockConfig.command?.[cmd]?.template).toBeDefined();
        expect(mockConfig.command?.[cmd]?.description).toBeDefined();
      }
    });

    it("should respect disabled_skills configuration", async () => {
      const configWithDisabled: OmoOmcsConfig = {
        ...mockPluginConfig,
        disabled_skills: ["ultrawork", "autopilot"],
      };

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: configWithDisabled,
      });

      await handler(mockConfig);

      expect(mockConfig.command?.["ultrawork"]).toBeUndefined();
      expect(mockConfig.command?.["autopilot"]).toBeUndefined();
      expect(mockConfig.command?.["ralph-loop"]).toBeDefined(); // Should still be there
    });

    it("should not register agents when omco_agent.disabled is true", async () => {
      const disabledConfig: OmoOmcsConfig = {
        ...mockPluginConfig,
        omco_agent: {
          disabled: true,
        },
      };

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: disabledConfig,
      });

      await handler(mockConfig);

      expect(mockConfig.default_agent).toBeUndefined();
      expect(mockConfig.agent?.["OMCO"]).toBeUndefined();
    });

    it("should include agent system prompts in subagent configs", async () => {
      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      const architectPrompt = mockConfig.agent?.["architect"]?.prompt;
      expect(architectPrompt).toBeDefined();
      expect(architectPrompt).toContain("Oracle");
      expect(architectPrompt).toContain("Strategic Architecture");

      const executorPrompt = mockConfig.agent?.["executor"]?.prompt;
      expect(executorPrompt).toBeDefined();
      expect(executorPrompt).toContain("OMCO-Junior");
    });
  });

  describe("Agent Calling System", () => {
    let mockContext: PluginInput;
    let mockManager: BackgroundManager;

    beforeEach(() => {
      // Mock session creation
      mockContext = {
        directory: "/test/dir",
        client: {
          session: {
            create: mock(() =>
              Promise.resolve({
                data: { id: "test-session-id" },
              })
            ),
            prompt: mock(() => Promise.resolve({})),
            messages: mock(() =>
              Promise.resolve({
                data: [
                  {
                    info: { role: "assistant" },
                    parts: [
                      {
                        type: "text",
                        text: "Agent completed successfully",
                      },
                    ],
                  },
                ],
              })
            ),
          },
        },
      } as unknown as PluginInput;

      // Mock BackgroundManager
      mockManager = {
        createTask: mock(() =>
          Promise.resolve({
            id: "task-123",
            sessionID: "session-456",
            status: "running",
          })
        ),
      } as unknown as BackgroundManager;
    });

    it("should validate agent existence", async () => {
      const tool = createCallOmoAgent(mockContext, mockManager);

      const result = await tool.execute(
        {
          description: "Test task",
          prompt: "Do something",
          subagent_type: "unknown-agent",
          run_in_background: false,
        },
        { sessionID: "test-session" } as any
      );

      const parsed = JSON.parse(result);
      expect(parsed.status).toBe("failed");
      expect(parsed.error).toContain("Unknown agent type");
      expect(parsed.error).toContain("unknown-agent");
    });

    it("should enhance prompt with agent system prompt", async () => {
      const tool = createCallOmoAgent(mockContext, mockManager);

      await tool.execute(
        {
          description: "Analyze code",
          prompt: "Check this implementation",
          subagent_type: "architect",
          run_in_background: false,
        },
        { sessionID: "test-session" } as any
      );

      const mockPrompt = mockContext.client.session.prompt as any;
      expect(mockPrompt).toHaveBeenCalled();

      const callArgs = mockPrompt.mock.calls[0][0];
      const promptText = callArgs.body.parts[0].text;

      // Should include agent's system prompt
      expect(promptText).toContain("Oracle");
      expect(promptText).toContain("Strategic Architecture");
      // Should also include user's prompt
      expect(promptText).toContain("Check this implementation");
    });

    it("should create background task when run_in_background is true", async () => {
      const tool = createCallOmoAgent(mockContext, mockManager);

      const result = await tool.execute(
        {
          description: "Background analysis",
          prompt: "Analyze patterns",
          subagent_type: "explore",
          run_in_background: true,
        },
        { sessionID: "test-session" } as any
      );

      const parsed = JSON.parse(result);
      expect(parsed.task_id).toBe("task-123");
      expect(parsed.session_id).toBe("session-456");
      expect(parsed.status).toBe("running");
      expect(parsed.message).toContain("background_output");
    });

    it("should execute synchronously when run_in_background is false", async () => {
      const tool = createCallOmoAgent(mockContext, mockManager);

      const result = await tool.execute(
        {
          description: "Sync execution",
          prompt: "Do this now",
          subagent_type: "executor",
          run_in_background: false,
        },
        { sessionID: "test-session" } as any
      );

      const parsed = JSON.parse(result);
      expect(parsed.status).toBe("completed");
      expect(parsed.result).toBe("Agent completed successfully");
      expect(parsed.session_id).toBe("test-session-id");
    });

    it("should handle agent execution errors gracefully", async () => {
      // Mock session creation to throw error
      const errorContext = {
        directory: "/test/dir",
        client: {
          session: {
            create: mock(() => Promise.reject(new Error("Session creation failed"))),
          },
        },
      } as unknown as PluginInput;

      const tool = createCallOmoAgent(errorContext, mockManager);

      const result = await tool.execute(
        {
          description: "Test task",
          prompt: "Do something",
          subagent_type: "executor",
          run_in_background: false,
        },
        { sessionID: "test-session" } as any
      );

      const parsed = JSON.parse(result);
      expect(parsed.status).toBe("failed");
      expect(parsed.error).toContain("Session creation failed");
    });

    it("should include agent name and description in tool description", () => {
      const tool = createCallOmoAgent(mockContext, mockManager);

      expect(tool.description).toContain("architect");
      expect(tool.description).toContain("executor");
      expect(tool.description).toContain("explore");
      expect(tool.description).toContain("designer");
    });

    it("should include alias information in tool description", () => {
      const tool = createCallOmoAgent(mockContext, mockManager);

      // Should show aliases and their canonical names
      expect(tool.description).toContain("oracle");
      expect(tool.description).toContain("alias for architect");
    });
  });

  describe("Model Tier Resolution", () => {
    it("should resolve model tiers correctly for all agents", async () => {
      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      // Haiku tier
      expect(mockConfig.agent?.["architect-low"]?.model).toBe(
        "anthropic/claude-3-5-haiku-20241022"
      );
      expect(mockConfig.agent?.["executor-low"]?.model).toBe(
        "anthropic/claude-3-5-haiku-20241022"
      );

      // Sonnet tier
      expect(mockConfig.agent?.["executor"]?.model).toBe(
        "anthropic/claude-3-5-sonnet-20241022"
      );
      expect(mockConfig.agent?.["designer"]?.model).toBe(
        "anthropic/claude-3-5-sonnet-20241022"
      );

      // Opus tier
      expect(mockConfig.agent?.["architect"]?.model).toBe(
        "anthropic/claude-opus-4-5-20251101"
      );
      expect(mockConfig.agent?.["planner"]?.model).toBe(
        "anthropic/claude-opus-4-5-20251101"
      );
    });

    it("should allow custom model overrides", async () => {
      const customConfig: OmoOmcsConfig = {
        ...mockPluginConfig,
        model_mapping: {
          tierDefaults: {
            haiku: "anthropic/claude-3-5-haiku-20241022",
            sonnet: "anthropic/claude-3-5-sonnet-20241022",
            opus: "anthropic/claude-opus-4-5-20251101",
          },
        },
        agents: {
          architect: {
            model: "anthropic/claude-3-5-sonnet-20241022",
          },
        },
      };

      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: customConfig,
      });

      await handler(mockConfig);

      // Should use custom override instead of default opus
      expect(mockConfig.agent?.["architect"]?.model).toBe(
        "anthropic/claude-3-5-sonnet-20241022"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required parameters in callOmoAgent", async () => {
      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const mockManager = {} as BackgroundManager;
      const tool = createCallOmoAgent(mockContext, mockManager);

      // Tool validation should catch missing parameters
      // This test validates the tool schema includes required fields
      expect(tool.args.description).toBeDefined();
      expect(tool.args.prompt).toBeDefined();
      expect(tool.args.subagent_type).toBeDefined();
      expect(tool.args.run_in_background).toBeDefined();
    });

    it("should handle invalid model specification gracefully", async () => {
      const invalidConfig: OmoOmcsConfig = {
        sisyphus_agent: { disabled: false },
        model_mapping: {
          tierDefaults: {
            haiku: "invalid-model-name",
            sonnet: "anthropic/claude-3-5-sonnet-20241022",
            opus: "anthropic/claude-opus-4-5-20251101",
          },
        },
      };

      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: invalidConfig,
      });

      // Should not throw, just use the invalid model string
      await expect(handler(mockConfig)).resolves.toBeUndefined();
    });

    it("should return undefined for non-existent agents", () => {
      const agent = getAgent("completely-fake-agent-name");
      expect(agent).toBeUndefined();
    });

    it("should handle getCanonicalName for unknown aliases", () => {
      const canonical = getCanonicalName("fake-alias");
      expect(canonical).toBe("fake-alias"); // Should return unchanged
    });
  });

  describe("Subagent Configuration", () => {
    it("should configure all expected subagent types", async () => {
      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      const expectedSubagents = [
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
        "planner",
        "analyst",
        "critic",
        "vision",
        "scientist",
        "scientist-low",
        "scientist-high",
        "qa-tester",
        "qa-tester-high",
        "coordinator",
      ];

      for (const name of expectedSubagents) {
        expect(mockConfig.agent?.[name]).toBeDefined();
        expect(mockConfig.agent?.[name]?.mode).toBe("subagent");
        expect(mockConfig.agent?.[name]?.description).toBeDefined();
        expect(mockConfig.agent?.[name]?.prompt).toBeDefined();
      }
    });

    it("should propagate model parameters correctly", async () => {
      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      // Check a few agents to verify model propagation
      const architect = mockConfig.agent?.["architect"];
      expect(architect?.model).toBe("anthropic/claude-opus-4-5-20251101");

      const executor = mockConfig.agent?.["executor"];
      expect(executor?.model).toBe("anthropic/claude-3-5-sonnet-20241022");

      const explore = mockConfig.agent?.["explore"];
      expect(explore?.model).toBe("anthropic/claude-3-5-haiku-20241022");
    });

    it("should include descriptions from agent definitions", async () => {
      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      const architect = mockConfig.agent?.["architect"];
      expect(architect?.description).toContain("architecture");

      const executor = mockConfig.agent?.["executor"];
      expect(executor?.description).toContain("executor");

      const designer = mockConfig.agent?.["designer"];
      expect(designer?.description).toContain("UI");
    });
  });

  describe("OMCO Agent Configuration", () => {
    it("should include agent list in OMCO prompt", async () => {
      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      const omcoPrompt = mockConfig.agent?.["OMCO"]?.prompt;
      expect(omcoPrompt).toBeDefined();
      expect(omcoPrompt).toContain("architect");
      expect(omcoPrompt).toContain("executor");
      expect(omcoPrompt).toContain("Available_Subagents");
    });

    it("should set OMCO as primary mode", async () => {
      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      expect(mockConfig.agent?.["OMCO"]?.mode).toBe("primary");
    });

    it("should have OMCO description", async () => {
      const mockConfig: OpenCodeConfig = {
        agent: {},
        command: {},
      };

      const mockContext = {
        directory: "/test/dir",
        client: {} as any,
      } as PluginInput;

      const handler = createConfigHandler({
        ctx: mockContext,
        pluginConfig: mockPluginConfig,
      });

      await handler(mockConfig);

      expect(mockConfig.agent?.["OMCO"]?.description).toContain(
        "orchestrator"
      );
    });
  });
});
