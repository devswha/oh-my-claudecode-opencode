# Documentation

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode와의 차이점 및 마이그레이션 가이드 문서. oh-my-claudecode 사용자가 OMCO로 전환할 때 필요한 정보, 기능 동등성 상태, 알려진 제약사항(Stop hook 부재 등), 마이그레이션 가이드가 포함되어 있다. ROADMAP.md는 포팅 진행 상황을 추적한다.

## Overview

This directory contains project documentation, roadmaps, and planning documents for OMCO development.

## Key Files

### `ROADMAP.md`
**Purpose**: Project development roadmap and feature planning
**Contents**:
- Implementation status tracking
- Known issues and limitations
- Feature roadmap by phase
- Comparison with oh-my-claudecode
- Technical debt tracking

## Current Status

### Implemented Features (v0.1.11)

| Feature | Status | Description |
|---------|--------|-------------|
| Ultrawork Mode | ✅ | System prompt injection via `experimental.chat.system.transform` |
| Ralph Loop | ✅ | PRD-based task tracking with completion detection |
| Ultrawork-Ralph | ✅ | Combined mode (ultrawork + ralph-loop) |
| Keyword Detection | ✅ | Auto-detects `ultrawork`, `ulw`, `uw`, `/ralph-loop` |
| Completion Detection | ✅ | `<promise>TASK_COMPLETE</promise>` and `<promise>DONE</promise>` |
| TODO Continuation | ✅ | Continuation prompt injection on `session.idle` |
| Background Agents | ✅ | `explore`, `librarian` via `background_task` tool |
| Session Recovery | ✅ | Session error handling and recovery |
| Notepad Memory System | ✅ | Compaction-resilient memory with `<remember>` tags |
| Remember Tag Processor | ✅ | Post-tool-use hook for memory persistence |
| Persistent Mode Handler | ✅ | Unified continuation (Ralph > Ultrawork > Todo) |

### Test Coverage
- **40 tests passing** (unit + integration)
- Covers: keyword detection, system prompt injection, ralph-loop state, plugin lifecycle, notepad system

## Known Issues

### 1. No Stop Hook (Critical)

**Problem**: OpenCode plugin API doesn't expose a `Stop` event hook.

**Impact**:
- Cannot block premature stopping (unlike oh-my-claudecode)
- Must rely on `session.idle` detection + prompt injection (reactive)
- Different UX: countdown before continuation vs immediate block

**Comparison**:
```
oh-my-claudecode (Claude Code):
  User stops → Stop hook intercepts → Returns {continue: false} → Blocked

OMCO (OpenCode):
  User stops → Session idle → Detected after delay → Prompt injected → Resumes
```

**Mitigation**: Uses `session.idle` event with 2-second countdown.

**Resolution**: Request Stop hook from OpenCode team.

### 2. In-Memory State Only

**Problem**: Mode states stored in memory only.

**Impact**:
- State lost on plugin restart
- No cross-session persistence
- Cannot resume interrupted sessions

**oh-my-claudecode approach**:
- `.omc/ultrawork-state.json` - Local project state
- `.omc/ralph-state.json` - Ralph loop state
- `~/.opencode/ultrawork-state.json` - Global state

### 3. Missing Architect Verification

**Problem**: Ralph-loop completion not verified by Architect agent.

**Impact**:
- Agent can claim completion without verification
- No quality check on task completion

**oh-my-claudecode approach**:
- `ralph-verifier` hook intercepts completion claims
- Spawns Architect agent to verify
- Uses `<oracle-approved>VERIFIED_COMPLETE</oracle-approved>` tag

### 4. Incomplete PRD Progress Tracking

**Problem**: `.omc/progress.txt` not fully implemented.

**Impact**:
- Learnings not persisted between iterations
- Patterns not recorded
- Story completion history not tracked

## Feature Roadmap

### Phase 1: State Persistence ✅ COMPLETED
- File-based ultrawork state
- File-based ralph-loop state
- Global cross-session state
- Session recovery from disk

### Phase 2: Verification & Quality
- Architect verification for ralph-loop
- Quality checks before completion acceptance
- PRD progress tracking (learnings, patterns)
- Story completion history

### Phase 3: Advanced Modes
- Custom mode definitions
- Mode composition (beyond ultrawork-ralph)
- Mode presets and templates
- Per-project mode configurations

### Phase 4: Multi-Agent Coordination
- Agent task queues
- Dependency graphs
- Parallel agent orchestration
- Agent communication protocol

### Phase 5: Enhanced PRD System
- User story templates
- Acceptance criteria generators
- Progress visualization
- Milestone tracking

## Architecture Decisions

### 1. Plugin Hooks over Direct Integration

**Decision**: Use OpenCode plugin hooks exclusively.

**Rationale**:
- Maintains compatibility with OpenCode plugin API
- No vendor lock-in
- Easier to port to other platforms

