import { describe, it, expect, beforeEach, mock } from "bun:test";

const mockClient = {
  session: {
    create: mock(() => Promise.resolve({ data: { id: "test-session" } })),
    prompt: mock(() => Promise.resolve({})),
    messages: mock(() => Promise.resolve({ data: [] })),
    todo: mock(() => Promise.resolve({ data: [] })),
  },
  tui: {
    showToast: mock(() => Promise.resolve({})),
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

describe("Keyword Detector", () => {
  beforeEach(() => {
    mock.restore();
  });

  it("should detect ultrawork keyword", async () => {
    const { createKeywordDetectorHook } = await import("../src/hooks/keyword-detector");
    let detectedMode: string | null = null;

    const hook = createKeywordDetectorHook(mockCtx as never, {
      onModeChange: (_sessionID, mode) => {
        detectedMode = mode;
      },
    });

    const output = {
      message: {},
      parts: [{ type: "text", text: "ultrawork implement auth system" }],
    };

    await hook["chat.message"]({ sessionID: "test" }, output);

    expect(detectedMode).toBe("ultrawork");
    expect(output.parts.length).toBeGreaterThan(1);
  });

  it("should detect ultrawork-ralph command", async () => {
    const { createKeywordDetectorHook } = await import("../src/hooks/keyword-detector");
    let detectedMode: string | null = null;

    const hook = createKeywordDetectorHook(mockCtx as never, {
      onModeChange: (_sessionID, mode) => {
        detectedMode = mode;
      },
    });

    const output = {
      message: {},
      parts: [{ type: "text", text: "/ultrawork-ralph implement full auth" }],
    };

    await hook["chat.message"]({ sessionID: "test" }, output);

    expect(detectedMode).toBe("ultrawork-ralph");
  });

  it("should detect ralph-loop command", async () => {
    const { createKeywordDetectorHook } = await import("../src/hooks/keyword-detector");
    let detectedMode: string | null = null;

    const hook = createKeywordDetectorHook(mockCtx as never, {
      onModeChange: (_sessionID, mode) => {
        detectedMode = mode;
      },
    });

    const output = {
      message: {},
      parts: [{ type: "text", text: '/ralph-loop "implement feature X"' }],
    };

    await hook["chat.message"]({ sessionID: "test" }, output);

    expect(detectedMode).toBe("ralph-loop");
  });

  it("should detect search keywords", async () => {
    const { createKeywordDetectorHook } = await import("../src/hooks/keyword-detector");

    const hook = createKeywordDetectorHook(mockCtx as never, {});

    const output = {
      message: {},
      parts: [{ type: "text", text: "find all auth related files" }],
    };

    await hook["chat.message"]({ sessionID: "test" }, output);

    const hasSearchMode = output.parts.some(
      (p) => p.text?.includes("[SEARCH MODE]")
    );
    expect(hasSearchMode).toBe(true);
  });
});

describe("System Prompt Injector", () => {
  it("should inject ultrawork system prompt", async () => {
    const { createSystemPromptInjector } = await import(
      "../src/hooks/system-prompt-injector"
    );

    const injector = createSystemPromptInjector(mockCtx as never);

    injector.setMode("test-session", "ultrawork", "test task");

    const output = { system: [] as string[] };
    await injector["experimental.chat.system.transform"](
      { sessionID: "test-session" },
      output
    );

    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain("ULTRAWORK MODE ACTIVATED");
  });

  it("should inject ultrawork-ralph system prompt", async () => {
    const { createSystemPromptInjector } = await import(
      "../src/hooks/system-prompt-injector"
    );

    const injector = createSystemPromptInjector(mockCtx as never);

    injector.setMode("test-session", "ultrawork-ralph", "test task");

    const output = { system: [] as string[] };
    await injector["experimental.chat.system.transform"](
      { sessionID: "test-session" },
      output
    );

    expect(output.system.length).toBe(1);
    expect(output.system[0]).toContain("ULTRAWORK-RALPH ACTIVATED");
  });

  it("should clear mode", async () => {
    const { createSystemPromptInjector } = await import(
      "../src/hooks/system-prompt-injector"
    );

    const injector = createSystemPromptInjector(mockCtx as never);

    injector.setMode("test-session", "ultrawork");
    injector.clearMode("test-session");

    const output = { system: [] as string[] };
    await injector["experimental.chat.system.transform"](
      { sessionID: "test-session" },
      output
    );

    expect(output.system.length).toBe(0);
  });
});

describe("Ralph Loop", () => {
  it("should detect completion promise", async () => {
    const { createRalphLoopHook } = await import("../src/hooks/ralph-loop");

    const hook = createRalphLoopHook(mockCtx as never, {});

    expect(hook.checkCompletionInContent("<promise>TASK_COMPLETE</promise>")).toBe(true);
    expect(hook.checkCompletionInContent("<promise>DONE</promise>")).toBe(true);
    expect(hook.checkCompletionInContent("just some text")).toBe(false);
  });

  it("should start and cancel loop", async () => {
    const { createRalphLoopHook } = await import("../src/hooks/ralph-loop");

    const hook = createRalphLoopHook(mockCtx as never, {});

    const started = hook.startLoop("test-session", "test task");
    expect(started).toBe(true);

    const state = hook.getState("test-session");
    expect(state).not.toBeNull();
    expect(state?.prompt).toBe("test task");

    const cancelled = hook.cancelLoop("test-session");
    expect(cancelled).toBe(true);

    const stateAfterCancel = hook.getState("test-session");
    expect(stateAfterCancel).toBeNull();
  });
});

describe("Prompts", () => {
  it("should export all system prompts", async () => {
    const {
      ULTRAWORK_SYSTEM_PROMPT,
      RALPH_LOOP_SYSTEM_PROMPT,
      ULTRAWORK_RALPH_SYSTEM_PROMPT,
    } = await import("../src/prompts/ultrawork");

    expect(ULTRAWORK_SYSTEM_PROMPT).toContain("ULTRAWORK MODE ACTIVATED");
    expect(RALPH_LOOP_SYSTEM_PROMPT).toContain("RALPH LOOP ACTIVATED");
    expect(ULTRAWORK_RALPH_SYSTEM_PROMPT).toContain("ULTRAWORK-RALPH ACTIVATED");
    expect(ULTRAWORK_RALPH_SYSTEM_PROMPT).toContain("<promise>TASK_COMPLETE</promise>");
  });
});
