# omo-omcs Future Roadmap

> Created: 2026-01-21
> Status: Planning

## Current State (v0.1.11)

### Completed Features
- ✅ 21 agents synced with omc v3.0.11
- ✅ 19 slash commands
- ✅ Silent skill activation (frontend-ui-ux, git-master)
- ✅ Ralph-loop with auto-ultrawork
- ✅ Ssalsyphus orchestrator with full orchestrate protocol
- ✅ System prompt injection via `experimental.chat.system.transform`

---

## Phase 1: Quality & Stability

**Priority**: High
**Target**: v0.2.0

### 1.1 Testing Infrastructure
- [ ] Add unit tests for skill-injector.ts
- [ ] Add unit tests for agent registration
- [ ] Add integration tests for ralph-loop
- [ ] Setup test runner (vitest or bun:test)
- [ ] Add CI/CD pipeline for automated testing

### 1.2 Error Handling
- [ ] Add try/catch in skill detection
- [ ] Graceful degradation when hooks fail
- [ ] Better logging with log levels (debug/info/warn/error)

### 1.3 Documentation
- [ ] Update README with new features
- [ ] Add CHANGELOG.md
- [ ] Document agent capabilities
- [ ] Document command usage examples

---

## Phase 2: Feature Enhancements

**Priority**: Medium
**Target**: v0.3.0

### 2.1 Learner System (Mnemosyne) - Full Implementation
Currently: Command template only
Target: Full skill extraction workflow

- [ ] Create `.omc/skills/` directory structure
- [ ] Implement skill extraction logic
- [ ] Add quality validation (non-Googleable, context-specific)
- [ ] YAML frontmatter generation
- [ ] Skill loading on session start

### 2.2 Enhanced Notepad System
- [ ] Auto-prune entries older than 7 days
- [ ] Priority context injection on session start
- [ ] Character limit enforcement (500 chars for priority)
- [ ] `/note --show`, `/note --prune`, `/note --clear` functionality

### 2.3 Skill Composition
- [ ] Allow combining multiple skills
- [ ] Skill dependency resolution
- [ ] Skill version management

---

## Phase 3: Platform-Specific Features

**Priority**: Low
**Target**: v0.4.0

### 3.1 OpenCode-Specific Optimizations
- [ ] Better integration with OpenCode's agent system
- [ ] Custom UI indicators for active modes
- [ ] Performance profiling and optimization

### 3.2 Persistent Mode Improvements
- [ ] Save/restore session state across restarts
- [ ] Resume interrupted ralph-loops
- [ ] Background task persistence

### 3.3 Advanced Orchestration
- [ ] Multi-agent coordination
- [ ] Task queuing system
- [ ] Priority-based task scheduling

---

## Phase 4: Ecosystem Integration

**Priority**: Low
**Target**: v0.5.0

### 4.1 MCP Server Integration
- [ ] Expose agents as MCP tools
- [ ] Allow external skill registration
- [ ] MCP-based skill marketplace

### 4.2 Plugin Interoperability
- [ ] Define plugin communication protocol
- [ ] Allow plugin chaining
- [ ] Shared state management

---

## Deferred / Not Planned

These features from omc v3.0.11 are **intentionally not ported**:

| Feature | Reason |
|---------|--------|
| HUD statusline | OpenCode has different UI paradigm |
| /release command | omc-specific npm publishing workflow |
| /omc-setup | Platform-specific shell configuration |
| /omc-default | Platform-specific local config |
| /omc-default-global | Platform-specific global config |

---

## Version Milestones

| Version | Target | Key Features |
|---------|--------|--------------|
| v0.2.0 | Testing & Stability | Unit tests, CI/CD, better error handling |
| v0.3.0 | Feature Complete | Learner system, enhanced notepad |
| v0.4.0 | Platform Optimized | OpenCode-specific features |
| v0.5.0 | Ecosystem Ready | MCP integration, plugin interop |

---

## Contributing

1. Pick an item from the roadmap
2. Create a branch: `feat/item-name`
3. Implement with tests
4. Submit PR with description referencing this roadmap

---

## Reference

- omc v3.0.11 source: `~/.claude/plugins/cache/oh-my-claude-sisyphus/oh-my-claudecode/3.0.11/`
- Sync plan: `.omc/plans/sync-ssalsyphus.md`
- Plugin API: `@opencode-ai/plugin`
