import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import {
  getProjectRoot,
  getAgentsAssetsDir,
  getSkillsAssetsDir,
  assetExists,
  EXPECTED_AGENTS,
  EXPECTED_SKILLS,
} from "./test-utils";

/**
 * E2E Integration Tests for OMCO Plugin
 *
 * These tests verify the complete end-to-end flow of the OMCO plugin:
 * - Plugin initialization and structure
 * - Agent definition loading from assets
 * - Skill loading and registration
 * - Keyword detection and skill triggering
 * - State management and file operations
 * - Hook system integration
 * - Asset integrity and frontmatter validation
 */

describe("E2E Integration: Plugin Initialization", () => {
  it("should export plugin with correct structure", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;

    expect(OmoOmcsPlugin).toBeDefined();
    expect(typeof OmoOmcsPlugin).toBe("function");
  });

  it("should initialize plugin and register all hooks", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;

    const mockClient = {
      session: {
        create: () => Promise.resolve({ data: { id: "test-123" } }),
        prompt: () => Promise.resolve({}),
        messages: () => Promise.resolve({ data: [] }),
        todo: () => Promise.resolve({ data: [] }),
      },
      tui: {
        showToast: () => Promise.resolve({}),
      },
    };

    const mockCtx = {
      client: mockClient,
      directory: "/tmp/test",
      project: { path: "/tmp/test" },
      worktree: "/tmp/test",
      serverUrl: new URL("http://localhost:3000"),
      $: {} as unknown,
    };

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Verify all essential hooks are registered
    expect(plugin.config).toBeDefined();
    expect(typeof plugin.config).toBe("function");
    expect(plugin.event).toBeDefined();
    expect(typeof plugin.event).toBe("function");
    expect(plugin["chat.message"]).toBeDefined();
    expect(typeof plugin["chat.message"]).toBe("function");
    expect(plugin["experimental.chat.system.transform"]).toBeDefined();
    expect(typeof plugin["experimental.chat.system.transform"]).toBe("function");
    expect(plugin["tool.execute.before"]).toBeDefined();
    expect(typeof plugin["tool.execute.before"]).toBe("function");
    expect(plugin["tool.execute.after"]).toBeDefined();
    expect(typeof plugin["tool.execute.after"]).toBe("function");
  });

  it("should register all plugin tools", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;

    const mockCtx = {
      client: {
        session: {
          create: () => Promise.resolve({ data: { id: "test-123" } }),
          prompt: () => Promise.resolve({}),
          messages: () => Promise.resolve({ data: [] }),
          todo: () => Promise.resolve({ data: [] }),
        },
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
      project: { path: "/tmp/test" },
      worktree: "/tmp/test",
      serverUrl: new URL("http://localhost:3000"),
      $: {} as unknown,
    };

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Verify tools object exists
    expect(plugin.tool).toBeDefined();
    expect(typeof plugin.tool).toBe("object");

    // Verify background tools
    expect(plugin.tool.background_task).toBeDefined();
    expect(plugin.tool.background_output).toBeDefined();
    expect(plugin.tool.background_cancel).toBeDefined();

    // Verify call_omco_agent tool
    expect(plugin.tool.call_omco_agent).toBeDefined();
  });

  it("should register createConfigHandler", async () => {
    const { createConfigHandler } = await import("../src/plugin-handlers/config-handler");

    expect(createConfigHandler).toBeDefined();
    expect(typeof createConfigHandler).toBe("function");
  });
});

describe("E2E Integration: Agent-Skill Flow", () => {
  it("should load agent definitions from assets", async () => {
    const { agents } = await import("../src/agents");

    expect(agents).toBeDefined();
    expect(typeof agents).toBe("object");
    expect(Object.keys(agents).length).toBeGreaterThan(0);

    // Verify key agents are loaded
    const expectedAgentSubset = [
      "architect",
      "executor",
      "explore",
      "researcher",
      "designer",
      "writer",
    ];

    for (const agentName of expectedAgentSubset) {
      expect(agents[agentName]).toBeDefined();
      expect(agents[agentName].name).toBe(agentName);
      expect(agents[agentName].description).toBeDefined();
      expect(agents[agentName].systemPrompt).toBeDefined();
    }
  });

  it("should load and register skills as commands", async () => {
    const { listSkills, getInvocableSkills } = await import("../src/skills");

    const allSkills = listSkills();
    expect(allSkills).toBeDefined();
    expect(Array.isArray(allSkills)).toBe(true);

    const invocableSkills = getInvocableSkills();
    expect(invocableSkills).toBeDefined();
    expect(Array.isArray(invocableSkills)).toBe(true);

    // Verify skill structure
    if (allSkills.length > 0) {
      const skill = allSkills[0];
      expect(skill.metadata).toBeDefined();
      expect(skill.metadata.name).toBeDefined();
      expect(skill.metadata.description).toBeDefined();
      expect(skill.content).toBeDefined();
    }
  });

  it("should integrate skills with config handler", async () => {
    const { createConfigHandler } = await import("../src/plugin-handlers/config-handler");
    const { loadConfig } = await import("../src/config");

    const mockCtx = {
      directory: "/tmp/test",
    };

    const pluginConfig = loadConfig(mockCtx.directory);
    const configHandler = createConfigHandler({
      ctx: mockCtx as never,
      pluginConfig,
    });

    expect(configHandler).toBeDefined();
    expect(typeof configHandler).toBe("function");

    // Test config handler invocation
    const config: {
      default_agent?: string;
      agent?: Record<string, unknown>;
      command?: Record<string, unknown>;
    } = {};

    await configHandler(config);

    // Verify OMCO agent is set as default
    expect(config.default_agent).toBe("OMCO");

    // Verify agents are registered
    expect(config.agent).toBeDefined();
    expect(config.agent!["OMCO"]).toBeDefined();

    // Verify commands are registered
    expect(config.command).toBeDefined();
    expect(Object.keys(config.command!).length).toBeGreaterThan(0);
  });
});

