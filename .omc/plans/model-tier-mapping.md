# Model Tier Mapping Feature Plan

> **Generated**: 2026-01-26
> **Status**: Ready for Implementation
> **Complexity**: Medium (4-6 hours estimated)

---

## 1. Executive Summary

### Current State
- **ModelResolver exists** (`src/config/model-resolver.ts`) and is well-tested
- **Config schema exists** for `model_mapping.tierDefaults` 
- **Gap**: Runtime tool invocations (`call_omco_agent`, `background_task`) **ignore tier mapping**
- Currently, subagents inherit the parent session's model (e.g., `github-copilot/claude-opus-4.5`) regardless of agent tier

### Desired State
- Users configure tier → provider model mappings in `omco.json`
- Runtime agent invocations respect agent tiers and resolve to configured models
- Enables cost optimization (haiku for explore, opus for architect)

### Key Insight
The infrastructure already exists—this is primarily a **wiring task** to connect `ModelResolver` to the tool invocation paths.

---

## 2. Requirements Summary

### Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | User can configure `model_mapping.tierDefaults` in `omco.json` | Must Have |
| FR2 | `call_omco_agent` tool resolves model from agent tier | Must Have |
| FR3 | `background_task` tool resolves model from agent tier | Must Have |
| FR4 | Per-agent model override in config takes precedence | Must Have |
| FR5 | Debug logging shows resolution path when enabled | Should Have |
| FR6 | Fallback to parent session model if resolution fails | Must Have |

### Non-Functional Requirements
| ID | Requirement | Priority |
|----|-------------|----------|
| NFR1 | No breaking changes to existing config files | Must Have |
| NFR2 | Backward compatible with current behavior | Must Have |
| NFR3 | Minimal performance overhead | Should Have |

---

## 3. Acceptance Criteria (Measurable)

### AC1: Configuration Works
```jsonc
// .opencode/omco.json
{
  "model_mapping": {
    "tierDefaults": {
      "haiku": "github-copilot/claude-haiku-4",
      "sonnet": "github-copilot/claude-sonnet-4", 
      "opus": "github-copilot/claude-opus-4.5"
    },
    "debugLogging": true
  }
}
```
**Verification**: Config loads without errors, values accessible via `loadConfig()`

### AC2: Agent Tier Resolution
- Call `explore` agent (tier: haiku) → uses `github-copilot/claude-haiku-4`
- Call `architect` agent (tier: opus) → uses `github-copilot/claude-opus-4.5`
- Call `executor` agent (tier: sonnet) → uses `github-copilot/claude-sonnet-4`

**Verification**: Run test that spawns each tier and verifies model in session

### AC3: Override Priority
1. Per-agent config model → used first
2. Per-agent config tier → resolved via tierDefaults
3. Agent definition tier → resolved via tierDefaults
4. Fallback → sonnet tier default

**Verification**: Unit tests in `model-resolver.test.ts` pass (existing tests cover this)

### AC4: Background Tasks Use Tier
- `background_task` with agent `explore` → uses haiku model
- `background_task` with agent `architect` → uses opus model

**Verification**: Integration test that runs background task and verifies model used

### AC5: Graceful Fallback
- If tier resolution fails → fall back to parent session model (current behavior)
- If no parent model → use sonnet tier default

**Verification**: Test with missing config, verify fallback works

---

## 4. Implementation Steps

### Phase 1: Plumbing (Connect ModelResolver to Tools)

#### Task 1.1: Create Shared Model Resolution Service
**File**: `src/tools/model-resolution-service.ts` (NEW)

```typescript
// Purpose: Centralized model resolution for tool invocations
// Why: Both call_omco_agent and background_manager need this logic

export interface ModelResolutionService {
  resolveModelForAgent(
    agentName: string,
    fallbackModel?: ModelConfig
  ): ModelConfig | undefined;
}

export function createModelResolutionService(
  config: OmoOmcsConfig
): ModelResolutionService;
```

**Acceptance**: 
- [ ] Service created with clear interface
- [ ] TypeScript compiles without errors

#### Task 1.2: Wire ModelResolver into call_omco_agent
**File**: `src/tools/call-omco-agent.ts`

**Changes**:
1. Import `ModelResolutionService` 
2. Receive service via constructor/factory
3. Before calling `ctx.client.session.prompt()`:
   - Get agent definition to find tier
   - Call `service.resolveModelForAgent(agentName, parentModel)`
   - Use resolved model instead of parent model

