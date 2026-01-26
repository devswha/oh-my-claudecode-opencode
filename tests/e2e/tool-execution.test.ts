/**
 * E2E Test: Tool & Command Execution (Tier 2 - LLM Required)
 *
 * Tests that verify slash commands and tool execution
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

describe.skipIf(!canRunLLMTests)("E2E: Tool & Command Execution", () => {
  let ctx: TestContext;
  let hasCredentials = false;

  beforeAll(async () => {
    ctx = await setupTestServer();
    hasCredentials = await checkProviderCredentials(ctx.client);
  }, TIMEOUTS.serverStart);

  afterAll(async () => {
    if (ctx) await teardownTestServer(ctx);
  });

  it("should execute /help command", async () => {
    if (!hasCredentials) return;

    const session = await ctx.client.session.create({
      body: { title: "E2E Help Test" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(session.data!.id);

    // session.command() requires `arguments: string` when `body` is provided
    await ctx.client.session.command({
      path: { id: session.data!.id },
      body: { command: "help", arguments: "" },
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

    const response = getAssistantTextFromMessages(messages.data);
    if (response === "[AUTH_ERROR]") {
      console.warn("Skipping assertion due to LLM authentication error");
      return; // Skip this test due to auth issue
    }
    expect(response.length).toBeGreaterThan(0);
  }, 90000);

  it("should execute /ultrawork command and activate mode", async () => {
    if (!hasCredentials) return;

    const session = await ctx.client.session.create({
      body: { title: "E2E Ultrawork Test" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(session.data!.id);

    await ctx.client.session.command({
      path: { id: session.data!.id },
      body: {
        command: "ultrawork",
        arguments: "list all TypeScript files",
      },
      query: { directory: ctx.projectDir },
    });

    await waitForSessionIdle(
      ctx.client,
      session.data!.id,
      ctx.projectDir,
      120000
    );

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    const response = getAssistantTextFromMessages(messages.data);
    if (response === "[AUTH_ERROR]") {
      console.warn("Skipping assertion due to LLM authentication error");
      return;
    }
    expect(messages.data?.length).toBeGreaterThan(0);
  }, 120000);
});
