# omo-omcs Update Specification

## From: v0.1.11 (oh-my-claudecode v3.0.11)
## To: v0.2.0 (oh-my-claudecode v3.3.6 feature parity)

---

## Executive Summary

omo-omcs를 oh-my-claudecode v3.3.6 수준으로 업데이트한다. OpenCode API 제한으로 인해 일부 기능은 제외하고, 핵심 기능에 집중한다.

---

## Scope Definition

### IN SCOPE (Must Port)

| Category | Feature | Priority |
|----------|---------|----------|
| **Agents** | scientist, scientist-low, scientist-high | HIGH |
| **Agents** | coordinator agent | MEDIUM |
| **Hooks** | autopilot hook | HIGH |
| **Hooks** | ultraqa-loop hook | HIGH |
| **Hooks** | context-window-limit-recovery | MEDIUM |
| **Hooks** | edit-error-recovery | MEDIUM |
| **Hooks** | preemptive-compaction | MEDIUM |
| **Hooks** | learner hook | MEDIUM |
| **Hooks** | omc-orchestrator | HIGH |
| **Hooks** | ralph-prd improvements | HIGH |
| **Hooks** | ralph-progress improvements | HIGH |
| **State** | Enhanced state persistence | HIGH |
| **Config** | Updated schema for new features | HIGH |

### OUT OF SCOPE (OpenCode Limitations)

| Feature | Reason |
|---------|--------|
| HUD Statusline | Requires shell hook |
| Stop Hook (proactive) | OpenCode lacks Stop event |
| background-notification | Requires OS integration |
| non-interactive-env | Shell-specific |
| think-mode | Claude Code thinking API specific |
| Python REPL for scientist | OpenCode doesn't support REPL |

### DEFERRED (Future Release)

| Feature | Reason |
|---------|--------|
| Mnemosyne Skills | Complex, needs separate design |
| Full skill system (28 skills) | Incremental rollout preferred |
| MCP server integration | Depends on OpenCode MCP support |

---

## Technical Specification

### 1. New Agent Definitions

#### scientist agents
```typescript
// src/agents/index.ts additions
scientist: {
  name: "scientist",
  description: "Data analysis and research execution specialist",
  model: "sonnet",
  tools: ["Read", "Grep", "Glob", "Bash"],
  systemPrompt: "..." // Port from oh-my-claudecode
}

scientist-low: {
  name: "scientist-low",
  model: "haiku",
  description: "Quick data inspection and simple statistics"
}

scientist-high: {
  name: "scientist-high",
  model: "opus",
  description: "Complex research, hypothesis testing, and ML specialist"
}
```

#### coordinator agent
```typescript
coordinator: {
  name: "coordinator",
  description: "Multi-agent task coordination and delegation",
  model: "sonnet",
  tools: ["Read", "Task"]
}
```

### 2. New Hooks

#### autopilot hook
- Trigger: `/autopilot` command or "autopilot:" keyword
- State: `.omc/autopilot-state.json`
- Phases: Expansion → Planning → Execution → QA → Validation
- Integration: Uses ralph-loop for persistence

#### ultraqa-loop hook
- Trigger: `/ultraqa` command
- Pattern: Build → Lint → Test → Fix → Repeat
- State: `.omc/ultraqa-state.json`
- Exit: All checks pass or max iterations

#### context-window-limit-recovery hook
- Trigger: Token limit error detection
- Action: Truncate context, inject recovery prompt
- Event: `tool.execute.after` with error pattern matching

#### edit-error-recovery hook
- Trigger: Edit tool failure
- Action: Suggest alternative approach
- Event: `tool.execute.after` for Edit tool

#### omc-orchestrator hook
- Purpose: Central delegation coordinator
- Validates agent selection
- Enforces tool restrictions per agent
- Tracks delegation audit log

### 3. Enhanced State Management

```typescript
// src/state/autopilot-state.ts
interface AutopilotState {
  sessionId: string;
  phase: 'expansion' | 'planning' | 'execution' | 'qa' | 'validation' | 'complete';
  spec: string;
  plan: string;
  progress: TaskProgress[];
  startedAt: string;
  completedAt?: string;
}

// src/state/ultraqa-state.ts
interface UltraQAState {
  sessionId: string;
  goal: string;
  iteration: number;
  maxIterations: number;
  lastBuildResult?: 'pass' | 'fail';
  lastTestResult?: 'pass' | 'fail';
  issues: string[];
}
```

### 4. Configuration Schema Update

```typescript
// Add to config schema
autopilot: {
  enabled: boolean;
  maxPhaseRetries: number;
  delegationEnforcement: 'strict' | 'warn' | 'off';
}

ultraqa: {
  enabled: boolean;
  maxIterations: number;
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
}

scientist: {
  enabled: boolean;
  replFallback: 'bash' | 'disabled';
}
```

### 5. Version Bump

```json
{
  "version": "0.2.0",
  "description": "OpenCode port of oh-my-claudecode v3.3.6"
}
```

---

## File Changes Summary

### New Files
- `src/hooks/autopilot.ts`
- `src/hooks/ultraqa-loop.ts`
- `src/hooks/context-recovery.ts`
- `src/hooks/edit-error-recovery.ts`
- `src/hooks/omc-orchestrator.ts`
- `src/state/autopilot-state.ts`
- `src/state/ultraqa-state.ts`
- `src/agents/scientist.ts`
- `src/agents/coordinator.ts`

### Modified Files
- `src/index.ts` - Wire new hooks
- `src/agents/index.ts` - Add new agents
- `src/config/index.ts` - New config options
- `src/hooks/index.ts` - Export new hooks
- `src/state/index.ts` - Export new state modules
- `package.json` - Version bump to 0.2.0

### Test Files
- `tests/autopilot.test.ts`
- `tests/ultraqa.test.ts`
- `tests/scientist.test.ts`

---

## Migration Notes

### Breaking Changes
- None expected for existing users

### Deprecations
- Legacy agent aliases still work (oracle → architect, etc.)

### New Defaults
- `autopilot.delegationEnforcement: 'warn'`
- `ultraqa.maxIterations: 10`

---

**EXPANSION_COMPLETE**
