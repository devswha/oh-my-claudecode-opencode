# Implementation Plan: Agent UI Notifications

> **Generated**: 2026-01-26
> **Status**: READY FOR IMPLEMENTATION

## Executive Summary

Add TUI toast notifications when OMCO subagents are called (both sync and async). Currently, `tui-status.ts` has infrastructure but only detects the generic `Task` tool - OMCO uses `call_omco_agent` and `background-manager` which bypass these hooks entirely.

## Problem Analysis

### Current State
1. **`src/hooks/tui-status.ts`** (lines 316-377) - Detects `Task`/`task` tool only
2. **`src/tools/call-omco-agent.ts`** - NO TUI notifications for sync calls
3. **`src/tools/background-manager.ts`** (line 226-233) - Has completion toast, NO start notification

### Root Cause
The `tui-status` hook intercepts `tool.execute.before`/`after` for `Task` tool, but OMCO's actual agent calling mechanisms (`call_omco_agent`, `background-manager`) don't trigger this hook because:
- They're custom tools, not the generic `Task` tool
- They call `ctx.client.session.create/prompt` directly

## Solution Architecture

### Approach: Direct Service Integration
Instead of relying on hook-based detection (which requires all agent tools to emit standardized events), we inject the TUI service directly into the tools that spawn agents.

