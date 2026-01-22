<!-- Parent: ../AGENTS.md -->

# Tools: Background Task & Agent Invocation

This module provides background task execution and specialized agent invocation capabilities for omo-omcs. It enables asynchronous agent spawning, concurrency management, and result retrieval.

## Porting Context

oh-my-claudecode의 도구 시스템을 OpenCode 도구 API로 변환. call_omo_agent, background_task 등 핵심 도구들이 포팅되었다. oh-my-claudecode의 Task 도구가 OpenCode의 도구 실행 프레임워크로 변환되었으며, 백그라운드 에이전트 실행 패턴은 동일하게 유지되었다.

## Overview

The tools module exposes three core capabilities:

1. **Background Task Management** - Execute agents without blocking the current session
2. **Agent Invocation** - Spawn explore and librarian agents with async/sync modes
3. **Tool Definitions** - Standard ToolDefinition exports for integration with the plugin framework

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Plugin Context                              │
│                   (ctx: PluginInput)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
    ┌─────▼──────────┐              ┌──────────▼──────────┐
    │ BackgroundTools │              │ CallOmoAgent Tool   │
    ├─────────────────┤              ├─────────────────────┤
    │ • background_task             │ • spawn agent       │
    │ • background_output           │ • run_in_background │
    │ • background_cancel           │ • subagent_type     │
    └─────────┬───────┘              └────────┬────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ BackgroundManager  │
                    ├────────────────────┤
                    │ • createTask()     │
                    │ • getTask()        │
                    │ • cancelTask()     │
                    │ • waitForTask()    │
                    │ • concurrency      │
                    │   management       │
                    └────────────────────┘
```

## Core Components

### BackgroundManager

**File:** `background-manager.ts`

Manages background task lifecycle, concurrency limits, and state tracking.

#### Interface: `BackgroundManager`

```typescript
interface BackgroundManager {
  createTask(
    parentSessionID: string,
    description: string,
    prompt: string,
    agent: string
  ): Promise<BackgroundTask>;

  getTask(taskId: string): BackgroundTask | undefined;
  getTasksByParentSession(sessionID: string): BackgroundTask[];

  cancelTask(taskId: string): boolean;
  cancelAllTasks(parentSessionID?: string): number;

  waitForTask(taskId: string, timeoutMs?: number): Promise<BackgroundTask>;
}
```

#### Interface: `BackgroundTask`

```typescript
interface BackgroundTask {
  id: string;                          // Unique task identifier (format: bg_<timestamp>_<counter>)
  status: "running" | "completed" | "failed" | "cancelled";
  description: string;                 // Human-readable task description
  parentSessionID: string;             // Parent session that created this task
  sessionID?: string;                  // Child session created for the task
  result?: string;                     // Task output (for completed tasks)
  error?: string;                      // Error message (for failed tasks)
  startedAt: number;                   // Unix timestamp when task started
  completedAt?: number;                // Unix timestamp when task finished
}
```

#### Methods

##### `createTask(parentSessionID, description, prompt, agent): Promise<BackgroundTask>`

Spawns a new background task. Creates a child session and executes the prompt with the specified agent.

**Concurrency:** Enforces a limit (default: 5) on concurrent tasks. Throws if limit exceeded.

**Behavior:**
- Returns immediately with `status: "running"`
- Runs agent execution asynchronously in the background
- Updates task status to "completed" or "failed" when done
- Shows toast notification on completion/failure

**Example:**
```typescript
const task = await manager.createTask(
  "session_123",
  "Search for documentation",
  "Find all API docs in the codebase",
  "explore"
);
console.log(task.id); // bg_abc123_1
```

##### `getTask(taskId): BackgroundTask | undefined`

Retrieves task state by ID. Returns undefined if not found.

**Example:**
```typescript
const task = manager.getTask("bg_abc123_1");
if (task?.status === "completed") {
  console.log(task.result);
}
```

##### `getTasksByParentSession(sessionID): BackgroundTask[]`

Returns all tasks (regardless of status) created within a parent session.

**Example:**
```typescript
const allTasks = manager.getTasksByParentSession("session_123");
console.log(`Created ${allTasks.length} tasks`);
```

##### `cancelTask(taskId): boolean`

Cancels a running task. Returns true if successful, false if task not running or not found.

**Example:**
```typescript
const wasRunning = manager.cancelTask("bg_abc123_1");
if (wasRunning) {
  console.log("Task cancelled");
}
```

##### `cancelAllTasks(parentSessionID?): number`

Cancels all running tasks globally or scoped to a parent session. Returns count of cancelled tasks.

**Example:**
```typescript
// Cancel all tasks
const count = manager.cancelAllTasks();

