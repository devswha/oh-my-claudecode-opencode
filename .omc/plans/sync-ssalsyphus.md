# Synchronization Plan: omo-omcs to oh-my-claudecode v3.0.11

## Executive Summary

This plan outlines the synchronization of **omo-omcs** (OpenCode port) with **oh-my-claudecode v3.0.11** (Claude Code original). The goal is to bring feature parity where feasible, while respecting platform differences between OpenCode's plugin API and Claude Code's hook system.

### Verified Facts (Critic-Reviewed)

| Category | omc v3.0.11 | omo-omcs Current | Gap |
|----------|-------------|------------------|-----|
| Unique Agents | 21 | 19 | 2 missing |
| Skills/Commands | 26 skills | 14 commands | 12 missing |
| Hooks | 5 event types | 3 event types | Platform limitation |
| Infrastructure | Shell hooks + TS | Native TS plugin | Architectural diff |

### Missing Agents (Verified)

| Agent | Source File | Status |
|-------|-------------|--------|
| `coordinator` | `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/src/agents/coordinator.ts` | **MISSING in omo-omcs** |
| `qa-tester-high` | `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/src/agents/definitions.ts` (lines 174-313) | **MISSING in omo-omcs** |

### Platform Constraints

| omc Feature | OpenCode Equivalent | Status |
|-------------|---------------------|--------|
| Stop hook (proactive) | session.idle (reactive) | Cannot be fully replicated |
| PreToolUse/PostToolUse | tool.execute.before/after | Available |
| SessionStart | Plugin init | Available |
| UserPromptSubmit | chat.message | Available |
| Skill tool | Commands + prompts | Partial (no skill composition) |

---

## Phase 0 (P0): Missing Agents

**Priority**: High
**Effort**: 1-2 hours
**Value**: High - Complete agent parity with omc

### P0.1: Add coordinator Agent

**Source**: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/src/agents/coordinator.ts`
**Target**: `/home/calvin/workspace/omo-omcs/src/agents/index.ts`

The coordinator agent is the master orchestrator (Sisyphus) with specific prompt metadata and todo management capabilities.

**Tasks**:
1. [ ] Port `coordinatorAgent` definition from omc coordinator.ts
2. [ ] Add to agent registry in index.ts
3. [ ] Register with alias "coordinator" in agents record

**Acceptance Criteria**:
- `getAgent("coordinator")` returns valid agent
- Agent has Opus model and orchestration-focused prompt
- Prompt includes todo management and delegation guidelines

### P0.2: Add qa-tester-high Agent

**Source**: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/src/agents/definitions.ts` (lines 174-313)
**Target**: `/home/calvin/workspace/omo-omcs/src/agents/index.ts`

The qa-tester-high agent is the Opus-tier QA specialist for comprehensive production testing.

**Tasks**:
1. [ ] Port `qaTesterHighAgent` definition from omc definitions.ts
2. [ ] Add to agent registry in index.ts
3. [ ] Add to primaryNames list in listAgents()

**Acceptance Criteria**:
- `getAgent("qa-tester-high")` returns valid agent
- Agent has Opus model and comprehensive QA prompt
- Includes security testing, edge case, and production-readiness sections

---

## Phase 1 (P1): Missing Skills/Commands

**Priority**: High
**Effort**: 4-6 hours
**Value**: High - Core functionality gaps

### omc Skills vs omo-omcs Commands Comparison

**Present in omo-omcs** (14 commands):
- ultrawork, ralph-loop (ralph), ultrawork-ralph
- deepsearch, analyze
- update-ssalsyphus, doctor
- cancel-ralph, cancel-ultraqa, ultraqa
- ralplan, plan, review

**Missing in omo-omcs** (12 skills from omc):
| Skill | Type | Priority | Notes |
|-------|------|----------|-------|
| `note` | Command | High | Save to notepad memory |
| `help` | Command | High | Show usage guide |
| `learner` | Command | Medium | Extract learned skill from session |
| `deepinit` | Command | Medium | Generate AGENTS.md hierarchy |
| `ralph-init` | Command | Medium | Initialize PRD for structured ralph |
| `release` | Command | Low | Automated npm release workflow |
| `hud` | Command | Low | Configure HUD statusline (may not apply) |
| `frontend-ui-ux` | Silent Activation | Medium | Auto-inject on UI context |
| `git-master` | Silent Activation | Medium | Auto-inject on git context |
| `orchestrate` | Core Behavior | High | Core Ssalsyphus behavior |
| `omc-default` | Setup | Low | Configure local project |
| `omc-default-global` | Setup | Low | Configure global settings |
| `omc-setup` | Setup | Low | One-time setup wizard |

### P1.1: Add High-Priority Commands

**File**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/config-handler.ts`

**Tasks**:
1. [ ] Add `/note` command template
   - Source: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/note/SKILL.md`
2. [ ] Add `/help` command template
   - Source: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/help/SKILL.md`

**Acceptance Criteria**:
- Commands registered and invocable
- Templates match omc v3.0.11 behavior

### P1.2: Add Medium-Priority Commands

**File**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/config-handler.ts`

**Tasks**:
1. [ ] Add `/learner` command template
   - Source: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/learner/SKILL.md`
2. [ ] Add `/deepinit` command template
   - Source: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/deepinit/SKILL.md`
3. [ ] Add `/ralph-init` command template
   - Source: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/ralph-init/SKILL.md`

**Acceptance Criteria**:
- Commands registered and invocable
- Templates preserve omc skill semantics

### P1.3: Silent Skill Activation

**New File**: `/home/calvin/workspace/omo-omcs/src/hooks/skill-injector.ts`

These skills auto-activate based on context without explicit invocation.

**Tasks**:
1. [ ] Create skill detection logic in `chat.message` hook
2. [ ] Detect UI/frontend context -> inject frontend-ui-ux prompt
   - Source: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/frontend-ui-ux/SKILL.md`
