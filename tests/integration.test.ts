import { describe, it, expect, beforeEach, mock } from "bun:test";

/**
 * Integration tests for omo-omcs plugin
 * These tests verify the full plugin flow including:
 * - Plugin initialization
 * - Hook registration and execution
 * - Mode transitions (ultrawork, ralph-loop, ultrawork-ralph)
 * - System prompt injection
 * - Completion detection
 */

const createMockClient = () => ({
  session: {
    create: mock(() => Promise.resolve({ data: { id: "test-session-123" } })),
    prompt: mock(() => Promise.resolve({})),
    messages: mock(() => Promise.resolve({ data: [] })),
    todo: mock(() =>
      Promise.resolve({
        data: [
          { id: "1", content: "Task 1", status: "in_progress", priority: "high" },
          { id: "2", content: "Task 2", status: "pending", priority: "medium" },
        ],
      })
    ),
  },
  tui: {
    showToast: mock(() => Promise.resolve({})),
  },
});

const createMockCtx = (client = createMockClient()) => ({
  client,
  directory: "/tmp/test-project",
  project: { path: "/tmp/test-project" },
  worktree: "/tmp/test-project",
  serverUrl: new URL("http://localhost:3000"),
  $: {} as unknown,
});

describe("Plugin Integration", () => {
  beforeEach(() => {
    mock.restore();
  });

  it("should initialize plugin and return all hooks", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Check that essential hooks are registered
    expect(plugin["chat.message"]).toBeDefined();
    expect(plugin["experimental.chat.system.transform"]).toBeDefined();
    expect(plugin.event).toBeDefined();
    expect(plugin["tool.execute.before"]).toBeDefined();
    expect(plugin["tool.execute.after"]).toBeDefined();

    // Check that tools are registered
    expect(plugin.tool).toBeDefined();
    expect(plugin.tool.background_task).toBeDefined();
    expect(plugin.tool.background_output).toBeDefined();
    expect(plugin.tool.background_cancel).toBeDefined();
    expect(plugin.tool.call_omo_agent).toBeDefined();
  });

  it("should handle full ultrawork mode flow", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Step 1: User sends message with ultrawork keyword
    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: "ultrawork implement user authentication" }],
    };

    await plugin["chat.message"]!({ sessionID: "test-session" }, chatOutput);

    // Verify mode notice was added
    const hasUltraworkNotice = chatOutput.parts.some(
      (p: { type: string; text?: string }) =>
        p.text?.includes("[ULTRAWORK MODE ACTIVATED]")
    );
    expect(hasUltraworkNotice).toBe(true);

    // Step 2: System prompt transform should inject ultrawork prompt
    const systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: "test-session" },
      systemOutput
    );

    expect(systemOutput.system.length).toBe(1);
    expect(systemOutput.system[0]).toContain("ULTRAWORK MODE ACTIVATED");
    expect(systemOutput.system[0]).toContain("MAXIMUM INTENSITY");
  });

  it("should handle full ralph-loop mode flow", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: '/ralph-loop "implement user registration"' }],
    };

    await plugin["chat.message"]!({ sessionID: "test-session" }, chatOutput);

    // Ralph-loop triggers mode change but doesn't add notice text directly
    // System prompt transform should inject ralph-loop prompt
    const systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: "test-session" },
      systemOutput
    );

    expect(systemOutput.system.length).toBe(1);
    expect(systemOutput.system[0]).toContain("RALPH LOOP ACTIVATED");
    expect(systemOutput.system[0]).toContain("<promise>TASK_COMPLETE</promise>");
  });

  it("should handle full ultrawork-ralph mode flow", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: "/ultrawork-ralph implement full auth system" }],
    };

    await plugin["chat.message"]!({ sessionID: "test-session" }, chatOutput);

    const hasUltraworkRalphNotice = chatOutput.parts.some(
      (p: { type: string; text?: string }) =>
        p.text?.includes("[ULTRAWORK-RALPH MODE ACTIVATED]")
    );
    expect(hasUltraworkRalphNotice).toBe(true);

    // Step 2: System prompt transform should inject combined prompt
    const systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: "test-session" },
      systemOutput
    );

    expect(systemOutput.system.length).toBe(1);
    expect(systemOutput.system[0]).toContain("ULTRAWORK-RALPH ACTIVATED");
    expect(systemOutput.system[0]).toContain("Maximum intensity");
    expect(systemOutput.system[0]).toContain("<promise>TASK_COMPLETE</promise>");
  });

  it("should handle session lifecycle events", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Simulate session created
    await plugin.event!({
      event: {
        type: "session.created",
        properties: { info: { id: "main-session-123" } },
      },
    });

    // Simulate setting ultrawork mode
    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: "ultrawork do something" }],
    };
    await plugin["chat.message"]!({ sessionID: "main-session-123" }, chatOutput);

    // Verify mode is set
    const systemOutput1 = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: "main-session-123" },
      systemOutput1
    );
    expect(systemOutput1.system.length).toBe(1);

    // Simulate session deleted - should clear mode
    await plugin.event!({
      event: {
        type: "session.deleted",
        properties: { info: { id: "main-session-123" } },
      },
    });

    // Verify mode is cleared
    const systemOutput2 = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: "main-session-123" },
      systemOutput2
    );
    expect(systemOutput2.system.length).toBe(0);
  });

  it("should block delegate_task in task tool", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    const output = {
      args: {
        prompt: "do something",
        tools: { read: true, write: true },
      },
    };

    await plugin["tool.execute.before"]!(
      { tool: "task", args: {} },
      output as never
    );

    expect(output.args.tools).toEqual({
      read: true,
      write: true,
      delegate_task: false,
    });
  });
});

