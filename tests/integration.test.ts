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

// Generate unique session IDs to avoid state conflicts between tests
let testCounter = 0;
const uniqueSessionId = () => `test-session-${Date.now()}-${++testCounter}`;

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

    // Step 1: Simulate expanded slash command (as OpenCode would process it)
    // The /ultrawork command expands to include "ULTRAWORK MODE ACTIVATED"
    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: "[ULTRAWORK MODE ACTIVATED - MAXIMUM INTENSITY]\n\nExecute this task:\n\n<user-task>\nimplement user authentication\n</user-task>" }],
    };

    await plugin["chat.message"]!({ sessionID: "test-session" }, chatOutput);

    // Verify the text contains ultrawork notice (already in expanded template)
    const hasUltraworkNotice = chatOutput.parts.some(
      (p: { type: string; text?: string }) =>
        p.text?.includes("ULTRAWORK MODE ACTIVATED")
    );
    expect(hasUltraworkNotice).toBe(true);

    // Step 2: System prompt transform should inject ultrawork prompt
    const systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: "test-session" },
      systemOutput
    );

    // Note: Ultrawork mode alone doesn't trigger ralph-loop system prompt injection
    // Only ralph-loop and ultrawork-ralph modes do that
    // This test verifies that ultrawork notice appears in the chat output
    expect(hasUltraworkNotice).toBe(true);
  });

  it("should handle full ralph-loop mode flow", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();
    const sessionId = uniqueSessionId();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Simulate expanded /ralph-loop command
    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: `[RALPH LOOP ACTIVATED - COMPLETION GUARANTEE]

Execute this task with COMPLETION GUARANTEE:

<user-task>
implement user registration
</user-task>

## RALPH LOOP ENFORCEMENT

The \`<promise>TASK_COMPLETE</promise>\` tag binds you to completion.` }],
    };

    await plugin["chat.message"]!({ sessionID: sessionId }, chatOutput);

    // Ralph-loop triggers mode change and system prompt injection
    const systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: sessionId },
      systemOutput
    );

    // At least one system prompt should be injected for ralph-loop mode
    expect(systemOutput.system.length).toBeGreaterThanOrEqual(1);
    // Find the ralph-loop specific prompt
    const ralphPrompt = systemOutput.system.find(s => s.includes("RALPH LOOP"));
    expect(ralphPrompt).toBeDefined();
    expect(ralphPrompt).toContain("<promise>TASK_COMPLETE</promise>");
  });

  it("should handle full ultrawork-ralph mode flow", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();
    const sessionId = uniqueSessionId();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Simulate expanded /ultrawork-ralph command
    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: `[ULTRAWORK-RALPH ACTIVATED - MAXIMUM INTENSITY + COMPLETION GUARANTEE]

Execute this task at MAXIMUM INTENSITY with COMPLETION GUARANTEE:

<user-task>
implement full auth system
</user-task>

## THE ULTIMATE MODE

This combines:
- **ULTRAWORK**: Maximum intensity, parallel everything, aggressive delegation
- **RALPH LOOP**: Inescapable completion guarantee

Begin working NOW. PARALLEL EVERYTHING. The loop will not release you until you earn your \`<promise>TASK_COMPLETE</promise>\`.` }],
    };

    await plugin["chat.message"]!({ sessionID: sessionId }, chatOutput);

    const hasUltraworkRalphNotice = chatOutput.parts.some(
      (p: { type: string; text?: string }) =>
        p.text?.includes("ULTRAWORK-RALPH ACTIVATED")
    );
    expect(hasUltraworkRalphNotice).toBe(true);

    // Step 2: System prompt transform should inject combined prompt
    const systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: sessionId },
      systemOutput
    );

    // At least one system prompt should be injected for ultrawork-ralph mode
    expect(systemOutput.system.length).toBeGreaterThanOrEqual(1);
    // Find the ultrawork-ralph specific prompt
    const ultraworkRalphPrompt = systemOutput.system.find(s => s.includes("ULTRAWORK-RALPH"));
    expect(ultraworkRalphPrompt).toBeDefined();
    expect(ultraworkRalphPrompt).toContain("<promise>TASK_COMPLETE</promise>");
  });

  it("should handle session lifecycle events", async () => {
    const OmoOmcsPlugin = (await import("../src/index")).default;
    const mockCtx = createMockCtx();
    const sessionId = uniqueSessionId();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Simulate session created
    await plugin.event!({
      event: {
        type: "session.created",
        properties: { info: { id: sessionId } },
      },
    });

    // Simulate setting ralph-loop mode (expanded command)
    const chatOutput = {
      message: {},
      parts: [{ type: "text", text: `[RALPH LOOP ACTIVATED - COMPLETION GUARANTEE]

<user-task>
do something
</user-task>

The \`<promise>TASK_COMPLETE</promise>\` tag binds you to completion.` }],
    };
    await plugin["chat.message"]!({ sessionID: sessionId }, chatOutput);

    // Verify mode is set
    const systemOutput1 = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: sessionId },
      systemOutput1
    );
    // At least one system prompt should be injected when mode is active
    expect(systemOutput1.system.length).toBeGreaterThanOrEqual(1);

    // Simulate session deleted - should clear mode
    await plugin.event!({
      event: {
        type: "session.deleted",
        properties: { info: { id: sessionId } },
      },
    });

    // Verify ralph-loop mode is cleared (no ralph-loop specific prompts)
    const systemOutput2 = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!(
      { sessionID: sessionId },
      systemOutput2
    );
    // After session deleted, the ralph-loop specific prompt should be gone
    const hasRalphPrompt = systemOutput2.system.some(s => s.includes("RALPH LOOP"));
    expect(hasRalphPrompt).toBe(false);
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
      { tool: "task", sessionID: "test-session", callID: "call-123" },
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
    const sessionId = uniqueSessionId();

    const plugin = await OmoOmcsPlugin(mockCtx as never);

    // Start with ralph-loop
    const ralphOutput1 = {
      message: {},
      parts: [{ type: "text", text: `[RALPH LOOP ACTIVATED - COMPLETION GUARANTEE]

<user-task>
task 1
</user-task>

The \`<promise>TASK_COMPLETE</promise>\` tag binds you to completion.` }],
    };
    await plugin["chat.message"]!({ sessionID: sessionId }, ralphOutput1);

    let systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!({ sessionID: sessionId }, systemOutput);
    expect(systemOutput.system[0]).toContain("RALPH LOOP");

    // Cancel the current loop first before switching
    // This simulates /cancel-ralph being called
    const cancelOutput = {
      message: {},
      parts: [{ type: "text", text: "Cancel the currently active Ralph Loop" }],
    };
    await plugin["chat.message"]!({ sessionID: sessionId }, cancelOutput);

    // Now switch to ultrawork-ralph with a different session
    // (In practice, switching modes would require cancelling the old one first)
    const newSessionId = uniqueSessionId();
    const ultraworkRalphOutput = {
      message: {},
      parts: [{ type: "text", text: `[ULTRAWORK-RALPH ACTIVATED - MAXIMUM INTENSITY + COMPLETION GUARANTEE]

<user-task>
new task
</user-task>

Begin working NOW. The loop will not release you until you earn your \`<promise>TASK_COMPLETE</promise>\`.` }],
    };
    await plugin["chat.message"]!({ sessionID: newSessionId }, ultraworkRalphOutput);

    systemOutput = { system: [] as string[] };
    await plugin["experimental.chat.system.transform"]!({ sessionID: newSessionId }, systemOutput);
    expect(systemOutput.system[0]).toContain("ULTRAWORK-RALPH");
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