// Cancel all tasks in a session
const count = manager.cancelAllTasks("session_123");
```

##### `waitForTask(taskId, timeoutMs?): Promise<BackgroundTask>`

Blocks until a task completes or times out. Default timeout: 120 seconds.

**Throws:**
- `Error` if task not found
- `Error` if timeout exceeded

**Example:**
```typescript
try {
  const completed = await manager.waitForTask("bg_abc123_1", 60000);
  console.log(completed.result);
} catch (e) {
  console.error("Task failed or timed out:", e.message);
}
```

#### Configuration

**From `src/config/index.ts`:**

```typescript
interface BackgroundTaskConfig {
  defaultConcurrency?: number;                        // 1-20, default: 5
  providerConcurrency?: Record<string, number>;       // Per-provider limits
  modelConcurrency?: Record<string, number>;          // Per-model limits
}
```

**Example config (`.opencode/omo-omcs.json`):**
```json
{
  "background_task": {
    "defaultConcurrency": 10,
    "providerConcurrency": {
      "openai": 5,
      "google": 8
    },
    "modelConcurrency": {
      "gpt-5.2": 3,
      "gemini-3-flash": 5
    }
  }
}
```

### Background Tools

**File:** `background-tools.ts`

Tool definitions that expose background task management to the plugin framework.

#### Tool: `background_task`

Launches a background task and returns immediately with a task ID.

**Description:** Run agent task in background. Returns task_id immediately; notifies on completion. Prompts MUST be in English.

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `description` | string | Yes | Short task description |
| `prompt` | string | Yes | Task prompt for the agent |
| `agent` | string | Yes | Agent to use (explore, librarian) |

**Returns:**
```json
{
  "task_id": "bg_abc123_1",
  "status": "running",
  "description": "Search for documentation",
  "message": "Background task launched. Use background_output with task_id=\"bg_abc123_1\" to get results."
}
```

**Example:**
```typescript
// Using the tool
const result = await background_task({
  description: "Search codebase",
  prompt: "Find all files related to authentication",
  agent: "explore"
});
// Result: { task_id: "bg_abc123_1", status: "running", ... }
```

#### Tool: `background_output`

Retrieves results from a completed background task.

**Description:** Get output from background task. System notifies on completion, so block=true rarely needed.

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | Yes | Task ID to get output for |
| `block` | boolean | No | Wait for completion (default: false) |
| `timeout` | number | No | Timeout in ms if blocking |

**Returns:**
```json
{
  "task_id": "bg_abc123_1",
  "status": "completed",
  "description": "Search for documentation",
  "result": "Found 15 files...",
  "duration_ms": 12345
}
```

**Status Values:**
- `running` - Task still executing
- `completed` - Task finished successfully
- `failed` - Task encountered an error
- `cancelled` - Task was cancelled

**Example:**
```typescript
// Non-blocking check
const output = await background_output({
  task_id: "bg_abc123_1"
});

// Blocking wait
const output = await background_output({
  task_id: "bg_abc123_1",
  block: true,
  timeout: 60000
});
if (output.status === "completed") {
  console.log(output.result);
}
```

#### Tool: `background_cancel`

Cancels running background tasks.

**Description:** Cancel running background task(s). Use all=true to cancel ALL before final answer.

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_id` | string | No | Specific task to cancel |
| `all` | boolean | No | Cancel all running tasks |

**Returns:**
```json
{
  "cancelled": 1,
  "message": "Cancelled 1 background tasks"
}
```

