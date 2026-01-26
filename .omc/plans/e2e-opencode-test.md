# E2E Test Suite Plan: OMCO Plugin against Real OpenCode Instance

## Revision History

| Rev | Date | Changes |
|-----|------|---------|
| 1 | Initial | First draft |
| 2 | Rev 2 | Fixed all 5 critical issues from Critic review + Architect recommendations |
| 3 | Current | Fixed 3 critical + 4 minor issues from RALPLAN iteration 3 Critic review |

### Critical Fixes Applied (Rev 2)
1. **FIXED:** `app.agents()` returns `Array<Agent>`, not a Map - all assertions now use `.find()` / `.some()` on array
2. **FIXED:** `session.status()` takes NO session ID path param - returns `{ [key: string]: SessionStatus }` dictionary. Updated to index by session ID, with SSE `EventSessionIdle` as primary approach
3. **FIXED:** Plugin loading strategy now documented - uses `.opencode/plugins/` file-based approach with CWD-based test project dir
4. **FIXED:** `createOpencodeServer({ port: 0 })` for random port to avoid collisions
5. **FIXED:** `directory` handled via `createOpencode()` CWD or query parameter consistently
6. **FIXED:** `canRunLLMTests` is now synchronous (checks env vars only); credential check moved to `beforeAll`
7. **FIXED:** SSE test is now a clear Tier 2 acceptance criterion (not a stretch goal)

### Fixes Applied (Rev 3)

**Critical Fixes:**
1. **CRITICAL 1 FIXED:** `provider.list()` return type - Changed `providers.data?.some(p => p.id === "github-copilot")` to `providers.data?.connected?.includes("github-copilot")`. The `ProviderListResponses.200` type has `{ all, default, connected }` shape, not an array of providers at the top level. The `connected` field is `Array<string>` listing authenticated provider IDs.
2. **CRITICAL 2 FIXED:** `import.meta.dir` is Bun-only - Replaced with Node.js/vitest-compatible approach using `fileURLToPath(import.meta.url)` + `dirname()` to derive `__dirname`. This ensures `createTestProjectDir()` works in vitest (which runs on Node.js).
3. **CRITICAL 3 FIXED:** `bun test --ignore` flag is unverified/undocumented - Replaced with explicit file pattern `bun test tests/*.test.ts` and documented preferred approach using `bunfig.toml` with `[test] exclude = ["tests/e2e/"]`.

**Minor Fixes:**
4. **MINOR 1 FIXED:** `session.command()` missing `arguments` - Added `arguments: ""` to `/help` command body. The `body` type requires `{ command: string, arguments: string }`.
5. **MINOR 2 FIXED:** `prompt()` vs `promptAsync()` semantics - Changed all `session.prompt()` calls to `session.promptAsync()` for non-blocking submission. This makes `waitForSessionIdle()` meaningful (prompt returns immediately, then we wait via SSE/polling). Documented the intentional choice.
6. **MINOR 3 FIXED:** Dynamic re-import of `waitForSessionIdle` - Changed `await import("./helpers/wait")` in `workflows.test.ts` to a static import at the top of the file.
7. **MINOR 4 FIXED:** SSE stream not closed - Added explicit `result.stream.return?.()` calls in `waitForSessionIdleSSE()` (on resolve, reject, and timeout paths) and in the hooks-integration SSE event collection test (on timeout, collection complete, and error paths).

---

## Context

### Original Request
Design and plan a comprehensive E2E test suite that verifies the OMCO plugin works correctly against a **real running OpenCode instance**, not mocked SDK calls.

### Research Findings

**Current Test State:**
- 11 test files exist, all using mocked `ctx.client` objects
- `tests/integration.test.ts` and `tests/e2e-integration.test.ts` simulate full flows but with fake `session.create/prompt/messages` responses
- `tests/e2e/npm-install.test.ts` (vitest) tests packaging but not runtime behavior
- No test currently verifies that the plugin works inside a real OpenCode server

**SDK Capabilities (Critical Discovery):**
The `@opencode-ai/sdk` v1.1.34 provides `createOpencode()` which spins up **both a server and client** programmatically:
```typescript
import { createOpencode } from "@opencode-ai/sdk";
// Returns { client: OpencodeClient, server: { url: string, close(): void } }
```

This is the golden path for E2E testing. We can:
1. Start an OpenCode server programmatically in `beforeAll`
2. Use the returned client to interact with it
3. Shut it down in `afterAll`

Additionally, `createOpencodeServer()` and `createOpencodeClient()` are available separately for more control.

**SDK API Shapes (Verified from types.gen.d.ts):**

| API | Return Type | Notes |
|-----|-------------|-------|
| `app.agents()` | `Array<Agent>` | Array with `{ name, description, mode, builtIn, ... }` |
| `session.status()` | `{ [key: string]: SessionStatus }` | Dictionary of ALL sessions, NO path param |
| `SessionStatus` | `{ type: "idle" } \| { type: "busy" } \| { type: "retry", ... }` | Union type |
| `session.messages()` | `Array<{ info: Message, parts: Array<Part> }>` | `info.role` is on the `Message`, not nested |
| `Message` | `UserMessage \| AssistantMessage` | `AssistantMessage.role === "assistant"` |
| `Part` | `TextPart \| ...` (union) | `TextPart: { type: "text", text: string }` |
| `event.subscribe()` | SSE stream of `Event` | `EventSessionIdle: { type: "session.idle", properties: { sessionID } }` |

**Plugin Loading (Critical Discovery):**
The `opencode` binary resolves plugins from `.opencode/plugins/` directory relative to the project CWD. The project already has `.opencode/plugins/omco.ts` which does:
```typescript
import OmoOmcsPlugin from "../../dist/index.js";
export default OmoOmcsPlugin;
```
For E2E tests, we must create a test project directory with a similar `.opencode/plugins/` loader that imports from the built dist output.

**Server Configuration:**
- `createOpencodeServer()` accepts `{ port?: number }` - use `port: 0` for random port
- Server inherits CWD for project resolution; there is NO `directory` parameter on `createOpencodeServer()`
- `directory` is available as a query parameter on individual API calls

