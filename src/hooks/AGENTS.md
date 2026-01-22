<!-- Parent: ../AGENTS.md -->

# Hooks - Plugin Event Handlers

Hooks implement reactive behaviors through event handlers and specialized memory systems. They transform high-level intentions (ralph loops, ultrawork mode, persistence) into practical execution strategies.

## Porting Context

oh-my-claudecode의 shell hooks를 OpenCode의 이벤트 기반 훅으로 변환. stop hook 대신 session.idle 이벤트 사용. oh-my-claudecode의 claude-code 플러그인 이벤트 시스템이 OpenCode 플러그인 이벤트 시스템으로 포팅되었다. 핵심 차이점은 Stop hook이 OpenCode에 존재하지 않아 session.idle 기반의 반응형 패턴을 사용한다는 점이다.

## Architecture Overview

```
Client Events (session.idle, message.created, chat.message)
    ↓
Event Router (src/index.ts)
    ↓
Hooks (event handlers)
    ├─ ralph-loop.ts → Manages completion loops with PRD tracking
    ├─ persistent-mode.ts → Unified continuation handler
    ├─ keyword-detector.ts → Detects mode keywords
    ├─ system-prompt-injector.ts → Injects context-aware system prompts
    ├─ skill-injector.ts → Auto-detects UI/Git context and injects skill prompts
    ├─ todo-continuation-enforcer.ts → Reminds agent to complete pending TODOs
    ├─ remember-tag-processor.ts → Saves <remember> tags to notepad
    ├─ notepad.ts → Three-tier memory system (Priority/Working/Manual)
    ├─ session-recovery.ts → Handles recoverable errors
    ├─ agent-usage-reminder.ts → Encourages specialized agent delegation
    ├─ continuation-messages.ts → Varied messages to prevent pattern fatigue
    └─ ralph-verifier.ts → Verifies completion claims with Oracle
```

## Core Hooks

### ralph-loop.ts
**Purpose**: Self-referential completion loop with PRD-based task tracking

**Key Exports**:
- `createRalphLoopHook(ctx, options)` - Hook factory
- `PRD`, `UserStory` - Type re-exports from PRD manager

**Functionality**:
- Starts completion loops on explicit `/ralph-loop` or `/ultrawork-ralph` commands
- Tracks iterations and enforces max iterations limit (default: 50)
- Manages PRD (Product Requirements Document) for structured task tracking
- Continues on `session.idle` by injecting varied continuation prompts
- Detects `<promise>TASK_COMPLETE</promise>` to terminate loop
- Persists state to `.omc/ralph-state.json` for cross-session recovery
- Shows toast notifications at key events (start, progress, completion)

**Interface**:
```typescript
startLoop(sessionID, prompt, opts?: { maxIterations?, mode? }): boolean
cancelLoop(sessionID): boolean
getState(sessionID?): RalphLoopState | null
event(input): Promise<void>
readPrd(): PRD | null
writePrd(prd): void
checkCompletionInContent(content): boolean
```

**Events Handled**:
- `session.idle` - Increments iteration, injects continuation
- `message.updated/created` - Detects completion promise
- `session.deleted` - Cleanup

**Notes**:
- Works with `persistent-mode.ts` (persistent-mode has priority, ralph-loop handled separately)
- Integrates with PRD manager for structured task tracking
- Uses completion promises as "escape hatch" from loop

---

### persistent-mode.ts
**Purpose**: Unified handler for ralph-loop, ultrawork, and todo-continuation persistence

**Key Exports**:
- `createPersistentModeHook(ctx, options)` - Hook factory
- `checkPersistentModes(ctx, sessionId, options)` - Main check function (async)
- `resetTodoContinuationAttempts(sessionId)` - Reset attempt counter

**Functionality**:
- Checks persistent modes in priority order: Ralph Loop > Ultrawork > Todo Continuation
- Prevents infinite loops with max todo-continuation attempts (default: 5)
- Returns `PersistentModeResult` with action to take
- Optionally injects notepad context before continuation messages
- Tracks todo-continuation attempt counts per session

**Interfaces**:
```typescript
PersistentModeResult {
  shouldContinue: boolean
  message: string
  mode: "ralph-loop" | "ultrawork" | "todo-continuation" | "none"
  metadata?: { todoCount?, iteration?, reinforcementCount?, ... }
}

PersistentModeOptions {
  maxTodoContinuationAttempts?: number
  injectNotepadContext?: boolean
  pruneOnStart?: boolean
}
```

