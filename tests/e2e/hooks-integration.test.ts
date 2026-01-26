import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupTestServer,
  teardownTestServer,
  checkProviderCredentials,
  type TestContext,
} from "./helpers/setup";
import { waitForSessionIdle } from "./helpers/wait";
import { canRunLLMTests } from "./helpers/skip-conditions";
import { TIMEOUTS } from "./helpers/constants";

describe.skipIf(!canRunLLMTests)("E2E: Hook Integration", () => {
  let ctx: TestContext;
  let hasCredentials = false;

  beforeAll(async () => {
    ctx = await setupTestServer();
    hasCredentials = await checkProviderCredentials(ctx.client);
    if (!hasCredentials) {
      console.warn(
        "No provider credentials found. Tier 2 tests will be skipped at test level."
      );
    }
  }, TIMEOUTS.serverStart);

  afterAll(async () => {
    if (ctx) await teardownTestServer(ctx);
  });

  it("should detect ultrawork keyword and activate mode", async () => {
    if (!hasCredentials) return;

    const session = await ctx.client.session.create({
      body: { title: "E2E Keyword Detection" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(session.data!.id);

    // Use promptAsync() for non-blocking submission
    await ctx.client.session.promptAsync({
      path: { id: session.data!.id },
      body: {
        parts: [{ type: "text", text: "ultrawork list all files" }],
      },
      query: { directory: ctx.projectDir },
    });

    await waitForSessionIdle(
      ctx.client,
      session.data!.id,
      ctx.projectDir,
      TIMEOUTS.llmPrompt
    );

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    // Verify ultrawork mode was activated
    const allText =
      messages.data
        ?.flatMap((m) => m.parts)
        .filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
        )
        .map((p) => (p as any).text)
        .join(" ") ?? "";

    expect(allText.toUpperCase()).toContain("ULTRAWORK");
  }, 90000);

  it("should receive SSE EventSessionIdle event", async () => {
    // This test verifies the SSE event stream works, which is critical
    // for our waitForSessionIdle primary approach.
    // It does NOT require LLM - just session creation produces events.

    const result = await ctx.client.event.subscribe({
      query: { directory: ctx.projectDir },
    });

    // Create a session (should trigger EventSessionCreated)
    const session = await ctx.client.session.create({
      body: { title: "E2E SSE Event Test" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(session.data!.id);

    // Collect events for a short period
    const collectedEvents: Array<any> = [];
    const collectPromise = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        // Explicitly close SSE stream on timeout to prevent resource leak
        result.stream.return?.(undefined);
        resolve();
      }, 5000); // Collect for 5s

      (async () => {
        try {
          for await (const event of result.stream) {
            collectedEvents.push(event);
            if (collectedEvents.length >= 5) {
              clearTimeout(timeout);
              // Explicitly close SSE stream after collecting enough events
              result.stream.return?.(undefined);
              resolve();
              return;
            }
          }
        } catch (err) {
          clearTimeout(timeout);
          result.stream.return?.(undefined);
          resolve();
        }
      })();
    });

    await collectPromise;

    // We should have received at least one event (server.connected, session.created, etc.)
    // The exact events depend on timing, so we just verify the stream works
    expect(collectedEvents.length).toBeGreaterThan(0);
  }, 30000);
});