```
┌─────────────────────────────────────────────────────────────┐
│                       src/index.ts                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          createTuiStatusService(ctx)                 │  │
│  │     Returns: { notifyAgentStarted, notifyAgentCompleted, ... }  │
│  └──────────────────────────────────────────────────────┘  │
│            │                                    │           │
│            ▼                                    ▼           │
│  ┌─────────────────────┐            ┌──────────────────────┐│
│  │ call-omco-agent.ts  │            │ background-manager.ts││
│  │ (sync agent calls)  │            │ (async agent calls)  ││
│  │ notifyAgentStarted()│            │ notifyAgentStarted() ││
│  │ notifyAgentCompleted│            │ notifyAgentCompleted ││
│  └─────────────────────┘            └──────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] **AC1**: When `call_omco_agent` is called synchronously, a "🤖 Agent Started" toast appears with agent name and task summary
- [ ] **AC2**: When `call_omco_agent` completes (success/failure), a completion toast appears with duration
- [ ] **AC3**: When background task starts, a "🤖 Agent Started" toast appears immediately
- [ ] **AC4**: When background task completes, a completion toast appears (already partial - needs start notification)
- [ ] **AC5**: Metrics are tracked for all agent calls (already in tui-status.ts)
- [ ] **AC6**: Notifications can be disabled via config (`tui_status.showAgentNotifications: false`)
- [ ] **AC7**: All existing tests continue to pass
- [ ] **AC8**: No type errors (bun run typecheck passes)

---

## Implementation Tasks

### Phase 1: Extract TUI Status Service Interface

**Task 1.1: Create TuiStatusService interface** 
- **File**: `src/hooks/tui-status.ts`
- **Lines**: ~60-70 (after the interface definitions)
- **Action**: Export a service interface separate from hook creation

```typescript
// Add at line 60 (after SessionMetrics interface)
export interface TuiStatusService {
  showToast: (opts: ToastOptions) => Promise<void>;
  notifyAgentStarted: (agentName: string, task?: string, callID?: string) => Promise<void>;
  notifyAgentCompleted: (agentName: string, success?: boolean, callID?: string) => Promise<void>;
  notifyModeChange: (mode: string, active: boolean) => Promise<void>;
  notifyPhaseChange: (phase: string, current: number, total: number) => Promise<void>;
  notifyIteration: (mode: string, current: number, max: number) => Promise<void>;
  getActiveAgents: () => AgentStatus[];
  getMetrics: () => { session: Omit<SessionMetrics, "agentMetrics">; agents: Record<string, AgentMetrics> };
  getMetricsSummary: () => string;
  resetMetrics: () => void;
}
```

**Task 1.2: Modify createTuiStatusHook to return service**
- **File**: `src/hooks/tui-status.ts`
- **Lines**: 301-315
- **Action**: Add explicit service property alongside hook handlers

```typescript
// Change return at line 301:
return {
  // Service API (for direct tool integration)
  service: {
    showToast,
    notifyAgentStarted,
    notifyAgentCompleted,
    notifyModeChange,
    notifyPhaseChange,
    notifyIteration,
    getActiveAgents,
    getMetrics,
    getMetricsSummary,
    resetMetrics,
  } as TuiStatusService,
  
  // Legacy direct access (for index.ts compatibility)
  showToast,
  notifyAgentStarted,
  // ... existing exports ...
  
  // Hook handlers
  "tool.execute.before": async (...) => { ... },
  "tool.execute.after": async (...) => { ... },
};
```

---

### Phase 2: Integrate TUI Service into call-omco-agent.ts

**Task 2.1: Add TuiStatusService parameter**
- **File**: `src/tools/call-omco-agent.ts`
- **Lines**: 7-11 (function signature)
- **Action**: Add optional tuiService parameter

```typescript
// Change line 7-11:
export function createCallOmcoAgent(
  ctx: PluginInput,
  manager: BackgroundManager,
  modelService?: ModelResolutionService,
  tuiService?: TuiStatusService  // ADD THIS
): ToolDefinition {
```

**Task 2.2: Notify on sync agent start**
- **File**: `src/tools/call-omco-agent.ts`
- **Lines**: 82-93 (start of sync execution)
- **Action**: Add notification before session.create

```typescript
// Add after line 82 (before try block):
// Notify TUI that agent is starting
const callID = `sync_${Date.now()}_${subagent_type}`;
if (tuiService) {
  const taskSummary = description?.substring(0, 50) || prompt.split('\n')[0]?.substring(0, 50);
  await tuiService.notifyAgentStarted(subagent_type, taskSummary, callID);
}

try {
  // ... existing code ...
```

**Task 2.3: Notify on sync agent completion**
- **File**: `src/tools/call-omco-agent.ts`
- **Lines**: 146-156 (return statements)
- **Action**: Add notification before return

```typescript
// Before line 146 (success return):
if (tuiService) {
  await tuiService.notifyAgentCompleted(subagent_type, true, callID);
}

return JSON.stringify({
  session_id: sessionID,
  status: "completed",
  result,
});

// Before line 151 (catch block return):
} catch (err) {
  if (tuiService) {
    await tuiService.notifyAgentCompleted(subagent_type, false, callID);
  }
  return JSON.stringify({
    status: "failed",
    error: String(err),
  });
}
```

**Task 2.4: Notify on errors (auth errors, etc.)**
- **File**: `src/tools/call-omco-agent.ts`
- **Lines**: 114-139 (error handling)
- **Action**: Add notifications for HTTP and provider errors

```typescript
// After line 119 (HTTP error check):
if (promptResp.error) {
  if (tuiService) {
    await tuiService.notifyAgentCompleted(subagent_type, false, callID);
  }
  return JSON.stringify({
    session_id: sessionID,
    status: "failed",
    error: `Prompt failed: ${JSON.stringify(promptResp.error)}`,
  });
}

// After line 134 (provider auth error check):
if (promptData?.info?.error) {
  if (tuiService) {
    await tuiService.notifyAgentCompleted(subagent_type, false, callID);
  }
  const err = promptData.info.error;
  const errMsg = err.data?.message || err.name || "Unknown error";
  return JSON.stringify({
    session_id: sessionID,
    status: "failed",
    error: `[${err.name}] ${errMsg}`,
  });
}
```

---

### Phase 3: Integrate TUI Service into background-manager.ts

**Task 3.1: Add TuiStatusService parameter**
- **File**: `src/tools/background-manager.ts`
- **Lines**: 47-51 (function signature)
- **Action**: Add optional tuiService parameter

```typescript
// Change line 47-51:
export function createBackgroundManager(
  ctx: PluginInput,
  config?: BackgroundTaskConfig,
  modelService?: ModelResolutionService,
  tuiService?: TuiStatusService  // ADD THIS
): BackgroundManager {
```

**Task 3.2: Add import for TuiStatusService**
- **File**: `src/tools/background-manager.ts`
- **Lines**: 1-5 (imports)
- **Action**: Add import

```typescript
// Add at line 5:
import type { TuiStatusService } from "../hooks/tui-status";
```

**Task 3.3: Notify on background task start**
- **File**: `src/tools/background-manager.ts`
- **Lines**: 137-139 (after task creation, before async IIFE)
- **Action**: Add notification immediately after task is registered

```typescript
// After line 137 (tasks.set):
tasks.set(taskId, task);

log(`Background task created`, { taskId, description, agent });

// Notify TUI that background agent is starting
if (tuiService) {
  const taskSummary = description?.substring(0, 50) || prompt.split('\n')[0]?.substring(0, 50);
  tuiService.notifyAgentStarted(agent, taskSummary, taskId).catch(() => {});
}

// Resolve model: ...
```

**Task 3.4: Notify on background task completion with better integration**
- **File**: `src/tools/background-manager.ts`
- **Lines**: 220-233 (completion handling)
- **Action**: Replace raw toast with tuiService call

```typescript
// Replace lines 220-233:
task.status = "completed";
task.completedAt = Date.now();

log(`Background task completed`, { taskId, duration: task.completedAt - task.startedAt });

// Notify TUI that agent completed
if (tuiService) {
  await tuiService.notifyAgentCompleted(agent, true, taskId);
} else {
  // Fallback to direct toast (backwards compatibility)
  ctx.client.tui.showToast({
    body: {
      title: "Background Task Completed",
      message: `${description.substring(0, 40)}...`,
      variant: "success" as const,
      duration: 3000,
    },
  }).catch(() => {});
}
```

**Task 3.5: Notify on background task failure**
- **File**: `src/tools/background-manager.ts`
- **Lines**: 235-241 (catch block)
- **Action**: Add notification on failure

```typescript
// Replace lines 235-241:
} catch (err) {
  task.status = "failed";
  task.error = String(err);
  task.completedAt = Date.now();

  log(`Background task failed`, { taskId, error: task.error });

  // Notify TUI that agent failed
  if (tuiService) {
    await tuiService.notifyAgentCompleted(agent, false, taskId);
  }
}
```

---

### Phase 4: Wire Up in src/index.ts

**Task 4.1: Pass tuiService to createBackgroundManager**
- **File**: `src/index.ts`
- **Lines**: 36-38 (backgroundManager creation)
- **Action**: Pass tuiStatus.service to manager

```typescript
// This requires reordering - tuiStatus must be created BEFORE backgroundManager
// Move tuiStatus creation to line 36 (before backgroundManager)

// Create TUI status service first (needed by tools)
const tuiStatus = createTuiStatusHook(ctx, {
  enabled: pluginConfig.tui_status?.enabled ?? true,
  showAgentNotifications: pluginConfig.tui_status?.showAgentNotifications ?? true,
  showModeChanges: pluginConfig.tui_status?.showModeChanges ?? true,
  toastDuration: pluginConfig.tui_status?.toastDuration ?? 3000,
  trackMetrics: pluginConfig.tui_status?.trackMetrics ?? true,
});

const backgroundManager = createBackgroundManager(
  ctx, 
  pluginConfig.background_task, 
  modelService,
  tuiStatus.service  // ADD THIS
);
```

**Task 4.2: Pass tuiService to createCallOmcoAgent**
- **File**: `src/index.ts`
- **Lines**: 38 (callOmcoAgent creation)
- **Action**: Pass tuiStatus.service

```typescript
const callOmcoAgent = createCallOmcoAgent(
  ctx, 
  backgroundManager, 
  modelService,
  tuiStatus.service  // ADD THIS
);
```

**Task 4.3: Remove old tuiStatus creation**
- **File**: `src/index.ts`
- **Lines**: 93-100 (current tuiStatus location)
- **Action**: Remove duplicate (already moved up)

---

### Phase 5: Add Type Exports

**Task 5.1: Export TuiStatusService from hooks module**
- **File**: `src/hooks/tui-status.ts`
- **Lines**: 1-3 (after imports)
- **Action**: Ensure interface is exported

```typescript
// Already using 'export interface' - verify it's exported
export interface TuiStatusService { ... }
```

**Task 5.2: Add import in call-omco-agent.ts**
- **File**: `src/tools/call-omco-agent.ts`
- **Lines**: 1-6 (imports section)
- **Action**: Add import

```typescript
import type { TuiStatusService } from "../hooks/tui-status";
```

---

### Phase 6: Testing & Verification

**Task 6.1: Run type checking**
```bash
bun run typecheck
```
- Expected: No errors

**Task 6.2: Run existing tests**
```bash
bun test
```
- Expected: All 40+ tests pass

**Task 6.3: Manual verification**
1. Start opencode with OMCO plugin
2. Call a subagent: `call_omco_agent` with `run_in_background: false`
3. Verify toast appears: "🔎 Agent Started" (or appropriate emoji)
4. Verify completion toast appears with duration
5. Repeat with `run_in_background: true`
6. Verify start toast appears immediately
7. Verify completion toast appears when done

**Task 6.4: Test configuration toggle**
1. Set `tui_status.showAgentNotifications: false` in config
2. Verify no toasts appear for agent calls

---

## Code Snippets (Complete)

### src/hooks/tui-status.ts - Service Interface

```typescript
// Add after line 59 (after SessionMetrics)
export interface TuiStatusService {
  showToast: (opts: ToastOptions) => Promise<void>;
  notifyAgentStarted: (agentName: string, task?: string, callID?: string) => Promise<void>;
  notifyAgentCompleted: (agentName: string, success?: boolean, callID?: string) => Promise<void>;
  notifyModeChange: (mode: string, active: boolean) => Promise<void>;
  notifyPhaseChange: (phase: string, current: number, total: number) => Promise<void>;
  notifyIteration: (mode: string, current: number, max: number) => Promise<void>;
  getActiveAgents: () => AgentStatus[];
  getMetrics: () => { session: Omit<SessionMetrics, "agentMetrics">; agents: Record<string, AgentMetrics> };
  getMetricsSummary: () => string;
  resetMetrics: () => void;
}
```

### src/hooks/tui-status.ts - Return Statement

```typescript
// Replace lines 301-378:
  // Build service object
  const service: TuiStatusService = {
    showToast,
    notifyAgentStarted,
    notifyAgentCompleted,
    notifyModeChange,
    notifyPhaseChange,
    notifyIteration,
    getActiveAgents,
    getMetrics,
    getMetricsSummary,
    resetMetrics,
  };

  return {
    // Service API (for direct tool integration)
    service,

    // Legacy direct access (backward compatibility)
    showToast,
    notifyAgentStarted,
    notifyAgentCompleted,
    notifyModeChange,
    notifyPhaseChange,
    notifyIteration,
    getActiveAgents,
    getMetrics,
    getMetricsSummary,
    resetMetrics,

    // Hook handlers
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> }
    ): Promise<void> => {
      // ... existing implementation unchanged ...
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { title: string; output: string; metadata: any }
    ): Promise<void> => {
      // ... existing implementation unchanged ...
    },
  };