**Example:**
```typescript
// Cancel single task
const result = await background_cancel({
  task_id: "bg_abc123_1"
});

// Cancel all tasks
const result = await background_cancel({
  all: true
});
```

### Call OMO Agent

**File:** `call-omo-agent.ts`

Tool for spawning specialized agents (explore, librarian) with async/sync execution modes.

#### Tool: `call_omo_agent`

Spawn explore/librarian agent for specialized tasks.

**Description:** Spawn explore/librarian agent. run_in_background REQUIRED (true=async with task_id, false=sync). Available agents: explore (specialized for exploration tasks), librarian (specialized for library/research tasks). Prompts MUST be in English.

**Arguments:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `description` | string | Yes | Short description of task |
| `prompt` | string | Yes | Task prompt |
| `subagent_type` | enum | Yes | "explore" \| "librarian" |
| `run_in_background` | boolean | Yes | Run async (true) or sync (false) |
| `session_id` | string | No | Existing session to continue |

**Async Mode (run_in_background=true):**

Returns immediately with task_id for later retrieval.

```json
{
  "task_id": "bg_abc123_1",
  "session_id": "session_456",
  "status": "running",
  "message": "Background agent task launched. Use background_output with task_id=\"bg_abc123_1\" to get results."
}
```

**Sync Mode (run_in_background=false):**

Blocks until agent completes and returns result directly.

```json
{
  "session_id": "session_456",
  "status": "completed",
  "result": "Found 15 files..."
}
```

**Example - Async:**
```typescript
// Start explore task
const result = await call_omo_agent({
  description: "Find auth files",
  prompt: "Search for all authentication-related files",
  subagent_type: "explore",
  run_in_background: true
});
// { task_id: "bg_abc123_1", status: "running", ... }

// Later retrieve results
const output = await background_output({
  task_id: result.task_id
});
```

**Example - Sync:**
```typescript
// Run librarian task synchronously
const result = await call_omo_agent({
  description: "Research patterns",
  prompt: "Document common patterns in this codebase",
  subagent_type: "librarian",
  run_in_background: false
});
// { status: "completed", result: "...", session_id: "..." }
```

## Built-in Tools

**File:** `builtin.ts`

Exports: `builtinTools` (currently empty object, reserved for future expansion).

## Module Exports

**File:** `index.ts`

```typescript
export { createBackgroundManager, type BackgroundManager, type BackgroundTask } from "./background-manager";
export { createBackgroundTools } from "./background-tools";
export { createCallOmoAgent } from "./call-omo-agent";
export { builtinTools } from "./builtin";
```

## Usage Patterns

### Pattern 1: Fire-and-Forget Background Task

```typescript
const backgroundTools = createBackgroundTools(manager, client);

// Launch task
const launchResp = await backgroundTools.background_task.execute({
  description: "Index codebase",
  prompt: "Create a comprehensive index of all modules",
  agent: "librarian"
}, { sessionID: "session_123" });

const { task_id } = JSON.parse(launchResp);
console.log(`Task launched: ${task_id}`);

// Task runs in background, user notified on completion
```

### Pattern 2: Wait for Task Completion

```typescript
// Launch task
const launchResp = await backgroundTools.background_task.execute({...}, context);
const { task_id } = JSON.parse(launchResp);

// Wait for completion with timeout
const output = await backgroundTools.background_output.execute({
  task_id,
  block: true,
  timeout: 60000
}, context);

if (output.status === "completed") {
  console.log("Result:", output.result);
} else {
  console.error("Error:", output.error);
}
```

### Pattern 3: Parallel Task Execution

```typescript
// Launch multiple tasks
const task1 = await manager.createTask(...);
const task2 = await manager.createTask(...);
const task3 = await manager.createTask(...);

// Wait for all (respects concurrency limits)
const results = await Promise.all([
  manager.waitForTask(task1.id),
  manager.waitForTask(task2.id),
  manager.waitForTask(task3.id)
]);

results.forEach(r => console.log(r.result));
```

### Pattern 4: Task Cancellation