**Check Functions**:
- `checkRalphLoop()` - Active ralph loop with incomplete promise
- `checkUltrawork()` - Active ultrawork with pending todos
- `checkTodoContinuation()` - Any pending todos (fallback)

**Notes**:
- Used in `session.idle` event in src/index.ts
- Complements ralph-loop.ts (separate concerns)
- Integrates with notepad.ts for context injection

---

### keyword-detector.ts
**Purpose**: Detects mode-activation keywords in user messages

**Key Exports**:
- `createKeywordDetectorHook(ctx, options)` - Hook factory

**Functionality**:
- Listens to `chat.message` hook
- Detects keywords: `ultrawork/ulw/uw`, `deepsearch/search/find`, `analyze/investigate`
- Triggers mode callbacks without modifying plugin behavior directly
- Extracts clean task from prompt (removes keywords and commands)
- Shows toast notifications on activation

**Keywords**:
- **Ultrawork**: "ultrawork", "ulw", "uw"
- **Search**: "deepsearch", "search", "find"
- **Analyze**: "analyze", "investigate"

**Behavior**:
- `/ultrawork-ralph` → Triggers "ultrawork-ralph" mode with intensity prompt
- `/ralph-loop` → Triggers "ralph-loop" mode
- `/ultrawork` or `ultrawork:` → Triggers "ultrawork" mode with performance prompt
- Keywords alone → Appends context reminders to output

**Notes**:
- Used primarily for explicit command activation
- Callback notifies system-prompt-injector for mode tracking
- Cleans code blocks from text before keyword matching

---

### system-prompt-injector.ts
**Purpose**: Injects mode-specific and skill-specific system prompts

**Key Exports**:
- `createSystemPromptInjector(ctx)` - Hook factory
- `ActiveMode` - Type union: "ultrawork" | "ralph-loop" | "ultrawork-ralph" | null

**Functionality**:
- Tracks active mode per session
- Tracks skill injections (frontend-ui-ux, git-master)
- Hooks `experimental.chat.system.transform` to inject prompts
- Manages mode state transitions

**Interface**:
```typescript
setMode(sessionID, mode, task?): void
getMode(sessionID): ModeState | undefined
clearMode(sessionID): void
getSystemPromptForMode(mode): string | null
setSkillInjection(sessionID, injection): void
getSkillInjection(sessionID): SkillInjection | undefined
clearSkillInjection(sessionID): void
experimental.chat.system.transform(input, output): Promise<void>
```

**Mode Prompts**:
- `ULTRAWORK_SYSTEM_PROMPT` - Emphasizes parallelism, delegation, background tasks
- `RALPH_LOOP_SYSTEM_PROMPT` - Emphasizes completion guarantees, PRD tracking
- `ULTRAWORK_RALPH_SYSTEM_PROMPT` - Combined intensity and completion

**Notes**:
- Uses prompts from `src/prompts/ultrawork.ts`
- Wired into chat pipeline before model inference
- Works with skill-injector.ts for compound context

---

### skill-injector.ts
**Purpose**: Auto-detects specialized context and injects skill prompts

**Key Exports**:
- `createSkillInjector(ctx)` - Hook factory
- `SkillInjection` - Interface for skill prompt injection

**Functionality**:
- Listens to `chat.message` hook output
- Detects frontend/UI keywords → Injects `FRONTEND_SKILL_PROMPT`
- Detects git keywords → Injects `GIT_SKILL_PROMPT`
- Priority: Git > Frontend (git detection is more specific)
- Returns detection result without modifying behavior

**Skills**:
- **frontend-ui-ux**: For UI components, styling, design work
  - Reminds about distinctive fonts, cohesive color palettes, micro-interactions
  - Discourages generic design patterns

- **git-master**: For git/commit work
  - Hard rule: 3+ files → 2+ commits, 5+ files → 3+ commits, etc.
  - Auto-detects commit style (semantic vs plain vs short)
  - Detects language (Korean vs English)
  - Enforces safe rebasing practices

**Keywords**:
- **Frontend**: ui, component, frontend, css, styling, layout, design, button, form, modal, tailwind, react, vue, angular, styled, animation, responsive, mobile, desktop, theme, color, font, typography, spacing, margin, padding, gradient, shadow, border, hover, focus, dark mode, light mode
- **Git**: commit, git, push, pull, branch, merge, rebase, pr, pull request, cherry-pick, stash, diff, log, checkout, reset, blame, bisect, amend, squash, history, remote, origin

