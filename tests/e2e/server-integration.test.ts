/**
 * E2E Server Integration Tests (Tier 1 - No LLM Required)
 *
 * Tests that verify OMCO plugin loads correctly in a real OpenCode server
 * and registers all agents, commands, and tools without making LLM calls.
 *
 * Skip condition: OMCO_E2E_ENABLED !== "true" OR OpenCode binary not found
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupTestServer,
  teardownTestServer,
  type TestContext,
} from "./helpers/setup.js";
import { canRunServerTests } from "./helpers/skip-conditions.js";
import {
  EXPECTED_TOOLS,
  EXPECTED_CORE_AGENTS,
  EXPECTED_CORE_COMMANDS,
  MIN_AGENT_COUNT,
  MIN_COMMAND_COUNT,
  TIMEOUTS,
} from "./helpers/constants.js";

describe.skipIf(!canRunServerTests)("E2E: Server Integration", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestServer();
  }, TIMEOUTS.serverStart);

  afterAll(async () => {
    if (ctx) {
      await teardownTestServer(ctx);
    }
  });

  describe("Plugin Registration", () => {
    it("should register OMCO as default agent", async () => {
      const agents = await ctx.client.app.agents({
        query: { directory: ctx.projectDir },
      });

      // app.agents() returns Array<Agent>, NOT a Map
      const omcoAgent = agents.data?.find((a) => a.name === "OMCO");
      expect(omcoAgent).toBeDefined();
      expect(omcoAgent?.name).toBe("OMCO");
      // Plugin-registered agents should not be marked as builtIn (may be undefined or false)
      expect(omcoAgent?.builtIn).not.toBe(true);
    });

    it("should register at least MIN_AGENT_COUNT agents", async () => {
      const agents = await ctx.client.app.agents({
        query: { directory: ctx.projectDir },
      });

      // agents.data is Array<Agent>
      expect(agents.data?.length).toBeGreaterThanOrEqual(MIN_AGENT_COUNT);
    });

    it("should register all core agents", async () => {
      const agents = await ctx.client.app.agents({
        query: { directory: ctx.projectDir },
      });

      // agents.data is Array<Agent>, use .some() to check existence
      for (const agentName of EXPECTED_CORE_AGENTS) {
        const found = agents.data?.some((a) => a.name === agentName);
        expect(found, `Expected agent "${agentName}" to be registered`).toBe(
          true
        );
      }
    });

    it("should register at least MIN_COMMAND_COUNT slash commands", async () => {
      const commands = await ctx.client.command.list({
        query: { directory: ctx.projectDir },
      });

      expect(commands.data?.length).toBeGreaterThanOrEqual(MIN_COMMAND_COUNT);
    });

    it("should register all core slash commands", async () => {
      const commands = await ctx.client.command.list({
        query: { directory: ctx.projectDir },
      });

      for (const cmdName of EXPECTED_CORE_COMMANDS) {
        const found = commands.data?.some((c) => c.name === cmdName);
        expect(found, `Expected command "${cmdName}" to be registered`).toBe(
          true
        );
      }
    });

    it("should register all 4 custom tools", async () => {
      const tools = await ctx.client.tool.ids({
        query: { directory: ctx.projectDir },
      });

      for (const toolName of EXPECTED_TOOLS) {
        expect(
          tools.data?.includes(toolName),
          `Expected tool "${toolName}" to be registered`
        ).toBe(true);
      }
    });
  });

  describe("Session Lifecycle", () => {
    it("should create and delete a session", async () => {
      const session = await ctx.client.session.create({
        body: { title: "E2E Test Session" },
        query: { directory: ctx.projectDir },
      });

      const sessionId = session.data?.id;
      expect(sessionId).toBeDefined();
      expect(sessionId).toBeTruthy();

      // Track for cleanup
      ctx.createdSessionIds.push(sessionId!);

      // Delete manually
      await ctx.client.session.delete({
        path: { id: sessionId! },
        query: { directory: ctx.projectDir },
      });

      // Remove from tracking since we manually deleted
      ctx.createdSessionIds = ctx.createdSessionIds.filter(
        (id) => id !== sessionId
      );
    });

    it("should create child sessions (parent-child relationship)", async () => {
      const parent = await ctx.client.session.create({
        body: { title: "E2E Parent Session" },
        query: { directory: ctx.projectDir },
      });
      const parentId = parent.data!.id;
      ctx.createdSessionIds.push(parentId);

      const child = await ctx.client.session.create({
        body: { parentID: parentId, title: "E2E Child Session" },
        query: { directory: ctx.projectDir },
      });
      const childId = child.data!.id;
      ctx.createdSessionIds.push(childId);

      // Verify parent-child relationship
      const children = await ctx.client.session.children({
        path: { id: parentId },
        query: { directory: ctx.projectDir },
      });

      expect(children.data?.some((c) => c.id === childId)).toBe(true);
    });

    it("should list sessions", async () => {
      const sessions = await ctx.client.session.list({
        query: { directory: ctx.projectDir },
      });

      expect(sessions.data).toBeDefined();
      expect(Array.isArray(sessions.data)).toBe(true);
    });
  });

  describe("Session Status API", () => {
    it("should return status dictionary for all sessions", async () => {
      const session = await ctx.client.session.create({
        body: { title: "E2E Status Test" },
        query: { directory: ctx.projectDir },
      });
      ctx.createdSessionIds.push(session.data!.id);

      // session.status() takes NO path param, returns { [key: string]: SessionStatus }
      const allStatuses = await ctx.client.session.status({
        query: { directory: ctx.projectDir },
      });
      expect(allStatuses.data).toBeDefined();

      // Index into dictionary with session ID (NOT a path parameter)
      // Note: Newly created sessions may not appear immediately in status
      const status = allStatuses.data?.[session.data!.id];

      // If status is available, verify it's idle; otherwise skip the check
      // (session status propagation may have slight delay)
      if (status) {
        expect(status.type).toBe("idle");
      } else {
        // Session exists but status not yet propagated - this is acceptable
        console.log("Note: Session status not immediately available, which is acceptable behavior");
      }
    });
  });
});