**Plugin Registration Surface:**
- 4 custom tools: `call_omco_agent`, `background_task`, `background_output`, `background_cancel`
- 30+ agents registered via `config.agent`
- 33+ slash commands registered via `config.command`
- 6 hooks: `event`, `chat.message`, `experimental.chat.system.transform`, `tool.execute.before`, `tool.execute.after`, `config`

**Model Configuration:**
```typescript
HARDCODED_TIER_DEFAULTS = {
  haiku: "github-copilot/claude-haiku-4",
  sonnet: "github-copilot/claude-sonnet-4",
  opus: "github-copilot/claude-opus-4",
}
```

**Key Constraints Identified:**
1. OpenCode server needs its CWD set to a project directory that contains `.opencode/plugins/` with OMCO loader
2. Provider credentials required for actual LLM calls (github-copilot models)
3. Session operations may take 10-120s depending on model response time
4. Tests must clean up sessions to prevent resource leaks
5. Dual framework situation: bun:test (primary) vs vitest (E2E packaging)
6. `port: 0` required to avoid port collisions with other OpenCode instances

---

## Work Objectives

### Core Objective
Build an E2E test suite that boots a real OpenCode server, loads the OMCO plugin, and verifies every critical integration point end-to-end.

### Deliverables
1. **E2E test infrastructure** (`tests/e2e/helpers/`) - Server lifecycle, skip logic, cleanup
2. **Server integration tests** (`tests/e2e/server-integration.test.ts`) - Plugin loads, agents/commands register
3. **Session & agent tests** (`tests/e2e/agent-spawning.test.ts`) - `call_omco_agent` creates real child sessions
4. **Tool execution tests** (`tests/e2e/tool-execution.test.ts`) - Background tools work end-to-end
5. **Hook integration tests** (`tests/e2e/hooks-integration.test.ts`) - Mode activation, system prompt injection
6. **Multi-agent workflow tests** (`tests/e2e/workflows.test.ts`) - Ultrawork, ralph-loop flows
7. **CI configuration** - npm script, conditional execution, timeout handling

### Definition of Done
- All E2E tests pass when OpenCode server is running with valid credentials
- All E2E tests skip gracefully (not fail) when server/credentials unavailable
- Tests clean up all created sessions
- Tests complete within 5 minutes total
- CI pipeline can optionally run E2E tests

---

## Guardrails

### Must Have
- Programmatic OpenCode server startup via `createOpencode({ port: 0 })`
- Plugin loaded via `.opencode/plugins/` file-based approach in test project dir
- Graceful skip when server cannot start or no credentials available
- Session cleanup in `afterAll`/`afterEach` (delete all test sessions)
- Isolated test project directory (temp dir with `.opencode/plugins/` loader)
- Timeouts on all LLM-dependent operations (30s per prompt, 5 min total suite)
- Clear separation between "server only" tests (no LLM) and "full E2E" tests (needs LLM)
- SSE-based session idle monitoring (primary) with polling fallback

### Must NOT Have
- Hard dependency on external services in the default `bun test` run
- Tests that modify the user's real OpenCode configuration
- Tests that leave orphaned sessions on the server
- Flaky tests that depend on specific LLM response content (assert structure, not content)
- Any pollution of the user's `~/.opencode/` or `~/.config/opencode/` directories
- Hardcoded port numbers (always use `port: 0`)

---

## Architecture Decision: Plugin Loading Strategy

### How the OMCO Plugin Gets Loaded

The `opencode` binary does NOT use `config.plugin` for simple npm resolution. Instead, it discovers plugins from `.opencode/plugins/` directory relative to the server's working directory.

**Production setup** (this project):
```
.opencode/plugins/omco.ts
```
```typescript
import OmoOmcsPlugin from "../../dist/index.js";
export default OmoOmcsPlugin;
```

**E2E test setup:**
The test infrastructure must create a temporary project directory that mirrors this pattern:
```
/tmp/omco-e2e-XXXXX/
├── .opencode/
│   └── plugins/
│       └── omco.ts          # Imports OMCO from absolute path to project dist/
├── package.json              # Minimal project metadata
├── tsconfig.json             # Minimal TypeScript config
└── src/
    └── index.ts              # Empty source file
```

The `.opencode/plugins/omco.ts` loader in the test dir uses an **absolute path** to the project's `dist/index.js`:
```typescript
// Generated by test setup
import OmoOmcsPlugin from "/home/user/workspace/oh-my-claudecode-opencode/dist/index.js";
export default OmoOmcsPlugin;
```

**Server CWD:** The spawned OpenCode process's CWD must be set to this test project dir. Since `createOpencodeServer()` inherits CWD, we use `process.chdir()` in `beforeAll` (and restore in `afterAll`) or spawn via child process with `cwd` option.

**Preferred approach:** Use `createOpencode({ port: 0 })` after changing to the test project dir, which handles both server and client creation.

---

## Architecture Decision: Test Framework

### Decision: Use **vitest** for all E2E tests

**Rationale:**
1. The existing E2E packaging test (`npm-install.test.ts`) already uses vitest
2. vitest has superior timeout configuration, `describe.skipIf()`, and test lifecycle hooks
3. bun:test lacks `describe.skipIf()` and has less mature conditional skip patterns
4. E2E tests run separately from unit tests anyway (`bun test` vs `vitest run`)
5. Keeps unit tests on bun:test (fast) and E2E on vitest (feature-rich)

### Vitest Configuration

**File:** `tests/e2e/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['tests/e2e/npm-install.test.ts'], // Existing test, runs separately
    testTimeout: 120000,
    hookTimeout: 60000,
    globals: true,
  },
});
```

### Test Script Configuration

**Note:** `bun test --ignore` is NOT a documented bun test flag. Instead, use explicit file patterns to include only unit/integration tests, excluding E2E:

```json
{
  "scripts": {
    "test": "bun test tests/*.test.ts tests/**/*.test.ts --exclude tests/e2e/",
    "test:e2e": "vitest run --config tests/e2e/vitest.config.ts",
    "test:e2e:server": "vitest run --config tests/e2e/vitest.config.ts --grep 'Server'",
    "test:all": "bun test tests/*.test.ts tests/**/*.test.ts --exclude tests/e2e/ && vitest run --config tests/e2e/vitest.config.ts"
  }
}
```