**Lines to modify**: ~46-55, ~86-89

**Acceptance**:
- [ ] Agent tier respected in sync calls
- [ ] Fallback to parent model works

#### Task 1.3: Wire ModelResolver into BackgroundManager
**File**: `src/tools/background-manager.ts`

**Changes**:
1. Accept `ModelResolutionService` in factory
2. In `createTask()` (~139-175):
   - Get agent tier from agent definition
   - Resolve model via service
   - Pass resolved model to session.prompt()

**Acceptance**:
- [ ] Agent tier respected in background tasks
- [ ] Fallback works correctly

#### Task 1.4: Update Plugin Entry Point
**File**: `src/index.ts`

**Changes**:
1. Create `ModelResolutionService` during plugin init
2. Pass service to `createBackgroundManager()`
3. Pass service to `createCallOmcoAgent()`

**Acceptance**:
- [ ] Service instantiated with loaded config
- [ ] Both tools receive service instance

### Phase 2: Testing

#### Task 2.1: Add Unit Tests for Model Resolution Service
**File**: `tests/model-resolution-service.test.ts` (NEW)

**Test cases**:
- [ ] Resolves haiku agent to haiku tier model
- [ ] Resolves opus agent to opus tier model  
- [ ] Per-agent override takes precedence
- [ ] Fallback to provided model when resolution fails
- [ ] Fallback to sonnet when no model provided

#### Task 2.2: Update Integration Tests
**File**: `tests/integration.test.ts`

**Test cases**:
- [ ] call_omco_agent uses correct model for explore (haiku)
- [ ] call_omco_agent uses correct model for architect (opus)
- [ ] background_task uses correct model based on agent tier

### Phase 3: Documentation

#### Task 3.1: Update Configuration Documentation
**File**: `README.md` or `docs/configuration.md`

**Content**:
- Example `omco.json` with `model_mapping` section
- Explanation of tier resolution priority
- Common configurations (GitHub Copilot, Claude direct, etc.)

---

## 5. File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/tools/model-resolution-service.ts` | CREATE | Shared model resolution for tools |
| `src/tools/call-omco-agent.ts` | MODIFY | Wire in ModelResolutionService |
| `src/tools/background-manager.ts` | MODIFY | Wire in ModelResolutionService |
| `src/index.ts` | MODIFY | Instantiate and inject service |
| `tests/model-resolution-service.test.ts` | CREATE | Unit tests for new service |
| `tests/integration.test.ts` | MODIFY | Add integration tests |

---

## 6. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing setups without config | Low | High | Fallback to parent model (current behavior) when no config |
| ModelResolver bugs | Low | Medium | Existing tests cover resolver; add new tests for service |
| Provider-specific model names | Medium | Low | Validate format, warn on invalid names (existing behavior) |
| Performance overhead from resolution | Low | Low | Cache resolved models per agent (already implemented) |

---

## 7. Dependencies

### Internal Dependencies
- `ModelResolver` class (exists, well-tested)
- `loadConfig()` function (exists)
- Agent definitions with `model` tier (exists)

### External Dependencies
- None (pure TypeScript changes)

---

## 8. Verification Steps

### Pre-Implementation
1. Run `bun test` - all existing tests pass
2. Run `bun run typecheck` - no type errors
3. Run `bun run build` - builds successfully

### Post-Implementation
1. Run `bun test` - all tests pass including new ones
2. Run `bun run typecheck` - no type errors
3. Run `bun run build` - builds successfully
4. Manual test: Create `omco.json` with tier mappings, verify agent uses correct models

### Acceptance Test Script
```bash
# 1. Build
bun run build

# 2. Type check
bun run typecheck

# 3. Run all tests
bun test

# 4. Verify no regressions
# (manual) Start OpenCode, invoke agents, check logs for model used
```

---

## 9. Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Plumbing | 4 tasks | 2-3 hours |
| Phase 2: Testing | 2 tasks | 1-2 hours |
| Phase 3: Documentation | 1 task | 30 mins |
| **Total** | **7 tasks** | **4-6 hours** |

---

## 10. Open Questions

1. **Q**: Should we support per-invocation model override via tool parameter?
   **Recommendation**: Defer to future enhancement. Current scope: config-based mapping.

2. **Q**: Should debug logging be on by default?
   **Recommendation**: Off by default. Users enable via `model_mapping.debugLogging: true`.

---

**PLAN_READY: .omc/plans/model-tier-mapping.md**