**Notes**:
- Silent activation (doesn't announce unless explicitly using modes)
- Works with system-prompt-injector.ts
- Can be combined with ralph-loop or ultrawork modes

---

### todo-continuation-enforcer.ts
**Purpose**: Reminds agent to complete pending TODO items

**Key Exports**:
- `createTodoContinuationEnforcer(ctx, options)` - Hook factory
- Returns: `{ handler, markRecovering, markRecoveryComplete }`

**Functionality**:
- Listens to `session.idle` events
- Checks for pending/incomplete TODO items
- Starts adaptive countdown (default: 2 seconds) before injecting continuation
- Skips countdown if completion > 90% or task is in_progress
- Prevents injection if background tasks are running
- Shows countdown toast notifications
- Rotates through 5 varied continuation messages to prevent pattern fatigue

**Options**:
```typescript
TodoContinuationEnforcerOptions {
  backgroundManager?: BackgroundManager
  countdownSeconds?: number  // default: 2
  skipCountdownAbovePercent?: number  // default: 90
  adaptiveCountdown?: boolean  // default: true
}
```

**Adaptive Countdown Logic**:
- Skips if >90% complete
- Reduces countdown if rapid consecutive idles (agent clearly working)
- Reduces countdown if in_progress task detected
- Uses 5 varied message templates to prevent pattern matching

**Events Handled**:
- `session.idle` - Injects continuation with countdown
- `session.error` - Handles abort errors
- `message.updated/created` - Cancels countdown
- `tool.execute.before/after` - Cancels countdown
- `session.deleted` - Cleanup

**Notes**:
- Works alongside persistent-mode.ts and ralph-loop.ts
- Used in src/index.ts as primary continuation handler
- Tracks consecutive idle events for smarter detection

---

### remember-tag-processor.ts
**Purpose**: Processes `<remember>` tags from tool output for compaction-resilient memory

**Key Exports**:
- `createRememberTagProcessor(ctx, options)` - Hook factory
- `extractRememberTags(content)` - Extract tags from arbitrary content
- `formatRememberTag(content, priority?)` - Format content as remember tag

**Functionality**:
- Listens to `tool.execute.after` events
- Extracts and processes `<remember>` and `<remember priority>` tags
- Saves regular tags to Working Memory (auto-pruned after 7 days)
- Saves priority tags to Priority Context (always loaded, max 500 chars)
- Shows success toast when tags processed

**Tag Formats**:
```
<remember>content</remember> → Working Memory
<remember priority>content</remember> → Priority Context
```

**Options**:
```typescript
RememberTagProcessorOptions {
  taskToolOnly?: boolean  // default: true (only process Task tool)
  toolNames?: string[]  // Tools to process (ignored if taskToolOnly=true)
}
```

**Default Tools**: "Task", "task", "call_omo_agent"

**Notes**:
- Integrates with notepad.ts for persistence
- Prevents message compaction from losing critical insights
- Used for "living memory" that survives context compaction

---

### notepad.ts
**Purpose**: Three-tier compaction-resilient memory system

**Key Exports**:
- File operations: `initNotepad`, `readNotepad`, `getNotepadPath`
- Section access: `getPriorityContext`, `getWorkingMemory`, `getManualSection`
- Section updates: `setPriorityContext`, `addWorkingMemoryEntry`, `addManualEntry`
- Utilities: `pruneOldEntries`, `getNotepadStats`, `formatNotepadContext`, `formatFullNotepad`
- Tag processing: `processRememberTags`
- Constants: `NOTEPAD_FILENAME`, `PRIORITY_HEADER`, `WORKING_MEMORY_HEADER`, `MANUAL_HEADER`

**Functionality**:
- Manages `.omc/notepad.md` with three sections
- Priority Context: Always injected, max 500 chars, critical discoveries only
- Working Memory: Timestamped entries, auto-pruned after 7 days
- MANUAL: User content, never auto-pruned
- Extracts/replaces sections using regex
- Preserves section comments and formatting

**File Format**:
```markdown
# Notepad
<!-- Auto-managed. Manual edits preserved in MANUAL section. -->

## Priority Context
<!-- ALWAYS loaded. Keep under 500 chars. -->

## Working Memory
<!-- Session notes. Auto-pruned after 7 days. -->

## MANUAL
<!-- User content. Never auto-pruned. -->
```

**Interfaces**:
```typescript
NotepadConfig {
  priorityMaxChars: number  // default: 500
  workingMemoryDays: number  // default: 7
  maxTotalSize: number  // default: 8192 bytes
}

NotepadStats {
  exists: boolean
  totalSize: number
  prioritySize: number
  workingMemoryEntries: number
  oldestEntry: string | null
}
```

**Timestamp Format**: YYYY-MM-DD HH:MM (ISO 8601)

**Pruning**:
- `pruneOldEntries(directory, daysOld?)` - Remove old Working Memory entries
- Returns: `{ pruned: number, remaining: number }`

**Notes**:
- Auto-creates `.omc` directory if missing
- Used by remember-tag-processor.ts
- Injected into continuation prompts via persistent-mode.ts
- Survives message compaction by file-based persistence

---

### session-recovery.ts
**Purpose**: Handles recoverable errors and session recovery

**Key Exports**:
- `createSessionRecoveryHook(ctx)` - Hook factory

**Functionality**:
- Detects recoverable errors: MessageAbortedError, AbortError, ThinkingBlockError, EmptyMessageError
- Registers callbacks for abort and recovery completion
- Attempts recovery by injecting "continue" prompt
- Logs all recovery attempts and outcomes

**Interface**:
```typescript
setOnAbortCallback(cb: (sessionID) => void): void
setOnRecoveryCompleteCallback(cb: (sessionID) => void): void
isRecoverableError(error): boolean
handleSessionRecovery(messageInfo): Promise<boolean>
```

**Recoverable Errors**:
- "MessageAbortedError"
- "AbortError"
- "ThinkingBlockError"
- "EmptyMessageError"

**Notes**:
- Currently wired in config-handler.ts but not in main event loop
- Can be integrated into session error handling pipeline
- Provides callbacks for state synchronization

---

### agent-usage-reminder.ts
**Purpose**: Encourages using specialized agents instead of direct tool calls

**Key Exports**:
- `createAgentUsageReminderHook(ctx)` - Hook factory

**Functionality**:
- Listens to `tool.execute.after` events
- Detects search/fetch tools: grep, glob, read, webfetch
- Appends reminder message suggesting background_task with agents
- Promotes parallel background execution over sequential tool calls

**Message Content**:
- Recommends background_task with explore/researcher agents
- Explains benefits: deeper searches, parallelism, domain expertise
- Shows example usage with multiple background tasks

**Search Tools**: grep, glob, read, webfetch

**Notes**:
- Non-intrusive (just appends reminder)
- Educational reminder, not enforcement
- Not currently wired in src/index.ts (can be added to event handler)

---

### continuation-messages.ts
**Purpose**: Provides varied continuation messages to prevent pattern fatigue

**Key Exports**:
- `getContinuationMessage(context)` - Select varied message
- `getProgressSummary(context)` - Progress display
- `getToastMessage(context)` - Short notification
- `ContinuationContext` - Interface for message context

**Functionality**:
- Maintains 5 message variants per mode to prevent repetition
- Rotates based on iteration number (deterministic) or randomly
- Appends progress status and next task hints
- Supports different modes with distinct messaging

**Message Pools**:
- **TODO_CONTINUATION_MESSAGES** (5 variants): "System Reminder", "Boulder Never Stops", "Sisyphus Reminder", "Continuation Required", "Task Persistence Active"
- **RALPH_CONTINUATION_MESSAGES** (5 variants): "Ralph Loop Continuation", "The Promise Binds You", "Persistence Required", "Continue or Verify", "Sisyphean Persistence"
- **ULTRAWORK_RALPH_MESSAGES** (3 variants): "Maximum Intensity", "Ultimate Mode Continues", "Persistence × Intensity"

**Context Interface**:
```typescript
ContinuationContext {
  completedCount: number
  totalCount: number
  nextTask?: string
  iteration?: number
  maxIterations?: number
  mode?: "todo" | "ralph-loop" | "ultrawork-ralph"
}
```

**Message Selection**:
- Uses `iteration % messages.length` for deterministic rotation
- Falls back to random selection if no iteration
- Appends status: `[${completedCount}/${totalCount} completed, ${remaining} remaining]`
- Adds next task hint and iteration info when available

**Notes**:
- Used by todo-continuation-enforcer.ts, ralph-loop.ts, and persistent-mode.ts
- Designed to avoid LLM pattern-matching on repetitive prompts
- Messages themed around Sisyphus mythology for ralph/todo continuation

---

### ralph-verifier.ts
**Purpose**: Verifies ralph loop completion claims with Oracle verification

**Key Exports**:
- `createRalphVerifierHook(ctx, options)` - Hook factory

**Functionality**:
- Listens to `message.created/updated` events
- Detects completion promises: `<promise>TASK_COMPLETE</promise>` or `<promise>DONE</promise>`
- Spawns Oracle agent to verify claims against PRD
- Handles Oracle verdicts: `<oracle-approved>` or `<oracle-rejected>`
- Auto-approves after max attempts (default: 3)
- Persists verification state to `.omc/verification-state.json`

**Verification Flow**:
1. Agent outputs `<promise>TASK_COMPLETE</promise>`
2. Ralph verifier detects claim
3. Spawns Oracle verification prompt with PRD context
4. Oracle responds with `<oracle-approved>` or `<oracle-rejected>`
5. On approval: completes task
6. On rejection: injects feedback prompt for rework
7. After max attempts: auto-approves with warning

**Interface**:
```typescript
RalphVerifierOptions {
  maxVerificationAttempts?: number  // default: 3
  oracleModel?: string
  onVerified?: (sessionID) => void
  onRejected?: (sessionID, feedback) => void
}
```

**Verification Checklist** (in Oracle prompt):
1. Are ALL acceptance criteria in PRD met?
2. Is implementation complete (not partial)?
3. Are there obvious errors or issues?
4. Would this be considered "done" by professional standards?

**Notes**:
- Uses PRD manager for context
- Integrates with ralph-loop.ts for structured verification
- Currently experimental (not wired in src/index.ts)
- Can be added to main event handler for mandatory verification

---

## Integration Patterns

### Mode Activation Flow
```
User message: "ralph-loop: build feature X"
    ↓
keyword-detector.ts detects /ralph-loop
    ↓
Callback to system-prompt-injector.ts → setMode()
    ↓
ralph-loop.ts startLoop() called
    ↓
Ralph loop active, session.idle → continue until <promise>
```

### Skill Detection Flow
```
User message: "Create a React button component"
    ↓
skill-injector.ts detects "react", "button"
    ↓
Returns SkillInjection { skill: "frontend-ui-ux", prompt: "..." }
    ↓
system-prompt-injector.ts setSkillInjection()
    ↓
System prompt includes FRONTEND_SKILL_PROMPT
```

### Persistence Priority
```
session.idle event
    ↓
persistent-mode.ts checkPersistentModes()
    ↓
Priority 1: Ralph Loop active?
Priority 2: Ultrawork active with todos?
Priority 3: Generic todo continuation?
    ↓
Inject appropriate continuation + notepad context
```

### Memory Resilience
```
Agent outputs: <remember priority>API key format: xxx</remember>
    ↓
remember-tag-processor.ts detects tag
    ↓
processRememberTags() called
    ↓
notepad.ts setPriorityContext()
    ↓
Priority Context injected in future continuations
    ↓
Survives message compaction
```

## Configuration

All hooks are created in `src/index.ts` with defaults. Options can be customized via `config.ts`:

```typescript
// Ralph loop
createRalphLoopHook(ctx, {
  config: pluginConfig.ralph_loop
})

// Persistent mode
createPersistentModeHook(ctx, {
  injectNotepadContext: true
})

// Todo continuation
createTodoContinuationEnforcer(ctx, {
  countdownSeconds: 2,
  skipCountdownAbovePercent: 90,
  adaptiveCountdown: true
})
```

## Error Handling

- **ralph-loop.ts**: Catches injection errors, continues gracefully
- **persistent-mode.ts**: Handles todo fetch errors, proceeds without todos
- **notepad.ts**: Silent fail on file I/O (returns null/false)
- **session-recovery.ts**: Logs recovery attempts, provides callbacks

## Performance Considerations

- **notepad.ts**: File-based I/O, lazy-loaded on demand
- **persistent-mode.ts**: Async todo fetch, handles timeouts
- **todo-continuation-enforcer.ts**: Smart countdown skipping for efficiency
- **ralph-loop.ts**: In-memory state with file persistence for recovery

## Testing Hooks

Test hook behavior in interactive sessions:

```bash
# Ralph loop with PRD
/ralph-loop: Build a todo API with CRUD endpoints

# Ultrawork combined with ralph
/ultrawork-ralph: Refactor authentication module

# Direct keywords
ultrawork: Implement dark mode

# Remember tags (via agents)
Task(prompt="Find X and save with <remember>Result: Y</remember>")
```

## Future Enhancements

1. **Verification**: Enable ralph-verifier.ts in event loop for mandatory verification
2. **Agent Usage**: Wire agent-usage-reminder.ts into event handler
3. **Recovery**: Integrate session-recovery.ts for automatic error handling
4. **Notepad Dashboard**: UI for viewing/editing notepad sections
5. **Skill Extensions**: Add more context-aware skills (testing, documentation, etc.)
6. **Analytics**: Track hook invocations and effectiveness