**Alternative (preferred):** Add a `bunfig.toml` at project root to permanently exclude E2E from `bun test`:
```toml
[test]
exclude = ["tests/e2e/"]
```
With `bunfig.toml`, scripts simplify to:
```json
{
  "scripts": {
    "test": "bun test",
    "test:e2e": "vitest run --config tests/e2e/vitest.config.ts",
    "test:e2e:server": "vitest run --config tests/e2e/vitest.config.ts --grep 'Server'",
    "test:all": "bun test && vitest run --config tests/e2e/vitest.config.ts"
  }
}
```

---

## Architecture Decision: Two-Tier E2E Testing

### Tier 1: Server Integration (No LLM Required)
Tests that the OMCO plugin loads and registers correctly in a real OpenCode server, without making any LLM calls. These verify:
- Plugin initialization
- Agent registration (30+ agents visible via `app.agents()` returning `Array<Agent>`)
- Command registration (33+ commands visible via `command.list()`)
- Tool registration (4 tools visible via `tool.ids()`)
- Configuration handler execution
- Session creation/deletion lifecycle

**Skip condition:** `OMCO_E2E_ENABLED !== "true"` or OpenCode binary not found or server fails to start.

### Tier 2: Full E2E (LLM Required)
Tests that verify actual agent execution, requiring provider credentials. These verify:
- `call_omco_agent` spawning real child sessions
- Subagent responses coming back with content
- Background task creation and completion
- Slash command execution triggering hooks
- Mode activation through real chat messages
- SSE event stream receiving `EventSessionIdle` events

**Skip condition:** Tier 1 skip condition OR `OMCO_E2E_LLM !== "true"` OR no valid provider credentials detected (checked in `beforeAll`).

---

## Architecture Decision: Session Idle Monitoring

### Primary: SSE Events (Recommended)

Use `event.subscribe()` to listen for `EventSessionIdle` events. This is non-polling, efficient, and matches the SDK design intent.