```typescript
// Get all tasks for current session
const tasks = manager.getTasksByParentSession("session_123");

// Cancel specific task
manager.cancelTask(tasks[0].id);

// Or cancel all in session
manager.cancelAllTasks("session_123");
```

## Error Handling

### Concurrency Limit Exceeded

```typescript
try {
  const task = await manager.createTask(...);
} catch (err) {
  if (err.message.includes("Max concurrent tasks")) {
    console.log("Too many tasks running. Wait for some to complete.");
  }
}
```

### Task Timeout

```typescript
try {
  const task = await manager.waitForTask(taskId, 30000);
} catch (err) {
  if (err.message.includes("timed out")) {
    console.log("Task took too long. Cancelling...");
    manager.cancelTask(taskId);
  }
}
```

### Invalid Task ID

```typescript
const task = manager.getTask("invalid_id");
if (!task) {
  console.log("Task not found");
}
```

## Integration with Plugin Framework

The tools module integrates with `@opencode-ai/plugin`:

```typescript
import { createBackgroundManager, createBackgroundTools, createCallOmoAgent } from "./tools";

export function setupTools(ctx: PluginInput, config: BackgroundTaskConfig) {
  const manager = createBackgroundManager(ctx, config);

  const tools: Record<string, ToolDefinition> = {
    ...createBackgroundTools(manager, ctx.client),
    call_omo_agent: createCallOmoAgent(ctx, manager)
  };

  return { tools, manager };
}
```

## Configuration & Customization

### Concurrency Settings

Control how many tasks run simultaneously:

```json
{
  "background_task": {
    "defaultConcurrency": 5
  }
}
```

### Agent Configuration

Configure agent behavior:

```json
{
  "agents": {
    "explore": {
      "model": "google/gemini-3-flash",
      "temperature": 0.5
    },
    "librarian": {
      "model": "google/gemini-3-flash",
      "temperature": 0.3
    }
  }
}
```

## Performance Considerations

### Task ID Generation

Task IDs use timestamp + counter for uniqueness and sort-ability:
- Format: `bg_<timestamp:base36>_<counter:base36>`
- Example: `bg_abc123_1`

### Timeout Defaults

- Default timeout: 120 seconds (120,000 ms)
- Recommended for long-running tasks: 300+ seconds
- Must be positive number

### Concurrency Limits

- Minimum: 1 task
- Maximum: 20 tasks
- Default: 5 tasks

## Testing

### Unit Testing Background Manager

```typescript
const manager = createBackgroundManager(mockCtx, { defaultConcurrency: 2 });

// Test concurrency enforcement
const task1 = await manager.createTask("session_1", "Task 1", "prompt", "explore");
const task2 = await manager.createTask("session_1", "Task 2", "prompt", "explore");

// This should fail due to concurrency limit
expect(() => manager.createTask("session_1", "Task 3", "prompt", "explore"))
  .toThrow(/Max concurrent tasks/);
```

### Unit Testing Tools

```typescript
const tools = createBackgroundTools(manager, mockClient);

const result = await tools.background_task.execute({
  description: "Test",
  prompt: "test prompt",
  agent: "explore"
}, { sessionID: "test_session" });

expect(JSON.parse(result)).toHaveProperty("task_id");
```

## Related Documentation

- **Parent:** `../AGENTS.md` - Top-level agent architecture
- **Config:** `../config/index.ts` - Configuration schema
- **Logger:** `../shared/logger.ts` - Logging utilities
- **Plugin SDK:** `@opencode-ai/plugin` - Tool framework

## FAQ

**Q: Can I run the same agent multiple times in parallel?**
A: Yes, up to the concurrency limit. Each task gets its own session.

**Q: What happens if a task fails?**
A: Status becomes "failed" with error message in the task object. Session is still created and can be queried.

**Q: Can I resume a cancelled task?**
A: No, but you can create a new task with the same prompt.

**Q: How do I increase concurrency limits?**
A: Configure `background_task.defaultConcurrency` in `.opencode/omo-omcs.json`.

**Q: What's the maximum timeout?**
A: JavaScript `number` type, practically unlimited (milliseconds).
