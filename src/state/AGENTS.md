<!-- Parent: ../AGENTS.md -->

# State Management Module

This module provides persistent state management for omo-omcs modes, including ralph loops, ultrawork sessions, and verification workflows. All state is persisted as JSON files in the `.omc/` directory.

## Porting Context

oh-my-claudecode의 상태 관리 시스템 포팅. .omc/ 디렉토리 구조 동일하게 유지. ralph-state.json, ultrawork-state.json, verification-state.json 등의 상태 파일 형식과 위치가 oh-my-claudecode와 완전히 호환된다. 이는 양 시스템 간 상태 파일 공유를 가능하게 한다.

## Overview

The state module is responsible for:
- **Lifecycle management**: Creating, reading, updating, and clearing state
- **Persistence**: Writing state to disk in `.omc/` directory
- **Session tracking**: Maintaining session IDs and timestamps
- **Mode-specific state**: Ralph iterations, ultrawork activity, verification attempts

## Architecture

### State Files and Locations

| State Type | Filename | Directory | Scope |
|-----------|----------|-----------|-------|
| Ralph | `ralph-state.json` | `.omc/` | Local project |
| Ultrawork | `ultrawork-state.json` | `.omc/` and `~/.opencode/` | Local + global |
| Verification | `ralph-verification.json` | `.omc/` | Local project |

### Persistence Pattern

Each state module follows a consistent pattern:

```
1. Read: Load state from disk (null if not found)
2. Create: Initialize new state with defaults
3. Update: Modify state and persist
4. Write: Persist to disk with JSON formatting
5. Clear: Delete state file
```

## Module Details

### ralph-state.ts

Manages ralph loop execution state across iterations.

**RalphState Interface:**
```typescript
interface RalphState {
  active: boolean;                 // Loop is actively running
  iteration: number;               // Current iteration count
  max_iterations: number;          // Maximum allowed iterations (default: 50)
  completion_promise: string;      // Expected completion marker
  started_at: string;              // ISO timestamp
  prompt: string;                  // Original prompt/task
  session_id: string;              // Unique session identifier
  prd_mode: boolean;               // Using PRD-based mode
  current_story_id: string | null; // Current story being worked on
  last_activity_at: string;        // ISO timestamp of last update
}
```

**Key Functions:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `readRalphState(projectDir)` | Load ralph state from disk | `RalphState \| null` |
| `writeRalphState(projectDir, state)` | Persist ralph state to `.omc/ralph-state.json` | void |
| `clearRalphState(projectDir)` | Delete ralph state file | void |
| `createRalphState(sessionId, prompt, maxIterations?, prdMode?)` | Create new state object | `RalphState` |
| `updateRalphStateIteration(projectDir, state, currentStoryId?)` | Update iteration count and timestamp | void |
| `markRalphStateComplete(projectDir, state)` | Mark loop as inactive and persist | void |

**Usage Example:**
```typescript
// Start new ralph loop
const state = createRalphState(sessionId, "task prompt");
writeRalphState(projectDir, state);

// Update after each iteration
state.iteration++;
updateRalphStateIteration(projectDir, state, storyId);

// Complete the loop
markRalphStateComplete(projectDir, state);
```

**Special Behavior:**
- `last_activity_at` is automatically updated on every state change
- `current_story_id` is optional and only set in story-based workflows
- Default `max_iterations` is 50 to prevent infinite loops

### ultrawork-state.ts

Manages ultrawork session state with dual-location persistence (local + global).

**UltraworkState Interface:**
```typescript
interface UltraworkState {
  active: boolean;            // Session is actively running
  started_at: string;         // ISO timestamp
  original_prompt: string;    // Original ultrawork request
  session_id: string;         // Unique session identifier
  reinforcement_count: number; // Number of reinforcement checks
  last_checked_at: string;    // ISO timestamp of last check
}
```

**Key Functions:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `readUltraworkState(projectDir)` | Load from local or global location | `UltraworkState \| null` |
| `writeUltraworkState(projectDir, state, writeGlobal?)` | Persist to local and optionally global | void |
| `clearUltraworkState(projectDir, clearGlobal?)` | Delete local and optionally global state | void |
| `createUltraworkState(sessionId, originalPrompt)` | Create new state object | `UltraworkState` |
| `updateUltraworkStateChecked(projectDir, state)` | Increment reinforcement count, update timestamp | void |

**Dual-Location Persistence:**
- **Local**: `.omc/ultrawork-state.json` - project-specific state
- **Global**: `~/.opencode/ultrawork-state.json` - cross-session state (optional)

**Read Priority:**
1. Check local state first
2. Fall back to global state if local not found
3. Return null if neither exists

**Usage Example:**
```typescript
// Start new ultrawork session
const state = createUltraworkState(sessionId, "original prompt");
writeUltraworkState(projectDir, state, true); // Write to both local and global

// Track activity
updateUltraworkStateChecked(projectDir, state);

// Clear state
clearUltraworkState(projectDir, true); // Clear both local and global
```

**Special Behavior:**
- `reinforcement_count` increments each time work is checked
- `last_checked_at` is automatically updated on checks
- Global persistence is opt-in to support cross-project ultrawork tracking

### verification-state.ts

Manages completion verification workflow state for ralph loops.

**VerificationState Interface:**
```typescript
interface VerificationState {
  pending: boolean;                  // Awaiting verification result
  original_task: string;             // Original task description
  completion_claim: string;          // What was claimed to be complete
  verification_attempts: number;     // Attempts so far
  max_verification_attempts: number; // Maximum allowed attempts
  oracle_feedback: string | null;    // Feedback from verification
  last_attempt_at: string | null;    // ISO timestamp of last attempt
  session_id: string;                // Links to ralph session
}
```