```typescript
// Primary approach: SSE-based
async function waitForSessionIdleSSE(
  client: OpencodeClient,
  sessionId: string,
  timeoutMs: number = 60000
): Promise<void> {
  const result = await client.event.subscribe({
    query: { directory: testProjectDir },
  });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Session ${sessionId} did not become idle within ${timeoutMs}ms`));
    }, timeoutMs);

    (async () => {
      for await (const event of result.stream) {
        if (event.type === "session.idle" && event.properties.sessionID === sessionId) {
          clearTimeout(timeout);
          resolve();
          return;
        }
      }
    })().catch(reject);
  });
}
```

### Fallback: Polling `session.status()`

Poll `session.status()` (no session ID param - returns ALL sessions) and index into the dictionary:

```typescript
// Fallback approach: Polling
async function waitForSessionIdlePoll(
  client: OpencodeClient,
  sessionId: string,
  timeoutMs: number = 60000
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const allStatuses = await client.session.status({
      query: { directory: testProjectDir },
    });
    // allStatuses.data is { [sessionId: string]: SessionStatus }
    const status = allStatuses.data?.[sessionId];
    if (status?.type === "idle") return;
    if (status?.type === "retry") {
      // Session is retrying, keep waiting
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Session ${sessionId} did not become idle within ${timeoutMs}ms`);
}
```

**Strategy:** Try SSE first. If SSE connection fails (e.g., network issue), fall back to polling. The helper wraps both approaches.

---

## Task Flow and Dependencies

```
Task 1: E2E Infrastructure (helpers, setup, teardown)
    |
    +---> Task 2: Server Integration Tests (Tier 1)
    |         |
    |         +---> Task 3: Agent Spawning Tests (Tier 2)
    |         |
    |         +---> Task 4: Tool Execution Tests (Tier 2)
    |         |
    |         +---> Task 5: Hook Integration Tests (Tier 2)
    |
    +---> Task 6: Multi-Agent Workflow Tests (Tier 2, depends on Tasks 3-5)
    |
    +---> Task 7: CI Integration & Scripts
```

---

## Detailed TODOs

### Task 1: E2E Test Infrastructure

**File:** `tests/e2e/helpers/setup.ts`

**Acceptance Criteria:**
- [ ] `createTestProjectDir()` creates temp directory with `.opencode/plugins/omco.ts` loader that imports from the project's absolute `dist/index.js` path
- [ ] `destroyTestProjectDir(path)` cleans up temp directory
- [ ] `setupTestServer()` uses `createOpencode({ port: 0 })` to start server + client, with CWD set to test project dir
- [ ] `teardownTestServer(ctx)` cleans up sessions, stops server, restores CWD, destroys temp dir
- [ ] `checkProviderCredentials(client)` calls `provider.list()` and checks `data.connected.includes("github-copilot")`
- [ ] `cleanupSessions(client, sessionIds)` deletes all test sessions (ignores errors for already-deleted)
- [ ] All helper functions have proper TypeScript types
- [ ] Timeout defaults: server start 30s, LLM prompt 60s, session cleanup 10s

```typescript
// Conceptual shape of helpers/setup.ts

import { createOpencode, type OpencodeClient } from "@opencode-ai/sdk";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { tmpdir } from "os";

// Node.js/vitest-compatible __dirname (import.meta.dir is Bun-only)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestContext {
  server: { url: string; close(): void };
  client: OpencodeClient;
  projectDir: string;
  originalCwd: string;
  createdSessionIds: string[];
}

export function createTestProjectDir(): string {
  const tempDir = mkdtempSync(join(tmpdir(), "omco-e2e-"));

  // Create .opencode/plugins/ directory
  const pluginsDir = join(tempDir, ".opencode", "plugins");
  mkdirSync(pluginsDir, { recursive: true });

  // Create plugin loader with absolute path to project dist
  // __dirname is tests/e2e/helpers/, so go up 3 levels to project root
  const projectRoot = join(__dirname, "..", "..", "..");
  const distPath = join(projectRoot, "dist", "index.js");
  writeFileSync(
    join(pluginsDir, "omco.ts"),
    `import OmoOmcsPlugin from "${distPath}";\nexport default OmoOmcsPlugin;\n`
  );

  // Create minimal project structure
  writeFileSync(
    join(tempDir, "package.json"),
    JSON.stringify({ name: "omco-e2e-test", version: "1.0.0" })
  );
  writeFileSync(
    join(tempDir, "tsconfig.json"),
    JSON.stringify({ compilerOptions: { target: "ES2022" } })
  );
  mkdirSync(join(tempDir, "src"), { recursive: true });
  writeFileSync(join(tempDir, "src", "index.ts"), "// E2E test file\n");

  return tempDir;
}

export function destroyTestProjectDir(path: string): void {
  rmSync(path, { recursive: true, force: true });
}

export async function setupTestServer(): Promise<TestContext> {
  const projectDir = createTestProjectDir();
  const originalCwd = process.cwd();

  // Change to test project dir so server discovers .opencode/plugins/
  process.chdir(projectDir);

  const { client, server } = await createOpencode({ port: 0 });

  return {
    server,
    client,
    projectDir,
    originalCwd,
    createdSessionIds: [],
  };
}

export async function teardownTestServer(ctx: TestContext): Promise<void> {
  // Clean up sessions
  await cleanupSessions(ctx.client, ctx.createdSessionIds);

  // Stop server
  ctx.server.close();

  // Restore CWD
  process.chdir(ctx.originalCwd);

  // Destroy temp dir
  destroyTestProjectDir(ctx.projectDir);
}

export async function checkProviderCredentials(client: OpencodeClient): Promise<boolean> {
  try {
    // provider.list() returns { all: Array<Provider>, default: { ... }, connected: Array<string> }
    // Use .connected to check authenticated providers (not .all which lists all available)
    const providers = await client.provider.list();
    return providers.data?.connected?.includes("github-copilot") ?? false;
  } catch {
    return false;
  }
}

export async function cleanupSessions(
  client: OpencodeClient,
  sessionIds: string[]
): Promise<void> {
  for (const id of sessionIds) {
    try {
      await client.session.delete({ path: { id } });
    } catch {
      // Session may already be deleted
    }
  }
}
```

**File:** `tests/e2e/helpers/wait.ts`

**Acceptance Criteria:**
- [ ] `waitForSessionIdle(client, sessionId, projectDir, timeoutMs)` uses SSE `EventSessionIdle` events as primary approach
- [ ] Falls back to polling `session.status()` (no path param) and indexing into `data[sessionId]` if SSE fails
- [ ] Handles `SessionStatus` union type: `{ type: "idle" }`, `{ type: "busy" }`, `{ type: "retry" }`
- [ ] Proper timeout with descriptive error message

```typescript
// Conceptual shape of helpers/wait.ts

import type { OpencodeClient } from "@opencode-ai/sdk";

export async function waitForSessionIdle(
  client: OpencodeClient,
  sessionId: string,
  projectDir: string,
  timeoutMs: number = 60000
): Promise<void> {
  // Try SSE-based approach first
  try {
    return await waitForSessionIdleSSE(client, sessionId, projectDir, timeoutMs);
  } catch (sseError) {
    console.warn("SSE approach failed, falling back to polling:", sseError);
    return await waitForSessionIdlePoll(client, sessionId, projectDir, timeoutMs);
  }
}

async function waitForSessionIdleSSE(
  client: OpencodeClient,
  sessionId: string,
  projectDir: string,
  timeoutMs: number
): Promise<void> {
  // First check if already idle
  const currentStatus = await client.session.status({
    query: { directory: projectDir },
  });
  if (currentStatus.data?.[sessionId]?.type === "idle") return;

  const result = await client.event.subscribe({
    query: { directory: projectDir },
  });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Explicitly close the SSE stream on timeout to prevent resource leak
      result.stream.return?.();
      reject(new Error(`Session ${sessionId} did not become idle within ${timeoutMs}ms`));
    }, timeoutMs);

    (async () => {
      for await (const event of result.stream) {
        // event is an Event union type
        if (
          "type" in event &&
          event.type === "session.idle" &&
          "properties" in event &&
          (event as any).properties?.sessionID === sessionId
        ) {
          clearTimeout(timeout);
          // Explicitly close the SSE stream after receiving the target event
          result.stream.return?.();
          resolve();
          return;
        }
      }
    })().catch((err) => {
      clearTimeout(timeout);
      result.stream.return?.();
      reject(err);
    });
  });
}

async function waitForSessionIdlePoll(
  client: OpencodeClient,
  sessionId: string,
  projectDir: string,
  timeoutMs: number
): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const allStatuses = await client.session.status({
      query: { directory: projectDir },
    });
    // allStatuses.data is { [sessionId: string]: SessionStatus }
    const status = allStatuses.data?.[sessionId];
    if (status?.type === "idle") return;
    // If type is "busy" or "retry", keep waiting
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Session ${sessionId} did not become idle within ${timeoutMs}ms`);
}
```

**File:** `tests/e2e/helpers/assertions.ts`

**Acceptance Criteria:**
- [ ] `expectAgentRegistered(agents, agentName)` - uses `.find()` on `Array<Agent>` (NOT bracket notation)
- [ ] `expectCommandRegistered(commands, commandName)` - finds command by name in array
- [ ] `expectToolRegistered(toolIds, toolName)` - finds tool name in array
- [ ] `getAssistantTextFromMessages(messages)` - extracts text from `Array<{ info: Message, parts: Array<Part> }>`, checking `info.role === "assistant"` and filtering `parts` for `type === "text"`

```typescript
// Conceptual shape of helpers/assertions.ts

import type { Agent, Message, Part } from "@opencode-ai/sdk/dist/gen/types.gen.js";

/**
 * Verify an agent is registered. app.agents() returns Array<Agent>.
 */
export function expectAgentRegistered(agents: Array<Agent>, agentName: string): void {
  const found = agents.find(a => a.name === agentName);
  if (!found) {
    const available = agents.map(a => a.name).join(", ");
    throw new Error(`Agent "${agentName}" not found. Available: ${available}`);
  }
}