3. [ ] Detect git/commit context -> inject git-master prompt
   - Source: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/git-master/SKILL.md`

**Acceptance Criteria**:
- When user mentions UI/component work, frontend-ui-ux guidelines injected
- When user mentions commits/git, git-master guidelines injected
- No manual invocation required

---

## Phase 2 (P2): Enhanced Infrastructure

**Priority**: Medium
**Effort**: 3-4 hours
**Value**: Medium - Quality of life improvements

### P2.1: Orchestrate Skill Enhancement

**File**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/config-handler.ts`

The `orchestrate` skill from omc defines core Ssalsyphus behavior more comprehensively than the current Ssalsyphus prompt.

**Source**: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/orchestrate/SKILL.md`

**Tasks**:
1. [ ] Port full orchestrate SKILL.md content to Ssalsyphus agent prompt
2. [ ] Add Phase 0 (Intent Gate) logic
3. [ ] Add Phase 1 (Codebase Assessment) guidelines
4. [ ] Add Phase 2A/2B/2C (Exploration/Implementation/Recovery)
5. [ ] Add Phase 3 (Completion with Architect verification)

**Acceptance Criteria**:
- Ssalsyphus agent prompt matches omc orchestrate skill
- Mandatory Architect verification before completion documented
- Failure recovery protocol included

### P2.2: Learner System (Mnemosyne)

**New File**: `/home/calvin/workspace/omo-omcs/src/skills/learner.ts`

**Source**: `/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/skills/learner/SKILL.md`

**Tasks**:
1. [ ] Create skill file structure (`.omc/skills/`)
2. [ ] Implement skill extraction workflow
3. [ ] Add quality validation (non-Googleable, context-specific)
4. [ ] Integrate with notepad system
5. [ ] Create `/learner` command handler

**Acceptance Criteria**:
- Skills saved to `.omc/skills/{skill-name}.md`
- Quality gates prevent generic skills
- Skills have proper YAML frontmatter

---

## Phase 3 (P3): Platform-Specific Features

**Priority**: Low
**Effort**: 2-4 hours
**Value**: Low to Medium - Nice to have

### P3.1: HUD Statusline

**Status**: SKIP

OpenCode uses a different UI paradigm. The HUD statusline is specific to Claude Code's terminal interface. This feature cannot be ported.

### P3.2: Release Workflow

**Status**: DEFER

The `/release` command is specific to omc's npm publishing workflow. Consider creating an omo-omcs-specific release command if needed.

### P3.3: Setup Commands

**Status**: DEFER

The omc-setup, omc-default, omc-default-global commands are specific to omc's shell-based configuration. OpenCode uses a different configuration approach via `plugins.json`.

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OpenCode API changes | Medium | High | Pin to specific @opencode-ai/plugin version |
| Stop hook never available | High | Medium | Continue with session.idle approach |
| Skill composition not supported | High | Low | Use command chaining instead |
| Agent prompt drift | Medium | Medium | Regular sync checks with omc |

---

## Implementation Order

```
Day 1 (2-3h):
  P0.1: Add coordinator agent [30min]
  P0.2: Add qa-tester-high agent [30min]
  P1.1: Add /note and /help commands [1-2h]

Day 2 (3-4h):
  P1.2: Add /learner, /deepinit, /ralph-init commands [2-3h]
  P1.3: Silent skill activation [1-2h]

Day 3 (3-4h):
  P2.1: Orchestrate skill enhancement [2-3h]
  Testing & documentation [1-2h]
```

---

## Success Criteria

### Phase 0 Complete
- [ ] All 21 agents available (matching omc)
- [ ] coordinator and qa-tester-high functional

### Phase 1 Complete
- [ ] /note, /help commands available
- [ ] /learner, /deepinit, /ralph-init commands available
- [ ] Silent skill activation working for frontend-ui-ux and git-master

### Phase 2 Complete
- [ ] Orchestrate behavior matches omc
- [ ] Ssalsyphus prompt includes full orchestration protocol

---

## Files Changed

### New Files
- `/home/calvin/workspace/omo-omcs/src/hooks/skill-injector.ts`

### Modified Files
- `/home/calvin/workspace/omo-omcs/src/agents/index.ts` (add 2 agents: coordinator, qa-tester-high)
- `/home/calvin/workspace/omo-omcs/src/plugin-handlers/config-handler.ts` (add 5 commands, enhance Ssalsyphus prompt)
- `/home/calvin/workspace/omo-omcs/src/index.ts` (register skill-injector hook)
- `/home/calvin/workspace/omo-omcs/README.md` (update feature list)

---

## Reference

### Source Repository
`/home/calvin/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/`

### Key Source Files
- `src/agents/coordinator.ts` - Coordinator agent definition
- `src/agents/definitions.ts` - Tiered agents including qa-tester-high
- `skills/*/SKILL.md` - Skill definitions
- `skills/orchestrate/SKILL.md` - Core orchestration behavior

### Agent Count Verification
- **omc unique agents**: 21 (12 base + 9 tiered)
  - architect, architect-medium, architect-low
  - executor, executor-high, executor-low
  - explore, explore-medium
  - researcher, researcher-low
  - designer, designer-low, designer-high
  - writer
  - qa-tester, qa-tester-high
  - planner, analyst, critic, vision
  - coordinator
- **omo-omcs current**: 19 (missing coordinator, qa-tester-high)

---

*Plan revised: 2026-01-21*
*Revision reason: Critic feedback - corrected agent counts and removed non-existent agents*
*Target: Feature parity with oh-my-claudecode v3.0.11*
