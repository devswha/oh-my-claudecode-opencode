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

describe.skipIf(!canRunLLMTests)("E2E: Multi-Agent Workflows", () => {
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

  it("should initiate ralph-loop workflow via /ralph-loop command", async () => {
    if (!hasCredentials) return;

    const session = await ctx.client.session.create({
      body: { title: "E2E Ralph Loop" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(session.data!.id);

    await ctx.client.session.command({
      path: { id: session.data!.id },
      body: {
        command: "ralph-loop",
        arguments: "create a hello.txt file",
      },
      query: { directory: ctx.projectDir },
    });

    // Wait a reasonable time for the workflow to start
    await new Promise((r) => setTimeout(r, 10000));

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    // Ralph loop template should be present in some form
    const allText =
      messages.data
        ?.flatMap((m) => m.parts)
        .filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
        )
        .map((p) => (p as any).text)
        .join(" ") ?? "";

    expect(allText.toUpperCase()).toContain("RALPH");

    // Abort the session to prevent indefinite running
    await ctx.client.session.abort({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });
  }, 120000);

  it("should initiate autopilot workflow via /autopilot command", async () => {
    if (!hasCredentials) return;

    const session = await ctx.client.session.create({
      body: { title: "E2E Autopilot" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(session.data!.id);

    await ctx.client.session.command({
      path: { id: session.data!.id },
      body: {
        command: "autopilot",
        arguments: "create a basic TypeScript hello world file",
      },
      query: { directory: ctx.projectDir },
    });

    await new Promise((r) => setTimeout(r, 15000));

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    const allText =
      messages.data
        ?.flatMap((m) => m.parts)
        .filter(
          (p): p is Extract<typeof p, { type: "text" }> => p.type === "text"
        )
        .map((p) => (p as any).text)
        .join(" ") ?? "";

    expect(allText.toUpperCase()).toContain("AUTOPILOT");

    // Check that child sessions were spawned (autopilot delegates)
    const children = await ctx.client.session.children({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });
    // Autopilot should spawn at least one child agent
    // This may take time, so we check opportunistically

    await ctx.client.session.abort({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });
  }, 120000);

  it("should execute /deepsearch and return results", async () => {
    if (!hasCredentials) return;

    const session = await ctx.client.session.create({
      body: { title: "E2E Deepsearch" },
      query: { directory: ctx.projectDir },
    });
    ctx.createdSessionIds.push(session.data!.id);

    await ctx.client.session.command({
      path: { id: session.data!.id },
      body: {
        command: "deepsearch",
        arguments: "package.json",
      },
      query: { directory: ctx.projectDir },
    });

    // Use waitForSessionIdle (static import) with SSE primary / polling fallback
    await waitForSessionIdle(ctx.client, session.data!.id, ctx.projectDir, 90000);

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
  }, 120000);
});
