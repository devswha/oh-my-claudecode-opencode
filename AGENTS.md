<!-- Generated: 2026-01-22 | Updated: 2026-01-22 -->

# oh-my-claudecode-opencode (OMCO)

> **OpenCode port of [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)**

## Project Vision

이 프로젝트는 [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)를 **OpenCode** 플랫폼으로 포팅하는 것이 목적이다.

### 왜 포팅하는가?

**oh-my-claudecode**는 Claude Code CLI를 위한 멀티에이전트 오케스트레이션 플러그인이다. 하지만 모든 사용자가 Claude Code를 사용하는 것은 아니다. 많은 개발자들이 **GitHub Copilot**을 통해 Claude를 사용하며, 이들도 동일한 멀티에이전트 경험을 원한다.

```
┌─────────────────────────────────────────────────────────────────┐
│                        사용자 경험 목표                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Claude Code + oh-my-claudecode                                │
│        ↓                                                        │
│   동일한 Tool Calling, Agent Actions, 완료 보장                  │
│        ↓                                                        │
│   OpenCode + GitHub Copilot + Claude + OMCO                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 핵심 포팅 목표

| 원본 (oh-my-claudecode) | 포트 (OMCO) | 상태 |
|------------------------|-------------|------|
| Shell hooks + Node.js bridge | Native TypeScript plugin API | ✅ |
| Stop hook (proactive blocking) | session.idle event (reactive) | ⚠️ 제한적 |
| 28개 전문 에이전트 | 동일한 에이전트 정의 | ✅ |
| Ralph Loop (완료 보장) | Ralph Loop 포팅 | ✅ |
| Ultrawork Mode (병렬 실행) | Ultrawork Mode 포팅 | ✅ |
| Autopilot Mode | Slash command로 지원 | ✅ |
| PRD 기반 태스크 추적 | PRD Manager 포팅 | ✅ |
| Notepad Memory System | Remember tag processor | ✅ |
| HUD Statusline | 미지원 (OpenCode 제한) | ❌ |

### Feature Parity with oh-my-claudecode v3.3.4

현재 oh-my-claudecode의 최신 버전은 **v3.3.4**이다. OMCO는 핵심 기능의 feature parity를 목표로 한다:

- ✅ **자동 에이전트 오케스트레이션** - 태스크 복잡도에 따른 전문가 자동 배치
- ✅ **Magic Keywords** - `ralph`, `plan`, `autopilot`, `ulw` 등
- ✅ **28개 전문 에이전트** - architect, executor, designer, researcher 등
- ⚠️ **Data Science Capabilities** - scientist 에이전트 (REPL 미지원)
- ⚠️ **Research Workflow** - `/research` 명령어 (부분 지원)

## Purpose

OMCO provides **multi-agent orchestration** for OpenCode with completion guarantees through ultrawork mode, ralph loops, TODO continuation, and session state management.

**Philosophy**: Bringing oh-my-claudecode's powerful agent orchestration to the OpenCode ecosystem.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Node.js dependencies, build/test/typecheck scripts |
| `tsconfig.json` | TypeScript strict mode configuration (ES2022, ESNext modules) |
| `bun.lock` | Bun package manager lockfile |
| `README.md` | User-facing documentation with features, usage, and installation |
| `src/index.ts` | Main plugin entry point - orchestrates all hooks and tools |
| `assets/OMCO.schema.json` | JSON schema for configuration validation |
| `docs/ROADMAP.md` | Feature roadmap, known issues, phase tracking |

## Subdirectories

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| **src/** | Main plugin implementation | `index.ts` - plugin orchestrator |
| **src/agents/** | Specialized agent definitions | Agent configuration and orchestration |
| **src/config/** | Configuration loading | `index.ts` - loads `.opencode/OMCO.json` |
| **src/hooks/** | OpenCode event handlers | System prompts, completion enforcer, ralph loop, keyword detection |
| **src/tools/** | Available commands | Background task manager, agent calling, builtin commands |
| **src/prd/** | Product requirements management | PRD generation, progress tracking for ralph loop |
| **src/shared/** | Utility modules | Logger, session state helpers |
| **src/state/** | Persistent mode state | Ultrawork state, ralph state, verification state |
| **src/plugin-handlers/** | Plugin configuration | Agent registration, command templates |
| **tests/** | Test suite (40+ tests) | Hooks, integration, notepad system tests |
| **docs/** | Documentation | ROADMAP.md with feature status and migration guide |
| **.omco/** | Local session persistence | Notepad and session state cache |
| **.opencode/** | OpenCode config directory | OMCO.json configuration |
| **.omc/** | Multi-agent orchestration state | ultrawork-state.json, ralph-state.json, prd.json, progress.txt |

## For AI Agents

### Working In This Directory

**Build System**: Bun is the exclusive runtime. All operations use `bun` commands.

```bash
# Install dependencies
bun install

# Build plugin (outputs to dist/)
bun run build

# Build with file watching
bun run build:watch

# Type checking
bun run typecheck

