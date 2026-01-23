# OMCO Improvement Spec (v2 - Critic Reviewed)

**Date**: 2026-01-23
**Status**: PLANNING_COMPLETE

---

## Summary

OMC vs OMCO 비교 문서를 분석하여 OMCO 개선 사항 도출.
- CRITICAL: 4개 (3개 기존 + 1개 추가)
- HIGH: 4개 (3개 기존 + 1개 추가)
- MEDIUM: 3개
- LOW: 3개

---

## Issues List (Updated per Critic Review)

### CRITICAL Priority

| ID | Title | Description |
|----|-------|-------------|
| OMCO-001 | Expand call_omo_agent to support all 24 agents | Currently hardcoded to `["explore", "librarian"]` only |
| OMCO-002 | Inject agent system prompts in delegated sessions | Agent's systemPrompt field not used when spawning |
| OMCO-003 | Pass model tier to OpenCode Task tool | Agent model (haiku/sonnet/opus) not passed to sessions |
| **OMCO-014** | **Add executor Task tool blocking** | Executors can spawn sub-agents, violating "no delegation" rule |

### HIGH Priority

| ID | Title | Description |
|----|-------|-------------|
| OMCO-004 | ~~Implement Boulder State~~ Extend AutopilotState | Track plan progress (extend existing AutopilotState) |
| OMCO-005 | Add Git diff stats to orchestrator | Show changes summary in completion phase |
| OMCO-006 | Add file path validation for direct writes | Warn when writing to source files directly |
| **OMCO-007** | **Model availability check at startup** | Upgraded from MEDIUM - prevents cryptic errors |
| **OMCO-015** | **Fix background task result extraction** | background_output returns empty - result not captured |

### MEDIUM Priority

| ID | Title | Description |
|----|-------|-------------|
| OMCO-008 | Background task timeout | Prevent hung tasks (configurable, default 5 min) |
| OMCO-010 | Agent metadata file separation | Split 1000+ line agents/index.ts |

### LOW Priority

| ID | Title | Description |
|----|-------|-------------|
| OMCO-009 | Audit log rotation | Downgraded - nice-to-have |
| OMCO-011 | MCP server integration research | Investigate OpenCode's MCP support feasibility |
| OMCO-012 | Context window monitoring | Warning at 80% capacity |
| OMCO-013 | Agent usage telemetry | Optional opt-in metrics |

---

## Technical Specification

### CRITICAL-1: call_omo_agent Agent Support (OMCO-001)

**File**: `src/tools/call-omo-agent.ts`

**Changes**:
```typescript
import { getAgent, listAgentNames, getCanonicalName, isAlias } from "../agents";

// Replace enum with string + validation
subagent_type: tool.schema
  .string()
  .describe(`Agent type. Available: ${listAgentNames().join(', ')}`)

// In execute():
const canonicalName = isAlias(subagent_type) ? getCanonicalName(subagent_type) : subagent_type;
const agent = getAgent(canonicalName);
if (!agent) {
  return JSON.stringify({
    status: "failed",
    error: `Unknown agent: ${subagent_type}. Available: ${listAgentNames().join(', ')}`
  });
}
```

### CRITICAL-2: System Prompt Injection (OMCO-002)

**Files**: `src/tools/call-omo-agent.ts`, `src/tools/background-manager.ts`