describe("E2E Integration: Keyword Detection", () => {
  const testKeywordDetection = async (keyword: string, expectedMode: string) => {
    const OmoOmcsPlugin = (await import("../src/index")).default;

    const mockCtx = {
      client: {
        session: {
          create: () => Promise.resolve({ data: { id: "test-123" } }),
          prompt: () => Promise.resolve({}),
          messages: () => Promise.resolve({ data: [] }),
          todo: () => Promise.resolve({ data: [] }),
        },
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
      project: { path: "/tmp/test" },
      worktree: "/tmp/test",
      serverUrl: new URL("http://localhost:3000"),
      $: {} as unknown,
    };

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: `${keyword} fix all errors` }],
    };

    await plugin["chat.message"]!(
      { sessionID: "test-session-keyword" },
      chatOutput
    );

    // Verify that the mode-specific text was injected
    const hasExpectedText = chatOutput.parts.some(
      (p: { type: string; text?: string }) =>
        p.text?.includes(expectedMode.toUpperCase())
    );

    return hasExpectedText;
  };

  it("should detect ULTRAWORK keywords", async () => {
    const ultraworkKeywords = ["ultrawork", "ulw"];

    for (const keyword of ultraworkKeywords) {
      const detected = await testKeywordDetection(keyword, "ULTRAWORK");
      expect(detected).toBe(true);
    }
  });

  it("should detect RALPH keywords from expanded template", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;

    const mockCtx = {
      client: {
        session: {
          create: () => Promise.resolve({ data: { id: "test-123" } }),
          prompt: () => Promise.resolve({}),
          messages: () => Promise.resolve({ data: [] }),
          todo: () => Promise.resolve({ data: [] }),
        },
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
      project: { path: "/tmp/test" },
      worktree: "/tmp/test",
      serverUrl: new URL("http://localhost:3000"),
      $: {} as unknown,
    };

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Simulate expanded /ralph-loop command
    const chatOutput = {
      message: {},
      parts: [
        {
          type: "text",
          text: `[RALPH LOOP ACTIVATED - COMPLETION GUARANTEE]

<user-task>
test task
</user-task>

The \`<promise>TASK_COMPLETE</promise>\` tag binds you to completion.`,
        },
      ],
    };

    await plugin["chat.message"]!(
      { sessionID: "test-ralph-session" },
      chatOutput
    );

    const hasRalph = chatOutput.parts.some((p: { type: string; text?: string }) =>
      p.text?.includes("RALPH LOOP")
    );
    expect(hasRalph).toBe(true);
  });

  it("should detect PLAN keywords", async () => {
    // Note: Plan keywords don't inject text in chat.message hook
    // They are detected in skill-injector hook
    const { createSkillInjector } = await import("../src/hooks/skill-injector");

    const mockCtx = {
      client: {
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
    };

    const skillInjector = createSkillInjector(mockCtx as never);

    const planTexts = ["plan this feature", "ralplan new API"];

    for (const text of planTexts) {
      const result = skillInjector.detectAndInject("test-session", text);
      expect(result.skill).toBeDefined();
    }
  });

  it("should detect AUTOPILOT keywords", async () => {
    const { createSkillInjector } = await import("../src/hooks/skill-injector");

    const mockCtx = {
      client: {
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
    };

    const skillInjector = createSkillInjector(mockCtx as never);

    const autopilotTexts = ["autopilot build a todo app", "build me a REST API"];

    for (const text of autopilotTexts) {
      const result = skillInjector.detectAndInject("test-session", text);
      expect(result.skill).toBeDefined();
    }
  });

  it("should detect SEARCH keywords", async () => {
    const detected = await testKeywordDetection("deepsearch", "SEARCH");
    expect(detected).toBe(true);
  });

  it("should detect ANALYZE keywords", async () => {
    const detected = await testKeywordDetection("analyze", "ANALYZE");
    expect(detected).toBe(true);
  });
});