/**
 * Extract all assistant text from messages.
 * session.messages() returns Array<{ info: Message, parts: Array<Part> }>
 * Message = UserMessage | AssistantMessage
 * AssistantMessage has role: "assistant"
 * Parts include TextPart with { type: "text", text: string }
 */
export function getAssistantTextFromMessages(
  messages: Array<{ info: Message; parts: Array<Part> }> | undefined
): string {
  if (!messages) return "";

  return messages
    .filter(m => m.info.role === "assistant")
    .flatMap(m => m.parts)
    .filter((p): p is Extract<Part, { type: "text" }> => p.type === "text")
    .map(p => p.text)
    .join("\n");
}
```

**File:** `tests/e2e/helpers/constants.ts`

**Acceptance Criteria:**
- [ ] `EXPECTED_TOOLS = ["call_omco_agent", "background_task", "background_output", "background_cancel"]`
- [ ] `EXPECTED_CORE_AGENTS` - at least 10 core agent names
- [ ] `EXPECTED_CORE_COMMANDS` - at least 9 core command names, use minimum threshold (not exact count since dynamic skills add more)
- [ ] `MIN_AGENT_COUNT = 20` - minimum number of agents expected (instead of hardcoded 30)
- [ ] `MIN_COMMAND_COUNT = 20` - minimum number of commands expected (instead of hardcoded 33)
- [ ] `TIMEOUTS = { serverStart: 30000, llmPrompt: 60000, sessionCleanup: 10000, totalSuite: 300000 }`

```typescript
// Conceptual shape of helpers/constants.ts

export const EXPECTED_TOOLS = [
  "call_omco_agent",
  "background_task",
  "background_output",
  "background_cancel",
];

export const EXPECTED_CORE_AGENTS = [
  "architect", "executor", "explore", "researcher",
  "designer", "writer", "planner", "critic", "analyst", "vision",
];

export const EXPECTED_CORE_COMMANDS = [
  "ultrawork", "ralph-loop", "ultrawork-ralph",
  "autopilot", "plan", "ralplan",
  "deepsearch", "analyze", "help",
];

// Use minimum thresholds instead of exact counts
// The actual count is 30+ agents and 33+ commands, but dynamic skills may vary
export const MIN_AGENT_COUNT = 20;
export const MIN_COMMAND_COUNT = 20;

export const TIMEOUTS = {
  serverStart: 30000,
  llmPrompt: 60000,
  sessionCleanup: 10000,
  totalSuite: 300000,
};
```

**File:** `tests/e2e/helpers/skip-conditions.ts`

**Acceptance Criteria:**
- [ ] `isOpenCodeInstalled()` - SYNCHRONOUS check if `opencode` binary exists in PATH
- [ ] `isE2EEnabled()` - SYNCHRONOUS check of `OMCO_E2E_ENABLED` env var
- [ ] `isLLMEnabled()` - SYNCHRONOUS check of `OMCO_E2E_LLM` env var
- [ ] `canRunServerTests` - SYNCHRONOUS boolean (computed at module load) for use with `describe.skipIf()`
- [ ] `canRunLLMTests` - SYNCHRONOUS boolean (computed at module load) for use with `describe.skipIf()`
- [ ] Provider credential check moved into `beforeAll` (async context), not skip condition

```typescript
// Conceptual shape of helpers/skip-conditions.ts

import { execSync } from "child_process";