**Approach**: Prepend system prompt to user prompt (SDK doesn't support system field)

```typescript
const agent = getAgent(canonicalName);
const fullPrompt = agent?.systemPrompt
  ? `${agent.systemPrompt}\n\n---\n\nUser Task:\n${prompt}`
  : prompt;

await ctx.client.session.prompt({
  path: { id: sessionID },
  body: {
    parts: [{ type: "text", text: fullPrompt }],
  },
  query: { directory: ctx.directory },
});
```

### CRITICAL-3: Model Tier Resolution (OMCO-003)

**Files**: `src/tools/call-omo-agent.ts`, `src/tools/background-manager.ts`

**Note**: OpenCode SDK session.create may not support `model` field. Implementation will verify and document SDK capabilities.

```typescript
import { ModelResolver } from "../config/model-resolver";

// Get resolved model
const resolver = new ModelResolver(config.model_mapping);
const resolution = resolver.resolve(canonicalName, agent?.model);

// Pass to session if SDK supports it
await ctx.client.session.create({
  body: {
    parentID: context.sessionID,
    title: `${canonicalName}: ${description}`,
    model: resolution.model,  // May need SDK verification
  },
  query: { directory: ctx.directory },
});
```

### CRITICAL-4: Executor Task Tool Blocking (OMCO-014)

**File**: `src/hooks/omc-orchestrator.ts`

**Add to TOOL_RESTRICTIONS**:
```typescript
const TOOL_RESTRICTIONS: Record<string, string[]> = {
  // READ-ONLY agents - block Write/Edit
  architect: ["Write", "Edit"],
  "architect-low": ["Write", "Edit"],
  "architect-medium": ["Write", "Edit"],
  planner: ["Write", "Edit"],
  analyst: ["Write", "Edit"],
  critic: ["Write", "Edit"],
  vision: ["Write", "Edit"],
  explore: ["Write", "Edit"],
  "explore-medium": ["Write", "Edit"],
  researcher: ["Write", "Edit"],
  "researcher-low": ["Write", "Edit"],
  // EXECUTOR agents - block Task (no delegation)
  executor: ["Task"],
  "executor-low": ["Task"],
  "executor-high": ["Task"],
};
```

### HIGH-1: Extend AutopilotState (OMCO-004)

**File**: `src/state/autopilot-state.ts`

Instead of new BoulderState, extend AutopilotState:
```typescript
export interface AutopilotState {
  // ... existing fields
  planProgress?: {
    currentPhase: number;
    phases: Array<{
      name: string;
      tasks: Array<{
        id: string;
        description: string;
        status: "pending" | "in_progress" | "completed" | "failed";
        assignedAgent?: string;
      }>;
    }>;
  };
}
```

### HIGH-2: Git Diff Stats (OMCO-005)

**New File**: `src/shared/git-utils.ts`

```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface GitDiffStats {
  filesChanged: number;
  insertions: number;
  deletions: number;
  files: Array<{
    path: string;
    status: "added" | "modified" | "deleted";
    insertions: number;
    deletions: number;
  }>;
}

export async function getGitDiffStats(directory: string): Promise<GitDiffStats | null> {
  try {
    const { stdout } = await execAsync("git diff --numstat HEAD~1", { cwd: directory });
    // Parse output...
  } catch {
    return null;
  }
}
```

### HIGH-3: File Path Validation (OMCO-006)

**File**: `src/hooks/omc-orchestrator.ts`

```typescript
const ALLOWED_DIRECT_WRITE_PATTERNS = [
  /^\.omc\//,
  /^\.claude\//,
  /CLAUDE\.md$/,
  /AGENTS\.md$/,
];

const WARNED_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"];

// In tool.execute.before hook:
if (input.tool === "Write" || input.tool === "Edit") {
  const filePath = output.args.file_path as string;
  if (shouldWarnOnWrite(filePath)) {
    log("[omc-orchestrator] Direct write to source file", { file: filePath });
  }
}
```

### HIGH-4: Model Availability Check (OMCO-007)

**File**: `src/plugin-handlers/config-handler.ts`

```typescript
// At plugin initialization
async function checkModelAvailability(ctx: PluginInput) {
  const models = ["github-copilot/claude-haiku-4", "github-copilot/claude-sonnet-4", "github-copilot/claude-opus-4"];
  for (const model of models) {
    // Attempt lightweight API call to verify model availability
    // Log warning if model not accessible
  }
}
```

### HIGH-5: Background Task Result Extraction (OMCO-015)

**File**: `src/tools/background-manager.ts`

```typescript
// In pollTask() or completion handler:
const messagesResp = await ctx.client.session.messages({
  path: { id: task.sessionID },
});

const messages = messagesResp.data ?? [];
const lastAssistant = [...messages].reverse().find(m => m.info?.role === "assistant");
const result = lastAssistant?.parts
  ?.filter(p => p.type === "text" && p.text)
  .map(p => p.text)
  .join("\n") || "";

task.result = result;  // Store the actual result
```

---

## File Changes Summary

| File | Action | Issues |
|------|--------|--------|
| `src/tools/call-omo-agent.ts` | MODIFY | OMCO-001, 002, 003 |
| `src/tools/background-manager.ts` | MODIFY | OMCO-002, 003, 015 |
| `src/hooks/omc-orchestrator.ts` | MODIFY | OMCO-006, 014 |
| `src/state/autopilot-state.ts` | MODIFY | OMCO-004 |
| `src/shared/git-utils.ts` | CREATE | OMCO-005 |
| `src/plugin-handlers/config-handler.ts` | MODIFY | OMCO-007 |

---

## Implementation Order (Updated)

1. **OMCO-001**: call_omo_agent agent support (Low effort) - Unlocks all agents
2. **OMCO-002**: System prompt injection (Medium effort) - Foundation for agent behavior
3. **OMCO-003**: Model tier resolution (Medium effort) - Completes agent configuration
4. **OMCO-014**: Executor Task blocking (Low effort) - Enforces delegation rules
5. **OMCO-015**: Background task result extraction (Low effort) - Fixes broken tool
6. **OMCO-006**: Path validation (Low effort) - Discipline enforcement
7. **OMCO-005**: Git diff stats (Low effort) - UX improvement
8. **OMCO-007**: Model availability check (Medium effort) - Error prevention
9. **OMCO-004**: Extend AutopilotState (Medium effort) - Plan tracking

---

## Acceptance Criteria

| ID | Criteria |
|----|----------|
| OMCO-001 | All 24 agents callable via subagent_type parameter |
| OMCO-002 | Agent's systemPrompt prepended to session prompts |
| OMCO-003 | Correct model selected based on agent tier |
| OMCO-014 | Executor agents cannot spawn Task tool calls |
| OMCO-015 | background_output returns actual agent response |
| OMCO-006 | Warning logged when writing to source files |
| OMCO-005 | Git diff stats available in completion phase |
| OMCO-007 | Clear warning if GitHub Copilot models unavailable |
| OMCO-004 | Plan progress tracked in AutopilotState |

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| HUD (Status Bar) | OpenCode has native TUI |
| CLI tools | OpenCode has its own CLI |
| Learner skill | Defer until core stable |
| Think Mode | Investigate OpenCode native support first |
| Separate Boulder State | Use extended AutopilotState instead |
