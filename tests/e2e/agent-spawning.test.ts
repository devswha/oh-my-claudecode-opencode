/**
 * E2E Test: Agent Spawning (Tier 2 - LLM Required)
 *
 * Tests that verify agent spawning and child session creation
 * with real LLM interactions.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupTestServer,
  teardownTestServer,
  checkProviderCredentials,
  type TestContext,
} from "./helpers/setup";
import { waitForSessionIdle } from "./helpers/wait";
import { getAssistantTextFromMessages } from "./helpers/assertions";
import { canRunLLMTests } from "./helpers/skip-conditions";
import { TIMEOUTS } from "./helpers/constants";

describe.skipIf(!canRunLLMTests)("E2E: Agent Spawning", () => {
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

  it("should create child session and get agent response", async () => {
    if (!hasCredentials) return; // Skip if no credentials

    const parent = await ctx.client.session.create({
      body: { title: "E2E Agent Parent" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(parent.data!.id);

    const child = await ctx.client.session.create({
      body: {
        parentID: parent.data!.id,
        title: "explore: Find test files",
      },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(child.data!.id);

    // Use promptAsync() for non-blocking submission.
    // NOTE: session.prompt() may block until the full response is received,
    // making waitForSessionIdle() redundant. We use promptAsync() to submit
    // the prompt without blocking, then explicitly wait for idle via SSE/polling.
    await ctx.client.session.promptAsync({
      path: { id: child.data!.id },
      body: {
        parts: [
          { type: "text", text: "List the files in the current directory" },
        ],
      },
      query: { directory: ctx.projectDir },
    });

    // Wait for completion using SSE events (primary) or polling (fallback)
    await waitForSessionIdle(
      ctx.client,
      child.data!.id,
      ctx.projectDir,
      TIMEOUTS.llmPrompt
    );

    // Get response
    const messages = await ctx.client.session.messages({
      path: { id: child.data!.id },
      query: { directory: ctx.projectDir },
    });

    // messages.data is Array<{ info: Message, parts: Array<Part> }>
    // Message = UserMessage | AssistantMessage
    // AssistantMessage has role: "assistant"
    const assistantText = getAssistantTextFromMessages(messages.data);
    if (assistantText === "[AUTH_ERROR]") {
      console.warn("Skipping assertion due to LLM authentication error");
      return; // Skip this test due to auth issue
    }
    expect(assistantText.length).toBeGreaterThan(0);
  }, 90000);

  it("should spawn multiple child sessions in parallel", async () => {
    if (!hasCredentials) return;

    const parent = await ctx.client.session.create({
      body: { title: "E2E Parallel Parent" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(parent.data!.id);

    // Spawn 3 children in parallel
    const children = await Promise.all([
      ctx.client.session.create({
        body: { parentID: parent.data!.id, title: "explore: child 1" },
        query: { directory: ctx.projectDir },
      }),
      ctx.client.session.create({
        body: { parentID: parent.data!.id, title: "explore: child 2" },
        query: { directory: ctx.projectDir },
      }),
      ctx.client.session.create({
        body: { parentID: parent.data!.id, title: "explore: child 3" },
        query: { directory: ctx.projectDir },
      }),
    ]);

    for (const child of children) {
      ctx.createdSessionIds.push(child.data!.id);
      expect(child.data?.id).toBeDefined();
    }

    // Verify parent shows children
    const childList = await ctx.client.session.children({
      path: { id: parent.data!.id },
      query: { directory: ctx.projectDir },
    });
    expect(childList.data?.length).toBe(3);
  }, 30000);
});