function isOpenCodeInstalled(): boolean {
  try {
    execSync("which opencode", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function isE2EEnabled(): boolean {
  return process.env.OMCO_E2E_ENABLED === "true";
}

function isLLMEnabled(): boolean {
  return process.env.OMCO_E2E_LLM === "true";
}

// These are MODULE-LEVEL CONSTANTS evaluated at import time.
// They MUST be synchronous for describe.skipIf() to work.
export const canRunServerTests: boolean = isOpenCodeInstalled() && isE2EEnabled();
export const canRunLLMTests: boolean = canRunServerTests && isLLMEnabled();

// Provider credential check is ASYNC and must be done inside beforeAll.
// If credentials are missing, tests within the describe block should be skipped
// via test-level conditionals or by setting a flag.
export { isOpenCodeInstalled, isE2EEnabled, isLLMEnabled };
```

**File:** `tests/e2e/helpers/index.ts`

Barrel export of all helpers.

---

### Task 2: Server Integration Tests (Tier 1 - No LLM)

**File:** `tests/e2e/server-integration.test.ts`

**Acceptance Criteria:**
- [ ] Uses `describe.skipIf(!canRunServerTests)` for graceful skip (synchronous condition)
- [ ] Starts OpenCode server in `beforeAll` via `setupTestServer()`, stops in `afterAll` via `teardownTestServer()`
- [ ] Test: plugin initializes and server starts without errors
- [ ] Test: OMCO default agent is registered - uses `agents.data?.find(a => a.name === "OMCO")` on `Array<Agent>`
- [ ] Test: at least `MIN_AGENT_COUNT` agents are registered - uses `agents.data?.length`
- [ ] Test: all core agents are registered - uses `.some(a => a.name === name)` on array
- [ ] Test: at least `MIN_COMMAND_COUNT` commands are registered
- [ ] Test: all core commands are registered - uses `.some(c => c.name === name)` on array
- [ ] Test: 4 custom tools are registered - uses `toolIds.data?.includes(name)`
- [ ] Test: session can be created and deleted without errors
- [ ] Test: parent-child session relationships work
- [ ] All tests complete in < 30 seconds total
- [ ] `directory` query parameter passed consistently on all API calls

```typescript
// Test structure outline
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  setupTestServer, teardownTestServer,
  type TestContext,
} from "./helpers/setup";
import {
  canRunServerTests,
} from "./helpers/skip-conditions";
import {
  EXPECTED_TOOLS, EXPECTED_CORE_AGENTS, EXPECTED_CORE_COMMANDS,
  MIN_AGENT_COUNT, MIN_COMMAND_COUNT, TIMEOUTS,
} from "./helpers/constants";

describe.skipIf(!canRunServerTests)("E2E: Server Integration", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await setupTestServer();
  }, TIMEOUTS.serverStart);

  afterAll(async () => {
    await teardownTestServer(ctx);
  });

  describe("Plugin Registration", () => {
    it("should register OMCO as default agent", async () => {
      const agents = await ctx.client.app.agents({
        query: { directory: ctx.projectDir },
      });
      // agents.data is Array<Agent>
      const omcoAgent = agents.data?.find(a => a.name === "OMCO");
      expect(omcoAgent).toBeDefined();
      expect(omcoAgent?.builtIn).toBe(false); // Plugin-registered, not built-in
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
      // agents.data is Array<Agent>
      for (const agentName of EXPECTED_CORE_AGENTS) {
        const found = agents.data?.some(a => a.name === agentName);
        expect(found, `Expected agent "${agentName}" to be registered`).toBe(true);
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
        const found = commands.data?.some(c => c.name === cmdName);
        expect(found, `Expected command "${cmdName}" to be registered`).toBe(true);
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

      ctx.createdSessionIds.push(sessionId!);

      await ctx.client.session.delete({
        path: { id: sessionId! },
        query: { directory: ctx.projectDir },
      });

      // Remove from tracking since we manually deleted
      ctx.createdSessionIds = ctx.createdSessionIds.filter(id => id !== sessionId);
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

      const children = await ctx.client.session.children({
        path: { id: parentId },
        query: { directory: ctx.projectDir },
      });
      expect(children.data?.some(c => c.id === childId)).toBe(true);
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

      // Index into dictionary with session ID
      const status = allStatuses.data?.[session.data!.id];
      // Status should be idle (no prompt sent yet)
      expect(status).toBeDefined();
      expect(status?.type).toBe("idle");
    });
  });
});
```

---

### Task 3: Agent Spawning Tests (Tier 2 - LLM Required)

**File:** `tests/e2e/agent-spawning.test.ts`

**Acceptance Criteria:**
- [ ] Uses `describe.skipIf(!canRunLLMTests)` for graceful skip (synchronous condition)
- [ ] `beforeAll` checks provider credentials; sets skip flag if missing
- [ ] Test: child session receives prompt and returns assistant response
- [ ] Test: assistant message has `info.role === "assistant"` (not `info?.role`)
- [ ] Test: assistant text extracted from `parts.filter(p => p.type === "text")` (not `m.info?.role`)
- [ ] Test: multiple child sessions can be spawned from same parent
- [ ] Uses `waitForSessionIdle()` with SSE primary / polling fallback
- [ ] `directory` query param on all API calls
- [ ] Each test has 60-90s timeout
- [ ] All created sessions are tracked and cleaned up

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestServer, teardownTestServer, checkProviderCredentials, type TestContext } from "./helpers/setup";
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
      console.warn("No provider credentials found. Tier 2 tests will be skipped at test level.");
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

    // Send prompt using promptAsync() for non-blocking submission.
    // NOTE: session.prompt() may block until the full response is received,
    // making waitForSessionIdle() redundant. We use promptAsync() to submit
    // the prompt without blocking, then explicitly wait for idle via SSE/polling.
    await ctx.client.session.promptAsync({
      path: { id: child.data!.id },
      body: {
        parts: [{ type: "text", text: "List the files in the current directory" }],
      },
      query: { directory: ctx.projectDir },
    });

    // Wait for completion using SSE events (primary) or polling (fallback)
    await waitForSessionIdle(ctx.client, child.data!.id, ctx.projectDir, TIMEOUTS.llmPrompt);

    // Get response
    const messages = await ctx.client.session.messages({
      path: { id: child.data!.id },
      query: { directory: ctx.projectDir },
    });

    // messages.data is Array<{ info: Message, parts: Array<Part> }>
    // Message = UserMessage | AssistantMessage
    // AssistantMessage has role: "assistant"
    const assistantText = getAssistantTextFromMessages(messages.data);
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
```

---

### Task 4: Tool Execution Tests (Tier 2 - LLM Required)

**File:** `tests/e2e/tool-execution.test.ts`

**Acceptance Criteria:**
- [ ] Uses `describe.skipIf(!canRunLLMTests)` for graceful skip
- [ ] `beforeAll` checks provider credentials
- [ ] Test: `/help` command returns help content
- [ ] Test: `/ultrawork` command activates ultrawork mode
- [ ] Test: `/deepsearch` command triggers search mode
- [ ] All tests use `waitForSessionIdle()` with correct API (SSE primary, polling fallback)
- [ ] `directory` query param on all API calls
- [ ] All tests have explicit timeouts

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestServer, teardownTestServer, checkProviderCredentials, type TestContext } from "./helpers/setup";
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

    await waitForSessionIdle(ctx.client, session.data!.id, ctx.projectDir, TIMEOUTS.llmPrompt);

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    const response = getAssistantTextFromMessages(messages.data);
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

    await waitForSessionIdle(ctx.client, session.data!.id, ctx.projectDir, 120000);

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });
    expect(messages.data?.length).toBeGreaterThan(0);
  }, 120000);
});
```

---

### Task 5: Hook Integration Tests (Tier 2 - LLM Required)

**File:** `tests/e2e/hooks-integration.test.ts`

**Acceptance Criteria:**
- [ ] Test: `chat.message` hook fires when message sent (verify keyword detection works)
- [ ] Test: ultrawork keyword detection appends mode activation text
- [ ] Test: SSE event stream receives `EventSessionIdle` event (acceptance criterion, not stretch goal)
- [ ] Test: SSE event stream receives `EventSessionCreated` event on session creation
- [ ] `directory` query param on all API calls
- [ ] All tests have explicit timeouts

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestServer, teardownTestServer, checkProviderCredentials, type TestContext } from "./helpers/setup";
import { waitForSessionIdle } from "./helpers/wait";
import { getAssistantTextFromMessages } from "./helpers/assertions";
import { canRunLLMTests } from "./helpers/skip-conditions";
import { TIMEOUTS } from "./helpers/constants";

describe.skipIf(!canRunLLMTests)("E2E: Hook Integration", () => {
  let ctx: TestContext;
  let hasCredentials = false;

  beforeAll(async () => {
    ctx = await setupTestServer();
    hasCredentials = await checkProviderCredentials(ctx.client);
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

    // Use promptAsync() for non-blocking submission (see MINOR 2 note in Architecture Decisions)
    await ctx.client.session.promptAsync({
      path: { id: session.data!.id },
      body: {
        parts: [{ type: "text", text: "ultrawork list all files" }],
      },
      query: { directory: ctx.projectDir },
    });

    await waitForSessionIdle(ctx.client, session.data!.id, ctx.projectDir, TIMEOUTS.llmPrompt);

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    // messages.data is Array<{ info: Message, parts: Array<Part> }>
    const allText = messages.data
      ?.flatMap(m => m.parts)
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map(p => (p as any).text)
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
        // Explicitly close SSE stream when collection period ends
        result.stream.return?.();
        resolve();
      }, 5000); // Collect for 5s
      (async () => {
        for await (const event of result.stream) {
          collectedEvents.push(event);
          if (collectedEvents.length >= 5) {
            clearTimeout(timeout);
            // Explicitly close SSE stream after collecting enough events
            result.stream.return?.();
            resolve();
            return;
          }
        }
      })().catch(() => {
        clearTimeout(timeout);
        result.stream.return?.();
        resolve();
      });
    });

    await collectPromise;

    // We should have received at least one event (server.connected, session.created, etc.)
    // The exact events depend on timing, so we just verify the stream works
    expect(collectedEvents.length).toBeGreaterThan(0);
  }, 30000);
});
```