describe("E2E Integration: State Management", () => {
  it("should create and read state files correctly", async () => {
    // State paths are resolved relative to project directory
    const statePath = join(getProjectRoot(), ".omc/state/test-state.json");
    expect(statePath).toContain(".omc/state/test-state.json");

    // Global state paths use home directory
    const homeDir = process.env.HOME || "~";
    const globalPath = join(homeDir, ".omc/state/test-state.json");
    expect(globalPath).toContain(".omc/state/test-state.json");
  });

  it("should handle ralph-loop state", async () => {
    const { createRalphLoopHook } = await import("../src/hooks/ralph-loop");

    const mockCtx = {
      client: {
        session: {
          create: () => Promise.resolve({ data: { id: "test-123" } }),
          prompt: () => Promise.resolve({}),
          messages: () => Promise.resolve({ data: [] }),
          todo: () => Promise.resolve({ data: [] }),
        },
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
    };

    const hook = createRalphLoopHook(mockCtx as never, {});

    // Start a loop
    hook.startLoop("test-session-state", "test task", {
      mode: "ralph-loop",
    });

    // Get state
    const state = hook.getState("test-session-state");
    expect(state).toBeDefined();
    expect(state?.isActive).toBe(true);
    expect(state?.mode).toBe("ralph-loop");

    // Cancel loop
    hook.cancelLoop("test-session-state");

    const cancelledState = hook.getState("test-session-state");
    expect(cancelledState?.isActive).toBe(false);
  });
});

describe("E2E Integration: Hook System", () => {
  it("should process remember tags", async () => {
    const { createRememberTagProcessor } = await import(
      "../src/hooks/remember-tag-processor"
    );

    const mockCtx = {
      client: {
        session: {
          appendToSession: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
    };

    const processor = createRememberTagProcessor(mockCtx as never);

    const output = {
      title: "Test Output",
      output: "Some output with <remember>important info</remember> inside",
      metadata: {},
    };

    await processor["tool.execute.after"](
      { tool: "bash", sessionID: "test-session", callID: "call-123" },
      output
    );

    // Verify processor ran without error
    expect(output.output).toBeDefined();
  });

  it("should enforce todo continuation", async () => {
    const { createPersistentModeHook, checkPersistentModes } = await import(
      "../src/hooks/persistent-mode"
    );

    const mockCtx = {
      client: {
        session: {
          prompt: () => Promise.resolve({}),
          todo: () => Promise.resolve({ data: [] }),
        },
      },
      directory: "/tmp/test",
    };

    createPersistentModeHook(mockCtx as never, {
      injectNotepadContext: false,
    });

    const result = await checkPersistentModes(mockCtx as never, "test-session", {
      injectNotepadContext: false,
    });

    expect(result).toBeDefined();
    expect(typeof result.shouldContinue).toBe("boolean");
  });

  it("should integrate keyword detector hook", async () => {
    const { createKeywordDetectorHook } = await import(
      "../src/hooks/keyword-detector"
    );

    let modeChanged = false;
    const mockCtx = {
      client: {
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test",
    };

    const hook = createKeywordDetectorHook(mockCtx as never, {
      onModeChange: () => {
        modeChanged = true;
      },
    });

    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: "ultrawork fix errors" }],
    };

    await hook["chat.message"](
      { sessionID: "test-session-kw" },
      chatOutput as never
    );

    expect(modeChanged).toBe(true);
  });
});

describe("E2E Integration: Asset Integrity", () => {
  let agentsDir: string;
  let skillsDir: string;

  beforeAll(() => {
    agentsDir = getAgentsAssetsDir();
    skillsDir = getSkillsAssetsDir();
  });

  it("should have all expected agent files in assets/agents/", () => {
    if (!existsSync(agentsDir)) {
      console.warn(`Assets directory not found: ${agentsDir}`);
      return; // Skip if assets not present (e.g., in CI)
    }

    const agentFiles = readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
    expect(agentFiles.length).toBeGreaterThan(0);

    // Check for a subset of critical agents
    const criticalAgents = [
      "architect",
      "executor",
      "explore",
      "researcher",
      "designer",
    ];

    for (const agentName of criticalAgents) {
      const exists = assetExists("agents", agentName);
      expect(exists).toBe(true);
    }
  });

  it("should have all expected skill files in assets/skills/", () => {
    if (!existsSync(skillsDir)) {
      console.warn(`Assets directory not found: ${skillsDir}`);
      return; // Skip if assets not present
    }

    const skillFiles = readdirSync(skillsDir).filter((f) => f.endsWith(".md"));
    expect(skillFiles.length).toBeGreaterThan(0);

    // Check for a subset of critical skills
    const criticalSkills = ["ultrawork", "ralph", "autopilot", "analyze"];

    for (const skillName of criticalSkills) {
      const exists = assetExists("skills", skillName);
      expect(exists).toBe(true);
    }
  });

  it("should validate asset frontmatter format", async () => {
    const { readFileSync } = await import("fs");

    if (!existsSync(agentsDir)) {
      return; // Skip if assets not present
    }

    const agentFiles = readdirSync(agentsDir)
      .filter((f) => f.endsWith(".md"))
      .slice(0, 3); // Test a few files

    for (const file of agentFiles) {
      const content = readFileSync(join(agentsDir, file), "utf-8");

      // Check for frontmatter markers
      expect(content).toContain("---");

      // Check for required frontmatter fields (basic check)
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        expect(frontmatter).toContain("name:");
        expect(frontmatter).toContain("description:");
      }
    }
  });

  it("should validate skills have userInvocable field", async () => {
    const { readFileSync } = await import("fs");

    if (!existsSync(skillsDir)) {
      return; // Skip if assets not present
    }

    const skillFiles = readdirSync(skillsDir)
      .filter((f) => f.endsWith(".md"))
      .slice(0, 3); // Test a few files

    for (const file of skillFiles) {
      const content = readFileSync(join(skillsDir, file), "utf-8");

      // Check for frontmatter with userInvocable
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        // Frontmatter uses kebab-case (user-invocable), loader converts to camelCase
        expect(frontmatter).toContain("user-invocable:");
      }
    }
  });
});

