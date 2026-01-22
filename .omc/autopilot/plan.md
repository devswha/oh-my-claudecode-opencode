# Implementation Plan for omo-omcs v0.2.0

## Execution Order

### Group 1 (Parallel - No Dependencies)
- 2a.1: src/agents/scientist.ts
- 2b.1: src/state/autopilot-state.ts
- 2b.2: src/state/ultraqa-state.ts
- 2b.6: src/hooks/context-recovery.ts
- 2b.7: src/hooks/edit-error-recovery.ts
- 2b.8: src/hooks/omc-orchestrator.ts
- 2d.1: src/config/index.ts (schema updates)

### Group 2 (After Group 1)
- 2a.3: src/agents/index.ts (add scientist)
- 2b.3: src/state/index.ts (export new states)

### Group 3 (After Group 2)
- 2b.4: src/hooks/autopilot.ts
- 2b.5: src/hooks/ultraqa-loop.ts

### Group 4 (After Group 3)
- 2b.9: src/hooks/index.ts

### Group 5 (After Group 4)
- 2d.2: src/index.ts (wire hooks)

### Group 6 (Tests)
- 2e.1: tests/autopilot.test.ts
- 2e.2: tests/ultraqa.test.ts
- 2e.3: tests/scientist.test.ts

### Final
- 2d.3: package.json version bump

## Files Summary

### New Files (11)
- src/agents/scientist.ts
- src/state/autopilot-state.ts
- src/state/ultraqa-state.ts
- src/hooks/autopilot.ts
- src/hooks/ultraqa-loop.ts
- src/hooks/context-recovery.ts
- src/hooks/edit-error-recovery.ts
- src/hooks/omc-orchestrator.ts
- tests/autopilot.test.ts
- tests/ultraqa.test.ts
- tests/scientist.test.ts

### Modified Files (5)
- src/agents/index.ts
- src/state/index.ts
- src/hooks/index.ts
- src/config/index.ts
- src/index.ts
- package.json

**PLANNING_COMPLETE**