```

### src/tools/call-omco-agent.ts - Complete Changes

```typescript
import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager, ModelConfig } from "./background-manager";
import type { ModelResolutionService } from "./model-resolution-service";
import type { TuiStatusService } from "../hooks/tui-status";
import { getAgent, listAgentNames, getCanonicalName, isAlias } from "../agents";
import { log } from "../shared/logger";

export function createCallOmcoAgent(
  ctx: PluginInput,
  manager: BackgroundManager,
  modelService?: ModelResolutionService,
  tuiService?: TuiStatusService
): ToolDefinition {
  // ... (lines 12-80 unchanged) ...

      if (run_in_background) {
        // Background already handles notifications via manager
        const task = await manager.createTask(
          context.sessionID,
          description,
          enhancedPrompt,
          subagent_type,
          resolvedModel
        );

        return JSON.stringify({
          task_id: task.id,
          session_id: task.sessionID,
          status: "running",
          message: `Background agent task launched. Use background_output with task_id="${task.id}" to get results.`,
        });
      }

      // Sync execution - notify start
      const callID = `sync_${Date.now()}_${subagent_type}`;
      if (tuiService) {
        const taskSummary = description?.substring(0, 50) || prompt.split('\n')[0]?.substring(0, 50);
        await tuiService.notifyAgentStarted(subagent_type, taskSummary, callID);
      }

      try {
        const sessionResp = await ctx.client.session.create({
          body: {
            parentID: context.sessionID,
            title: `${subagent_type}: ${description}`,
          },
          query: { directory: ctx.directory },
        });

        const sessionID = (sessionResp.data as { id?: string })?.id ?? (sessionResp as { id?: string }).id;
        if (!sessionID) throw new Error("Failed to create session");

        // Build prompt body with resolved model if available
        const promptBody: {
          parts: Array<{ type: "text"; text: string }>;
          model?: ModelConfig;
        } = {
          parts: [{ type: "text" as const, text: enhancedPrompt }],
        };

        if (resolvedModel) {
          promptBody.model = resolvedModel;
          log(`Using resolved model for sync agent call`, { subagent_type, ...resolvedModel });
        }

        const promptResp = await ctx.client.session.prompt({
          path: { id: sessionID },
          body: promptBody,
          query: { directory: ctx.directory },
        });

        // Check for HTTP-level errors
        if (promptResp.error) {
          if (tuiService) {
            await tuiService.notifyAgentCompleted(subagent_type, false, callID);
          }
          return JSON.stringify({
            session_id: sessionID,
            status: "failed",
            error: `Prompt failed: ${JSON.stringify(promptResp.error)}`,
          });
        }

        const promptData = promptResp.data as {
          info?: {
            role?: string;
            error?: { name: string; data?: { providerID?: string; message?: string } };
          };
          parts?: Array<{ type: string; text?: string }>;
        } | undefined;

        // Check for provider auth errors (401)
        if (promptData?.info?.error) {
          if (tuiService) {
            await tuiService.notifyAgentCompleted(subagent_type, false, callID);
          }
          const err = promptData.info.error;
          const errMsg = err.data?.message || err.name || "Unknown error";
          return JSON.stringify({
            session_id: sessionID,
            status: "failed",
            error: `[${err.name}] ${errMsg}`,
          });
        }

        const result = promptData?.parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n") || "";

        // Notify success
        if (tuiService) {
          await tuiService.notifyAgentCompleted(subagent_type, true, callID);
        }

        return JSON.stringify({
          session_id: sessionID,
          status: "completed",
          result,
        });
      } catch (err) {
        if (tuiService) {
          await tuiService.notifyAgentCompleted(subagent_type, false, callID);
        }
        return JSON.stringify({
          status: "failed",
          error: String(err),
        });
      }
    },
  });
}
```

### src/tools/background-manager.ts - Key Changes

```typescript
// Add import at top:
import type { TuiStatusService } from "../hooks/tui-status";