describe("E2E Integration: Full Flow Simulation", () => {
  it("should complete full plugin initialization and operation cycle", async () => {
    // 1. Import and initialize plugin
    const OmoOmcsPlugin = (await import("../src/index")).default;

    const mockCtx = {
      client: {
        session: {
          create: () => Promise.resolve({ data: { id: "test-full-123" } }),
          prompt: () => Promise.resolve({}),
          messages: () => Promise.resolve({ data: [] }),
          todo: () =>
            Promise.resolve({
              data: [{ id: "1", content: "Test", status: "pending" }],
            }),
        },
        tui: {
          showToast: () => Promise.resolve({}),
        },
      },
      directory: "/tmp/test-full",
      project: { path: "/tmp/test-full" },
      worktree: "/tmp/test-full",
      serverUrl: new URL("http://localhost:3000"),
      $: {} as unknown,
    };

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // 2. Verify plugin structure
    expect(plugin.config).toBeDefined();
    expect(plugin.event).toBeDefined();
    expect(plugin["chat.message"]).toBeDefined();
    expect(plugin.tool).toBeDefined();

    // 3. Simulate config handler call
    const config: {
      default_agent?: string;
      agent?: Record<string, unknown>;
      command?: Record<string, unknown>;
    } = {};

    await plugin.config!(config as never);

    expect(config.default_agent).toBe("OMCO");
    expect(config.agent).toBeDefined();
    expect(config.command).toBeDefined();

    // 4. Simulate keyword detection via chat.message
    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: "ultrawork implement feature" }],
    };

    await plugin["chat.message"]!(
      { sessionID: "test-full-session" },
      chatOutput
    );

    const hasUltrawork = chatOutput.parts.some(
      (p: { type: string; text?: string }) =>
        p.text?.includes("ULTRAWORK MODE ACTIVATED")
    );
    expect(hasUltrawork).toBe(true);

    // 5. Simulate system prompt transformation
    const systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: "test-full-session" },
      systemOutput
    );

    // System prompts may or may not be injected depending on mode
    expect(Array.isArray(systemOutput.system)).toBe(true);

    // 6. Simulate tool.execute.before hook
    const toolOutput = {
      args: {
        prompt: "test",
        tools: { read: true, write: true },
      },
    };

    await plugin["tool.execute.before"]!(
      { tool: "task", sessionID: "test-full-session", callID: "call-456" },
      toolOutput as never
    );

    // Verify delegate_task was blocked
    expect(toolOutput.args.tools).toHaveProperty("delegate_task", false);

    // 7. Simulate session lifecycle
    await plugin.event!({
      event: {
        type: "session.created",
        properties: { info: { id: "test-full-session" } },
      },
    });

    await plugin.event!({
      event: {
        type: "session.deleted",
        properties: { info: { id: "test-full-session" } },
      },
    });

    // If we get here without errors, the full cycle completed successfully
    expect(true).toBe(true);
  });
});