# Run tests
bun test

# Linting
bun run lint
```

**Development Workflow**:
1. Source code is in TypeScript in `src/`
2. Compiled to `dist/` for distribution (ESM format)
3. Type declarations auto-generated alongside JavaScript
4. All changes to `src/**/*.ts` are compiled by build step

**Key Constraints**:
- **Strict TypeScript**: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns` all enabled
- **ESM modules only**: `type: "module"` in package.json
- **Bun target**: Built with `--target bun` for Bun runtime compatibility
- **No CommonJS**: Pure ESM, no dual distribution

**Plugin Architecture**:
```
OpenCode Client
    ↓
OMCO Plugin (src/index.ts)
    ├─ event handlers (src/hooks/*)
    ├─ tools (src/tools/*)
    ├─ agent registration (src/plugin-handlers/*)
    └─ state management (src/state/*, src/prd/*)
```

### Testing Requirements

**Test Framework**: Bun's native test runner with standard assertions

**Test Structure**:
```bash
bun test              # Run all tests
bun test hooks        # Run specific test file
```

**Test Files**:
- `tests/hooks.test.ts` - Unit tests for hook functions (keyword detection, system prompts)
- `tests/integration.test.ts` - Integration tests (plugin lifecycle, session handling)
- `tests/notepad.test.ts` - Notepad memory system tests (`<remember>` tags)

**Coverage**: 40+ passing tests covering:
- Keyword detection (ultrawork, ralph-loop keywords)
- System prompt injection logic
- Ralph loop state management
- Plugin initialization and teardown
- Notepad memory persistence
- Session recovery

**Before Committing**:
1. Run `bun typecheck` (TypeScript strict mode)
2. Run `bun test` (all 40+ tests pass)
3. Run `bun run build` (no build errors)

### Common Patterns

**Hook Pattern** (src/hooks/):
```typescript
// Hooks are async functions handling OpenCode events
export const createMyHook = (ctx: PluginInput) => ({
  "event.type": async (input: InputType, output: OutputType) => {
    // Modify output or trigger actions
  }
});
```

**State Management** (src/state/):
```typescript
// States are JSON files in .omc/ directory
// Auto-loaded on plugin init, auto-saved on changes
// Supports:
// - .omc/ultrawork-state.json (parallel execution state)
// - .omc/ralph-state.json (completion loop state)
// - ~/.opencode/ultrawork-state.json (cross-session global state)
```

**PRD System** (src/prd/):
```typescript
// Ralph loop generates Product Requirements Documents
// Tracks user stories with acceptance criteria
// Records progress and learnings for future context injection
// Location: .omc/prd.json, .omc/progress.txt
```

**Tool Registration** (src/plugin-handlers/):
```typescript
// Tools are registered via config handler
// Slash commands become tool calls in chat
// Examples: /ralph-loop, /ultrawork, /cancel-ralph
```

**Agent Calling** (src/tools/call-omco-agent.ts):
```typescript
// Agents are called via background_task tool
// Supported: explore, librarian, oracle, omco-executor, frontend-engineer, document-writer
// Legacy names still work for backward compatibility
```

**Session Idle Detection**:
- `session.idle` event fires when no tool calls for configured threshold
- Used for TODO continuation, ralph-loop continuation, ultrawork reinforcement
- Allows reactive continuation after user "stops" (no proactive stop hook available)

**Completion Signals**:
- Ralph loop detects: `<promise>TASK_COMPLETE</promise>` or `<promise>DONE</promise>`
- Can be verified by architect agent
- Tracked in verification-state for multiple retry attempts

**Notepad Memory**:
- `<remember>context</remember>` tags in tool output
- Processed by `remember-tag-processor` hook
- Survives conversation compaction via `.omco/notepad.md`
- Used in persistent mode continuation for context injection

## Dependencies

### External

| Package | Version | Purpose |
|---------|---------|---------|
| `@opencode-ai/plugin` | ^1.1.26 | OpenCode plugin API and types |
| `@opencode-ai/sdk` | ^1.1.26 | OpenCode SDK for client operations |
| `zod` | ^4.1.8 | TypeScript-first schema validation for config |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.7.3 | TypeScript compiler (strict mode) |
| `bun-types` | latest | Type definitions for Bun runtime |
| `@types/node` | ^22.0.0 | Node.js type definitions |

### Peer Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@opencode-ai/plugin` | >=1.0.0 | OpenCode plugin API (required) |

## Architecture Overview

### Main Plugin Flow (src/index.ts)

```
Plugin Init
  ├─ Load config from .opencode/OMCO.json
  ├─ Initialize state managers (ultrawork, ralph, verification)
  ├─ Create background task manager for parallel agents
  ├─ Register hooks:
  │   ├─ Ralph loop handler (slash commands, completion detection)
  │   ├─ Persistent mode handler (session.idle continuation)
  │   ├─ System prompt injector (ultrawork, ralph modes)
  │   ├─ Skill injector (autopilot context)
  │   ├─ Remember tag processor (memory persistence)
  │   └─ Config handler (agent registration, slash commands)
  └─ Register tools:
      ├─ background_task (run explore/librarian parallel)
      ├─ background_output (fetch background results)
      ├─ call_omo_agent (direct agent invocation)
      └─ Built-in diagnostic tools
```