// Change function signature:
export function createBackgroundManager(
  ctx: PluginInput,
  config?: BackgroundTaskConfig,
  modelService?: ModelResolutionService,
  tuiService?: TuiStatusService
): BackgroundManager {

// In createTask, after tasks.set (around line 137):
tasks.set(taskId, task);
log(`Background task created`, { taskId, description, agent });

// Notify TUI that background agent is starting
if (tuiService) {
  const taskSummary = description?.substring(0, 50) || prompt.split('\n')[0]?.substring(0, 50);
  tuiService.notifyAgentStarted(agent, taskSummary, taskId).catch(() => {});
}

// In completion handler (around line 220):
task.status = "completed";
task.completedAt = Date.now();
log(`Background task completed`, { taskId, duration: task.completedAt - task.startedAt });

if (tuiService) {
  await tuiService.notifyAgentCompleted(agent, true, taskId);
} else {
  ctx.client.tui.showToast({
    body: {
      title: "Background Task Completed",
      message: `${description.substring(0, 40)}...`,
      variant: "success" as const,
      duration: 3000,
    },
  }).catch(() => {});
}

// In failure handler (around line 235):
} catch (err) {
  task.status = "failed";
  task.error = String(err);
  task.completedAt = Date.now();
  log(`Background task failed`, { taskId, error: task.error });
  
  if (tuiService) {
    await tuiService.notifyAgentCompleted(agent, false, taskId);
  }
}
```

### src/index.ts - Reordering

```typescript
// Around line 36, BEFORE backgroundManager creation:

// Create TUI status service first (needed by tools)
const tuiStatus = createTuiStatusHook(ctx, {
  enabled: pluginConfig.tui_status?.enabled ?? true,
  showAgentNotifications: pluginConfig.tui_status?.showAgentNotifications ?? true,
  showModeChanges: pluginConfig.tui_status?.showModeChanges ?? true,
  toastDuration: pluginConfig.tui_status?.toastDuration ?? 3000,
  trackMetrics: pluginConfig.tui_status?.trackMetrics ?? true,
});

const backgroundManager = createBackgroundManager(
  ctx, 
  pluginConfig.background_task, 
  modelService,
  tuiStatus.service
);
const backgroundTools = createBackgroundTools(backgroundManager, ctx.client);
const callOmcoAgent = createCallOmcoAgent(ctx, backgroundManager, modelService, tuiStatus.service);

// REMOVE the duplicate tuiStatus creation at lines 93-100
```

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Type errors from new interface | Medium | Low | Run typecheck before commit |
| Breaking existing toast functionality | High | Low | Service fallback preserves old behavior |
| Performance impact from async toasts | Low | Low | Toasts are fire-and-forget with .catch() |
| Circular dependency | Medium | Low | Service interface in hooks, tools import type only |

## Rollback Strategy

If issues arise after implementation:

1. **Quick Rollback**: Set `tui_status.showAgentNotifications: false` in config
2. **Code Rollback**: 
   - Remove `tuiService` parameters from tool functions
   - Revert `src/index.ts` to original order
   - Keep TuiStatusService interface (no harm)
3. **Full Rollback**: `git revert` the implementation commit

---

## Effort Estimate

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1: Service Interface | 2 | 15 min |
| Phase 2: call-omco-agent | 4 | 30 min |
| Phase 3: background-manager | 5 | 30 min |
| Phase 4: index.ts wiring | 3 | 15 min |
| Phase 5: Type exports | 2 | 5 min |
| Phase 6: Testing | 4 | 20 min |
| **Total** | **20** | **~2 hours** |

---

## Dependencies

- No external dependencies required
- Uses existing OpenCode SDK (`ctx.client.tui.showToast`)
- Uses existing TuiStatusOptions config schema

---

**PLAN_READY: .omc/plans/agent-ui-notifications.md**