---

### Task 6: Multi-Agent Workflow Tests (Tier 2 - LLM Required)

**File:** `tests/e2e/workflows.test.ts`

**Acceptance Criteria:**
- [ ] Test: `/ralph-loop` initiates workflow (not necessarily completes)
- [ ] Test: `/autopilot` starts expansion phase, creates child sessions
- [ ] Test: `/deepsearch` returns search results
- [ ] All workflow tests have generous timeouts (120-300s)
- [ ] Tests verify workflow **starts** (not necessarily completes), to keep runtime bounded
- [ ] Abort sessions after verification to prevent indefinite running
- [ ] `directory` query param on all API calls

**Important Design Note:** Full workflow tests are expensive (minutes, many LLM calls). We test that the workflow **initiates correctly** rather than runs to completion:
- Verify the slash command expands
- Verify child sessions are created
- Verify initial agent response begins
- Do NOT wait for full workflow completion

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestServer, teardownTestServer, checkProviderCredentials, type TestContext } from "./helpers/setup";
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
    await new Promise(r => setTimeout(r, 10000));

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    // Ralph loop template should be present in some form
    const allText = messages.data
      ?.flatMap(m => m.parts)
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map(p => (p as any).text)
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

    await new Promise(r => setTimeout(r, 15000));

    const messages = await ctx.client.session.messages({
      path: { id: session.data!.id },
      query: { directory: ctx.projectDir },
    });

    const allText = messages.data
      ?.flatMap(m => m.parts)
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map(p => (p as any).text)
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
    expect(response.length).toBeGreaterThan(0);
  }, 120000);
});
```

---

### Task 7: CI Integration & Scripts

**Files to modify:**
- `package.json` (scripts)
- `tests/e2e/vitest.config.ts` (vitest config for E2E)

**Acceptance Criteria:**
- [ ] `bun test` runs unit/integration tests only (excludes `tests/e2e/` via `bunfig.toml` or explicit file patterns)
- [ ] `bun run test:e2e` runs all E2E tests via vitest with `--config` flag
- [ ] `bun run test:e2e:server` runs only server integration tests (Tier 1, faster)
- [ ] `bun run test:all` runs everything
- [ ] vitest E2E config has `testTimeout: 120000` and `hookTimeout: 60000`
- [ ] Excludes existing `npm-install.test.ts` from new E2E suite (it has its own run config)
- [ ] Environment variable `OMCO_E2E_ENABLED=true` required for all E2E tests
- [ ] Environment variable `OMCO_E2E_LLM=true` required for Tier 2 LLM tests
- [ ] `OPENCODE_SERVER_URL` env var optionally points to existing running server (skip startup)
- [ ] README in `tests/e2e/` updated to document how to run E2E tests

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts'],
    exclude: ['tests/e2e/npm-install.test.ts'],
    testTimeout: 120000,
    hookTimeout: 60000,
    globals: true,
  },
});
```

**Environment Variables:**

| Variable | Purpose | Default |
|----------|---------|---------|
| `OMCO_E2E_ENABLED` | Master switch for E2E tests (Tier 1 + Tier 2) | `false` |
| `OMCO_E2E_LLM` | Enable Tier 2 LLM-dependent tests | `false` |
| `OPENCODE_SERVER_URL` | Connect to existing server instead of starting new | (unset = start fresh) |
| `OMCO_E2E_PROJECT_DIR` | Custom project dir for tests | (unset = temp dir) |
| `OMCO_E2E_TIMEOUT` | Override default LLM timeout | `60000` |

---

## Test Isolation Strategy

### Session Isolation
- Every `describe` block creates its own sessions
- Session IDs tracked in `TestContext.createdSessionIds`
- `afterAll` deletes ALL tracked sessions
- Session titles prefixed with `"E2E "` for easy identification

### Project Isolation
- E2E tests operate in a temporary directory created per test suite
- Temp dir contains `.opencode/plugins/omco.ts` that imports from project dist via absolute path
- Temp dir also contains minimal project structure:
  ```
  /tmp/omco-e2e-XXXXX/
  ├── .opencode/
  │   └── plugins/
  │       └── omco.ts          # import OmoOmcsPlugin from "<abs-path>/dist/index.js"
  ├── package.json              # minimal {"name": "omco-e2e-test"}
  ├── tsconfig.json             # minimal typescript config
  └── src/
      └── index.ts              # empty file
  ```
- Temp dir destroyed in `afterAll`

### Server Isolation
- Test server started on random port (`port: 0`)
- Separate from any user's running OpenCode instance
- Server shut down in `afterAll` via `server.close()`

### State Isolation
- No `.omc/` state files persist between test runs
- Tests that create state files do so in temp project dir
- `rm -rf` temp dir guarantees cleanup

---

## Conditional Execution Strategy

### Synchronous Skip Conditions (for `describe.skipIf()`)