### Event Handlers (src/hooks/)

| Hook | Event | Purpose |
|------|-------|---------|
| `keyword-detector.ts` | `chat.message` | Detect ultrawork/ralph keywords, trigger modes |
| `system-prompt-injector.ts` | `experimental.chat.system.transform` | Inject high-intensity prompts for ultrawork/ralph |
| `ralph-loop.ts` | `chat.message`, `session.idle` | Completion detection, iteration tracking, PRD updates |
| `persistent-mode.ts` | `session.idle` | Route continuation to appropriate mode (ralph > ultrawork > todo) |
| `todo-continuation-enforcer.ts` | `session.idle` | Inject continuation reminder when TODOs remain |
| `skill-injector.ts` | `chat.message` | Detect delegation context, suggest agent usage |
| `remember-tag-processor.ts` | `tool.execute.after` | Extract and persist `<remember>` tags |
| `session-recovery.ts` | `session.error`, `session.recover` | Handle crashed sessions, restore state |
| `ralph-verifier.ts` | Completion detection | Route to architect for verification (when enabled) |

### Configuration (src/config/)

```json
{
  "disabled_hooks": ["hook-name"],
  "background_task": {
    "max_concurrent": 5,
    "timeout_ms": 300000
  },
  "ralph_loop": {
    "max_iterations": 50,
    "idle_timeout_ms": 30000
  },
  "todo_continuation": {
    "idle_threshold_ms": 15000,
    "reminder_interval_ms": 60000
  },
  "ultrawork": {
    "keywords": ["ultrawork", "ulw", "uw"],
    "auto_parallel": true
  }
}
```

### State Files

**Location**: `.omc/` directory (project-level) and `~/.opencode/` (global)

| File | Purpose | Persistence |
|------|---------|-------------|
| `ultrawork-state.json` | Active ultrawork session, reinforcement count | Auto-loaded on init, auto-cleared on completion |
| `ralph-state.json` | Current ralph-loop iteration, PRD ref, completion promise | Tracked across sessions, resumed on restart |
| `ralph-verification.json` | Pending verification attempts, architect feedback | Auto-cleared after approval/rejection |
| `prd.json` | Product requirements, user stories, acceptance criteria | Generated on ralph-loop start, updated per iteration |
| `progress.txt` | Iteration logs, learnings, patterns discovered | Appended per iteration, injected into continuations |

## Specialized Agents

All agent names support backward compatibility (legacy names still work):

```
New Name              → Legacy Alias
architect             → oracle (READ-ONLY advisor)
architect-medium      → oracle-medium
architect-low         → oracle-low
researcher            → librarian
researcher-low        → librarian-low
explore               → (no alias, new in v3)
explore-medium        → (no alias, new in v3)
designer              → frontend-engineer
designer-low          → frontend-engineer-low
designer-high         → frontend-engineer-high
writer                → document-writer
executor              → omco-executor
executor-low          → omco-executor-low
executor-high         → omco-executor-high
planner               → prometheus
analyst               → metis
critic                → momus
vision                → multimodal-looker
qa-tester             → (no alias, new in v3)
```

## Completion Guarantee

This plugin implements a completion guarantee through multiple mechanisms:

1. **Ralph Loop**: Iterative task loop with PRD tracking, architect verification, and state persistence
2. **Ultrawork Mode**: High-intensity parallel execution with system prompt reinforcement
3. **TODO Continuation**: Automatic reminder injection on idle when pending tasks exist
4. **Session Recovery**: Resume interrupted sessions from state files
5. **Notepad Memory**: Compaction-resilient context persistence via `<remember>` tags

The plugin never knowingly allows task abandonment through state tracking and prompt injection.

<!-- MANUAL NOTES -->

## Known Limitations

| Limitation | Impact | Status |
|-----------|--------|--------|
| No Stop Hook | Reactive continuation (session.idle) instead of proactive blocking | OpenCode feature request pending |
| In-Memory Session Tracking | State lost on process restart (mitigated by file persistence) | Managed by .omc state files |
| No Direct Stop Prevention | User can exit chat, continuation needs new input | Design constraint of OpenCode |

## Development Checklist

When modifying this project:

- [ ] TypeScript strict mode passes: `bun run typecheck`
- [ ] All tests pass: `bun test`
- [ ] Build succeeds: `bun run build`
- [ ] No lint errors: `bun run lint`
- [ ] `.omc/` state files are ignored by git
- [ ] Configuration loads from `.opencode/OMCO.json`
- [ ] State directory respects `~/.opencode/` for global state
- [ ] All hooks are async-safe
- [ ] Session IDs properly threaded through state
- [ ] Tests updated for new features
- [ ] ROADMAP.md updated with changes