**Tradeoffs**:
- Some features unavailable (Stop hook)
- More reactive than proactive
- Limited control over core behavior

### 2. File-Based State Persistence

**Decision**: Store state in `.omc/` directory.

**Rationale**:
- Project-local state
- Git-ignorable (via `.gitignore`)
- Human-readable (JSON)
- Compatible with oh-my-claudecode

**Tradeoffs**:
- Requires file I/O
- Race conditions possible (mitigated by locks)
- No atomic updates (JSON rewrite)

### 3. Notepad over Database

**Decision**: Use markdown files for notepad system.

**Rationale**:
- Human-readable and editable
- Git-friendly
- No external dependencies
- LLM-parseable

**Tradeoffs**:
- No query capabilities
- Manual parsing required
- Size limits (compaction needed)

### 4. Zod over Manual Validation

**Decision**: Use Zod schemas for config validation.

**Rationale**:
- Type safety
- Runtime validation
- Auto-generated TypeScript types
- Better error messages

**Tradeoffs**:
- Additional dependency
- Bundle size increase
- Learning curve

## Migration from oh-my-claudecode

### Naming Changes (v3.0.11)

| oh-my-claudecode | OMCO | Reason |
|------------------|----------|--------|
| `oracle` | `architect` | More descriptive |
| `librarian` | `researcher` | Clearer role |
| `frontend-engineer` | `designer` | Better scope |
| `document-writer` | `writer` | Simpler |
| `omco-executor` | `executor` | More professional |
| `multimodal-looker` | `vision` | Clearer capability |
| `metis` | `analyst` | More recognizable |
| `momus` | `critic` | Clearer role |

### Feature Parity Status

| Feature | oh-my-claudecode | OMCO | Status |
|---------|------------------|----------|--------|
| Ultrawork Mode | ✅ | ✅ | ✅ Complete |
| Ralph Loop | ✅ | ✅ | ✅ Complete |
| Keyword Detection | ✅ | ✅ | ✅ Complete |
| Stop Prevention | ✅ | ⚠️ | ⚠️ Limited (no Stop hook) |
| State Persistence | ✅ | ✅ | ✅ Complete |
| Architect Verification | ✅ | ❌ | 🚧 Planned |
| PRD Tracking | ✅ | ✅ | ✅ Complete |
| Notepad System | ✅ | ✅ | ✅ Complete |
| 28 Agent Types | ✅ | ✅ | ✅ Complete |
| Slash Commands | ✅ | ✅ | ✅ Complete |

### Migration Guide

1. **Install OMCO**:
   ```bash
   npm install oh-my-claudecode-opencode
   ```

2. **Update config**:
   - Rename `.claude/OMCO.json` → `.opencode/OMCO.json`
   - Update agent names (oracle → architect, etc.)

3. **Update commands**:
   - `/ultrawork` → `/ultrawork` (same)
   - `/ralph` → `/ralph-loop` (different name)
   - `/ralph-init` → `/ralph-init` (same)

4. **Update agent references**:
   ```typescript
   // Old
   Task({ subagent_type: "oh-my-claudecode:oracle" })

   // New
   Task({ subagent_type: "oh-my-claudecode:architect" })
   ```

## Contributing

### Documentation Standards

1. **Structure**: Follow parent/child hierarchy
2. **Formatting**: Use markdown tables for comparison
3. **Examples**: Include code examples for all features
4. **Updates**: Keep in sync with code changes

### Roadmap Updates

When implementing features:
1. Move from "Planned" to "Implemented"
2. Update status table with ✅
3. Add implementation notes
4. Update test coverage count

### Issue Tracking

Track issues in roadmap:
1. **Problem**: Clear statement
2. **Impact**: User-facing consequences
3. **Comparison**: How oh-my-claudecode handles it
4. **Mitigation**: Current workaround
5. **Resolution**: Long-term fix plan

## Integration Points

- **Source Code**: `/home/calvin/workspace/OMCO/src/` - Documented implementation
- **Tests**: `/home/calvin/workspace/OMCO/tests/` - Test coverage tracking
- **Package**: `/home/calvin/workspace/OMCO/package.json` - Version info

## Future Documentation

### Planned Docs
- **API Reference**: Complete API documentation
- **Examples**: Real-world usage examples
- **Tutorials**: Step-by-step guides
- **Architecture Guide**: Deep dive into design decisions
- **Performance Guide**: Optimization tips
- **Troubleshooting**: Common issues and solutions

### Doc Tools
- **TypeDoc**: Auto-generate API docs from TSDoc comments
- **Mermaid**: Architecture diagrams
- **GitHub Pages**: Host documentation site

## Dependencies

- None (pure markdown documentation)

## Related Documentation

- [Agent System](../src/agents/AGENTS.md) - Agent definitions
- [Config System](../src/config/AGENTS.md) - Configuration reference
- [PRD System](../src/prd/AGENTS.md) - PRD implementation
- [Test Suite](../tests/AGENTS.md) - Test coverage