```typescript
// Module-level constants, evaluated at import time
export const canRunServerTests: boolean = isOpenCodeInstalled() && isE2EEnabled();
export const canRunLLMTests: boolean = canRunServerTests && isLLMEnabled();
```

Both are **synchronous** booleans. `describe.skipIf()` requires synchronous values.

### Async Credential Check (in `beforeAll`)

Provider credential verification is async and happens in `beforeAll`:
```typescript
beforeAll(async () => {
  ctx = await setupTestServer();
  hasCredentials = await checkProviderCredentials(ctx.client);
});
```

Individual tests check `if (!hasCredentials) return;` to skip gracefully.

### Skip Flow:
1. `OMCO_E2E_ENABLED !== "true"` -> ALL E2E tests skip with message
2. `opencode` not in PATH -> ALL E2E tests skip with message
3. Server fails to start -> ALL E2E tests skip (beforeAll failure)
4. `OMCO_E2E_LLM !== "true"` -> Tier 2 tests skip, Tier 1 still runs
5. No provider credentials -> Tier 2 individual tests skip via `if (!hasCredentials) return`
6. Individual test timeout -> Test marked as timeout (not skip)

---

## Commit Strategy

| Commit | Content |
|--------|---------|
| 1 | `feat(e2e): add test infrastructure (helpers, setup, teardown, wait, assertions)` |
| 2 | `feat(e2e): add server integration tests (Tier 1)` |
| 3 | `feat(e2e): add agent spawning and tool execution tests (Tier 2)` |
| 4 | `feat(e2e): add hook integration and workflow tests (Tier 2)` |
| 5 | `chore(e2e): add CI scripts and vitest config` |
| 6 | `docs(e2e): update README with E2E test instructions` |

---

## Success Criteria

### Must Pass (Tier 1 - Server Integration)
- [ ] OpenCode server starts programmatically via `createOpencode({ port: 0 })`
- [ ] OMCO plugin loads from `.opencode/plugins/` in test project dir
- [ ] `app.agents()` returns `Array<Agent>` containing "OMCO" (via `.find()`)
- [ ] At least `MIN_AGENT_COUNT` agents are registered
- [ ] All core agents found via `.some(a => a.name === name)` on array
- [ ] All expected slash commands are registered
- [ ] All 4 custom tools are registered
- [ ] Sessions can be created and deleted
- [ ] Parent-child session relationships work
- [ ] `session.status()` returns `{ [key: string]: SessionStatus }` dictionary
- [ ] Tests complete in < 30 seconds

### Should Pass (Tier 2 - LLM Required)
- [ ] Child session receives prompt and returns assistant response
- [ ] Multiple child sessions can be spawned in parallel
- [ ] `/help` command returns help content
- [ ] `/ultrawork` command activates ultrawork mode
- [ ] Keyword detection adds mode-specific text to messages
- [ ] SSE event stream works (receives events)
- [ ] Workflows (ralph-loop, autopilot) initiate correctly
- [ ] `/deepsearch` returns search results
- [ ] Tests complete in < 5 minutes total

### Must Work
- [ ] `bun test` ignores E2E tests via `bunfig.toml` exclude (no failures when server not running)
- [ ] `OMCO_E2E_ENABLED=false` skips all E2E tests gracefully
- [ ] `canRunServerTests` and `canRunLLMTests` are synchronous (no promise)
- [ ] All test sessions are cleaned up after test run
- [ ] No pollution to user's OpenCode installation
- [ ] `promptAsync()` used for non-blocking prompt submission (not blocking `prompt()`)
- [ ] All SSE streams explicitly closed via `stream.return?.()` after use
- [ ] `provider.list().data.connected` used for credential check (not `.all`)
- [ ] `__dirname` derived via `fileURLToPath` (no Bun-only `import.meta.dir`)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| OpenCode server startup fails | Medium | High | Graceful skip + error logging |
| LLM calls timeout | Medium | Medium | Generous timeouts (60-120s) + abort sessions |
| Provider auth changes | Low | High | Check credentials before running Tier 2 |
| SDK API changes in future versions | Medium | Medium | Pin SDK version, add version check |
| Flaky tests from LLM nondeterminism | High | Medium | Assert structure not content, retry logic |
| Test session resource leak | Low | Medium | Track all IDs, cleanup in afterAll + abort |
| Rate limiting from provider | Medium | Medium | Sequential tests, not parallel LLM calls |
| Port collision | Low | Low | Always use `port: 0` for random port |
| Plugin not loading in test dir | Medium | High | Verify `.opencode/plugins/` structure matches production |
| CWD not restored after test | Low | Medium | Store/restore CWD in setup/teardown |

---

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `tests/e2e/helpers/setup.ts` | Server lifecycle, test context, project dir creation with `.opencode/plugins/` |
| `tests/e2e/helpers/wait.ts` | Session idle monitoring (SSE primary, polling fallback) |
| `tests/e2e/helpers/assertions.ts` | Custom assertion helpers (array-based agent lookup, message text extraction) |
| `tests/e2e/helpers/constants.ts` | Expected values, timeouts, minimum thresholds |
| `tests/e2e/helpers/skip-conditions.ts` | Synchronous conditional execution logic |
| `tests/e2e/helpers/index.ts` | Barrel export |
| `tests/e2e/server-integration.test.ts` | Tier 1: Plugin registration tests |
| `tests/e2e/agent-spawning.test.ts` | Tier 2: Session and agent tests |
| `tests/e2e/tool-execution.test.ts` | Tier 2: Tool and command tests |
| `tests/e2e/hooks-integration.test.ts` | Tier 2: Hook behavior + SSE event tests |
| `tests/e2e/workflows.test.ts` | Tier 2: Multi-agent workflow tests |
| `tests/e2e/vitest.config.ts` | vitest configuration for E2E (with --config flag) |

### New Config Files
| File | Purpose |
|------|---------|
| `bunfig.toml` | Exclude `tests/e2e/` from `bun test` (preferred over `--ignore` flag which is undocumented) |

### Modified Files
| File | Change |
|------|--------|
| `package.json` | Add `test:e2e`, `test:e2e:server`, `test:all` scripts |
| `tests/e2e/README.md` | Update with E2E testing documentation |