describe("Mode Transitions", () => {
  it("should switch between modes correctly", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Start with ultrawork
    const ultraworkOutput = {
      message: {},
      parts: [{ type: "text", text: "ultrawork task 1" }],
    };
    await plugin["chat.message"]!({ sessionID: "test" }, ultraworkOutput);

    let systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!({ sessionID: "test" }, systemOutput);
    expect(systemOutput.system[0]).toContain("ULTRAWORK MODE ACTIVATED");

    // Switch to ralph-loop
    const ralphOutput = {
      message: {},
      parts: [{ type: "text", text: '/ralph-loop "new task"' }],
    };
    await plugin["chat.message"]!({ sessionID: "test" }, ralphOutput);

    systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!({ sessionID: "test" }, systemOutput);
    expect(systemOutput.system[0]).toContain("RALPH LOOP ACTIVATED");
    expect(systemOutput.system[0]).not.toContain("ULTRAWORK MODE ACTIVATED");
  });
});

describe("Completion Detection Flow", () => {
  it("should detect completion in assistant responses", async () => {
    const { createRalphLoopHook } = await import("../src/hooks/ralph-loop");
    const mockCtx = createMockCtx();

    const hook = createRalphLoopHook(mockCtx as never, {});

    // Start a loop
    hook.startLoop("test-session", "complete the task");

    // Verify loop is active
    expect(hook.getState("test-session")).not.toBeNull();

    // Simulate assistant response with completion
    const completionTexts = [
      "<promise>TASK_COMPLETE</promise>",
      "<promise>DONE</promise>",
      "Task finished! <promise>TASK_COMPLETE</promise> All done.",
    ];

    for (const text of completionTexts) {
      expect(hook.checkCompletionInContent(text)).toBe(true);
    }

    // Simulate non-completion responses
    const nonCompletionTexts = [
      "Working on it...",
      "Almost done",
      "promise: done",
      "<promise>IN_PROGRESS</promise>",
    ];

    for (const text of nonCompletionTexts) {
      expect(hook.checkCompletionInContent(text)).toBe(false);
    }
  });
});

describe("Background Tools Integration", () => {
  it("should register background tools", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    expect(plugin.tool.background_task).toBeDefined();
    expect(plugin.tool.background_output).toBeDefined();
    expect(plugin.tool.background_cancel).toBeDefined();

    expect(typeof plugin.tool.background_task).toBe("object");
    expect(plugin.tool.background_task.description).toBeDefined();
    expect(plugin.tool.background_task.args).toBeDefined();
    expect(typeof plugin.tool.background_task.execute).toBe("function");
  });

  it("should register call_omo_agent tool", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    expect(plugin.tool.call_omo_agent).toBeDefined();
    expect(plugin.tool.call_omo_agent.description).toContain("explore");
    expect(plugin.tool.call_omo_agent.description).toContain("librarian");
  });
});