**Key Functions:**

| Function | Purpose | Returns |
|----------|---------|---------|
| `readVerificationState(projectDir)` | Load verification state from disk | `VerificationState \| null` |
| `writeVerificationState(projectDir, state)` | Persist to `.omc/ralph-verification.json` | void |
| `clearVerificationState(projectDir)` | Delete verification state file | void |
| `createVerificationState(sessionId, originalTask, completionClaim, maxAttempts?)` | Create new state object | `VerificationState` |
| `updateVerificationAttempt(projectDir, state, feedback, approved)` | Update attempt, feedback, and pending status | void |

**Usage Example:**
```typescript
// Start verification
const state = createVerificationState(
  sessionId,
  "original task",
  "claim: feature X is complete",
  3  // max 3 attempts
);
writeVerificationState(projectDir, state);

// Record attempt result
updateVerificationAttempt(projectDir, state, "feedback message", false);

// If approved on next attempt
updateVerificationAttempt(projectDir, state, "approved", true);
// state.pending is now false
```

**Special Behavior:**
- `verification_attempts` increments automatically on each update
- `pending` is set to false only when `approved` is true
- `last_attempt_at` is automatically set on each update
- Default `max_verification_attempts` is 3

## Shared Patterns

### Directory Management
All modules use consistent directory handling:
```typescript
// Local project state
const omcDir = path.join(projectDir, ".omc");
const statePath = path.join(omcDir, STATE_FILENAME);

// Global state (ultrawork only)
const globalDir = path.join(process.env.HOME || "", ".opencode");
```

### Error Handling
All I/O operations include try-catch blocks and log errors:
```typescript
try {
  const state = JSON.parse(content);
  log(`Read state`, { key: value });
} catch (err) {
  log(`Failed to read state`, { error: String(err) });
}
```

### Logging
All state operations are logged via `../shared/logger`:
- Success: "Read state from X", "Wrote state"
- Failure: "Failed to X state", with error details
- Structured: Logs include relevant state fields

## State Lifecycle Examples

### Ralph Loop Lifecycle
```
1. createRalphState() → new state object
2. writeRalphState() → persist to disk
3. Loop:
   - state.iteration++
   - updateRalphStateIteration() → persist
   - ... work happens ...
   - repeat
4. markRalphStateComplete() → set active=false
5. clearRalphState() → optional cleanup
```

### Verification Lifecycle
```
1. createVerificationState() → new state object
2. writeVerificationState() → persist
3. Loop:
   - ... verification work ...
   - updateVerificationAttempt(feedback, approved)
   - if approved: state.pending = false, exit
   - if !approved && attempts < max: retry
   - if !approved && attempts >= max: exit
4. clearVerificationState() → cleanup
```

## Integration Points

- **Logger**: All modules import `../shared/logger` for logging
- **File System**: Standard `fs` and `path` modules
- **JSON**: State is plain JSON, language-agnostic
- **Session IDs**: Unique identifiers linking state across modules

## Index Exports

The module exports all types and functions via `index.ts`:

```typescript
// Ralph state
export type RalphState
export { readRalphState, writeRalphState, clearRalphState, createRalphState, ... }

// Ultrawork state
export type UltraworkState
export { readUltraworkState, writeUltraworkState, clearUltraworkState, ... }

// Verification state
export type VerificationState
export { readVerificationState, writeVerificationState, clearVerificationState, ... }
```

## Common Tasks for AI Agents

### Reading Current State
```typescript
import { readRalphState } from "@/state";

const state = readRalphState(projectDir);
if (state?.active) {
  console.log(`Ralph iteration ${state.iteration}/${state.max_iterations}`);
}
```

### Starting a New Session
```typescript
import { createRalphState, writeRalphState } from "@/state";
import { v4 as uuid } from "uuid";

const sessionId = uuid();
const state = createRalphState(sessionId, userPrompt, 50, true);
writeRalphState(projectDir, state);
```

### Updating After Work
```typescript
state.iteration++;
updateRalphStateIteration(projectDir, state, storyId);
```

### Completing Session
```typescript
markRalphStateComplete(projectDir, state);
clearRalphState(projectDir); // Optional
```

## State File Formats

### ralph-state.json
```json
{
  "active": true,
  "iteration": 5,
  "max_iterations": 50,
  "completion_promise": "<promise>TASK_COMPLETE</promise>",
  "started_at": "2025-01-22T10:30:00.000Z",
  "prompt": "Build a feature",
  "session_id": "uuid-string",
  "prd_mode": true,
  "current_story_id": "story-123",
  "last_activity_at": "2025-01-22T10:35:00.000Z"
}
```

### ultrawork-state.json
```json
{
  "active": true,
  "started_at": "2025-01-22T10:30:00.000Z",
  "original_prompt": "fix all errors fast",
  "session_id": "uuid-string",
  "reinforcement_count": 3,
  "last_checked_at": "2025-01-22T10:35:00.000Z"
}
```

### ralph-verification.json
```json
{
  "pending": true,
  "original_task": "Build a feature",
  "completion_claim": "Feature implementation complete",
  "verification_attempts": 1,
  "max_verification_attempts": 3,
  "oracle_feedback": "Needs unit tests",
  "last_attempt_at": "2025-01-22T10:35:00.000Z",
  "session_id": "uuid-string"
}
```
