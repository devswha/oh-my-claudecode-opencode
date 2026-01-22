<!-- Parent: ../AGENTS.md -->

# omo-omcs Source Architecture

**Project**: oh-my-ssalsyphus (omo-omcs) - An OpenCode plugin for orchestrating specialized AI agents
**Version**: v3.0.11
**Purpose**: Multi-agent orchestration system for autonomous task execution with persistence and verification

## Porting Context

이 디렉토리는 oh-my-claudecode의 핵심 기능을 OpenCode 플러그인 API로 포팅한 구현체를 포함한다. oh-my-claudecode는 Claude Code CLI를 위한 원본 플러그인이며, omo-omcs는 OpenCode + GitHub Copilot + Claude 환경에서 동일한 멀티-에이전트 오케스트레이션 경험을 제공하는 것을 목표로 한다. oh-my-claudecode v3.3.4와의 기능 동등성을 목표로 개발되었다.

## Directory Structure

```
src/
├── index.ts                          # Main plugin entry point
├── agents/
│   └── index.ts                      # Agent definitions and registry
├── config/
│   └── index.ts                      # Configuration loading (JSONC support)
├── hooks/                            # 11+ plugin event hooks
│   ├── index.ts                      # Hook exports
│   ├── ralph-loop.ts                 # Persistent task loop orchestration
│   ├── persistent-mode.ts            # Unified continuation handler
│   ├── system-prompt-injector.ts     # Mode and skill context injection
│   ├── skill-injector.ts             # Skill detection and injection
│   ├── todo-continuation-enforcer.ts # Task completion enforcement
│   ├── keyword-detector.ts           # Magic keyword detection
│   ├── session-recovery.ts           # Session state recovery
│   ├── agent-usage-reminder.ts       # Agent delegation suggestions
│   ├── remember-tag-processor.ts     # Notepad memory processing
│   ├── notepad.ts                    # Compaction-resilient memory
│   └── continuation-messages.ts      # Context messaging
├── plugin-handlers/
│   ├── index.ts                      # Plugin handler exports
│   └── config-handler.ts             # Agent/command registration
├── prd/                              # Product Requirements management
│   ├── index.ts                      # PRD exports
│   ├── prd-manager.ts                # PRD CRUD and story tracking
│   └── progress-tracker.ts           # Iteration logging and patterns
├── prompts/
│   └── ultrawork.ts                  # Ultrawork prompt templates
├── shared/
│   ├── logger.ts                     # Debug logging utilities
│   └── session-state.ts              # Session-scoped state management
├── state/                            # Persistent state management
│   ├── index.ts                      # State exports
│   ├── ralph-state.ts                # Ralph loop persistence
│   ├── ultrawork-state.ts            # Ultrawork task persistence
│   └── verification-state.ts         # Verification attempt tracking
└── tools/                            # Tool integration
    ├── index.ts                      # Tool exports
    ├── background-manager.ts         # Background task orchestration
    ├── background-tools.ts           # Background tool definitions
    ├── call-omo-agent.ts             # Agent delegation tool
    └── builtin.ts                    # Built-in tool registry
```

## Core Components

### 1. Plugin Entry Point (`index.ts`)

**Responsibility**: Initialize plugin, wire hooks, expose tools

**Key Exports**:
- `OmoOmcsPlugin` - Main Plugin async factory function

**Event Handlers Registered**:
- `event` - Routes to ralph-loop for persistence
- `chat.message` - Detects slash commands and injects skills
- `experimental.chat.system.transform` - Injects system prompt modifications
- `tool.execute.before` - Blocks infinite delegation loops
- `tool.execute.after` - Processes remember tags

**Tools Exposed**:
- `background_task` - Start background task
- `background_output` - Stream background output
- `background_cancel` - Cancel background task
- `call_omo_agent` - Delegate to specialized agent

### 2. Agent System (`agents/index.ts`)

**Responsibility**: Define specialized subagents with system prompts and capabilities

**Agent Categories** (28 total agents across tiers):

#### Architect Agents (Analysis & Review)
- `architect` (Opus) - Strategic architecture advisor (read-only)
- `architect-medium` (Sonnet) - Balanced architectural analysis
- `architect-low` (Haiku) - Fast architectural checks
- **Backward compatibility**: `oracle`, `oracle-medium`, `oracle-low`

#### Executor Agents (Task Execution)
- `executor` (Sonnet) - Direct task implementation
- `executor-high` (Opus) - Complex multi-file refactoring
- `executor-low` (Haiku) - Simple well-defined tasks
- **Backward compatibility**: `sisyphus-junior`, `sisyphus-junior-high`, `sisyphus-junior-low`

#### Explore Agents (Codebase Search)
- `explore` (Haiku) - Fast file/pattern discovery
- `explore-medium` (Sonnet) - Deep codebase analysis with pattern recognition

#### Researcher Agents (Documentation & References)
- `researcher` (Sonnet) - External documentation research
- `researcher-low` (Haiku) - Fast API/reference lookup
- **Backward compatibility**: `librarian`, `librarian-low`

#### Designer Agents (UI/UX)
- `designer` (Sonnet) - UI/UX implementation
- `designer-high` (Opus) - Complex design systems
- `designer-low` (Haiku) - Simple styling changes
- **Backward compatibility**: `frontend-engineer`, `frontend-engineer-high`, `frontend-engineer-low`

#### Writer Agent (Documentation)
- `writer` (Haiku) - Technical documentation
- **Backward compatibility**: `document-writer`

#### QA/Testing Agents
- `qa-tester` (Sonnet) - Interactive CLI testing
- `qa-tester-high` (Opus) - Comprehensive production QA

#### Planning & Analysis Agents (v3.0.11)
- `planner` (Opus) - Strategic planning specialist
- `analyst` (Opus) - Pre-planning analysis
- `critic` (Opus) - Plan review and critique
- `vision` (Sonnet) - Visual/media analysis
- **Backward compatibility**: `prometheus`, `metis`, `momus`, `multimodal-looker`

#### Coordinator Agent
- `coordinator` (Opus) - Master orchestrator for multi-step tasks

**Key Functions**:
- `getAgent(name)` - Look up agent definition
- `listAgents()` - Get unique agents (excluding aliases)
- `listAgentNames()` - Get all names including aliases
- `isAlias(name)` - Check if name is backward compatible alias
- `getCanonicalName(name)` - Map alias to canonical name

### 3. Configuration System (`config/index.ts`)

**Responsibility**: Load and validate configuration

**Configuration Sources** (in priority order):
1. `.opencode/omo-omcs.jsonc` (project-level)
2. `.opencode/omo-omcs.json` (project-level)
3. `~/.config/opencode/omo-omcs.jsonc` (user global)
4. `~/.config/opencode/omo-omcs.json` (user global)

**Config Schema**:
```typescript
{
  $schema?: string
  agents?: Record<agentName, {
    model?: string         // e.g., "openai/gpt-4"
    temperature?: number   // 0-2
    top_p?: number        // 0-1
    disable?: boolean
    prompt_append?: string
  }>
  disabled_hooks?: string[]
  disabled_agents?: string[]
  disabled_skills?: string[]
  disabled_mcps?: string[]
  background_task?: {
    defaultConcurrency?: number          // 1-20 (default: 5)
    providerConcurrency?: Record<provider, number>
    modelConcurrency?: Record<model, number>
  }
  ralph_loop?: {
    enabled?: boolean
    default_max_iterations?: number      // 1-1000 (default: 100)
  }
  sisyphus_agent?: {
    disabled?: boolean
    planner_enabled?: boolean
    replace_plan?: boolean
  }
}
```

### 4. Hooks System (`hooks/`)

**Responsibility**: Intercept plugin events and implement plugin behaviors

**11 Hooks Implemented**:

1. **ralph-loop** - Core persistence orchestration
   - Detects `RALPH LOOP ACTIVATED` / `ULTRAWORK-RALPH ACTIVATED` commands
   - Manages multi-iteration task execution
   - Integrates with PRD system for structured planning
   - Fires `onModeChange` callback for system prompt injection
   - **State Persistence**: Via `ralph-state.ts`

2. **persistent-mode** - Unified continuation handler
   - Checks for continuation conditions at `session.idle`
   - Integrates todo enforcement and notepad context
   - Auto-resumes tasks based on mode flags

3. **system-prompt-injector** - Context injection for active modes
   - Modifies `experimental.chat.system.transform` hook
   - Injects mode context (ralph-loop, ultrawork-ralph, skill injection)
   - Tracks active modes per session
   - Injects skill-specific system prompts

4. **skill-injector** - Skill context detection and injection
   - Detects magic keywords (e.g., "autopilot", "ralph", "ulw", "plan")
   - Injects relevant skill descriptions into system prompt
   - Clears skill injection when context no longer applies

5. **todo-continuation-enforcer** - Task completion enforcement
   - Prevents session idle when todos remain
   - Tracks continuation attempts to prevent infinite loops
   - Sends reminders about incomplete tasks

6. **keyword-detector** - Magic keyword pattern matching
   - Detects ralph activation patterns
   - Extracts task from XML tags (`<user-task>`)
   - Identifies cancellation commands

7. **session-recovery** - Persisted state restoration
   - Restores ralph-loop state on plugin initialization
   - Handles PRD recovery
   - Recovery happens automatically on load

8. **agent-usage-reminder** - Delegation suggestions
   - Suggests appropriate agents for detected patterns
   - Reminds users to delegate instead of implementing directly
   - Context-aware recommendations

9. **remember-tag-processor** - Notepad memory integration
   - Processes `<remember>` and `<remember priority>` tags in outputs
   - Persists learning and decisions to notepad
   - Handles compaction and pruning

10. **notepad** - Compaction-resilient memory system
    - Four sections: Priority, Working Memory, Manual, Pruning metadata
    - Survives chat compaction via NOTEPAD_FILENAME tracking
    - Default file: `.omc/notepads/{plan-name}/notepad.md`
    - **Key Functions**:
      - `initNotepad()` - Initialize notepad for session
      - `readNotepad()` - Load notepad
      - `addWorkingMemoryEntry()` - Add discoveries
      - `setPriorityContext()` - Mark high-priority info
      - `formatNotepadContext()` - Format for injection
      - `pruneOldEntries()` - Clean up aged entries

11. **continuation-messages** - Context and status formatting
    - `getContinuationMessage()` - Format continuation prompt
    - `getProgressSummary()` - Summarize progress
    - `getToastMessage()` - Create toast notifications

### 5. Plugin Handlers (`plugin-handlers/`)

**Responsibility**: Register agents, commands, and settings

**config-handler.ts**:
- Registers agents from agent definitions
- Creates command handlers for slash commands
- Manages agent settings and configurations

### 6. State Management (`state/`)

**Responsibility**: Persist execution state across sessions

**Three State Types**:

1. **ralph-state** - Ralph loop persistence
   - `active` - Is loop currently running
   - `session_id` - Session identifier
   - `prompt` - Original task description
   - `iteration` - Current iteration number
   - `max_iterations` - Max iterations allowed
   - `completion_promise` - Completion signal to watch for
   - `started_at` - Timestamp
   - `prd_mode` - Is PRD-based execution
   - **File**: `.omc/ralph-state.json`

2. **ultrawork-state** - Ultrawork parallel execution
   - `active` - Is ultrawork running
   - `checked` - Tasks completed
   - `total` - Total tasks
   - **File**: `.omc/ultrawork-state.json`

3. **verification-state** - Verification attempt tracking
   - `session_id` - Session identifier
   - `verification_attempts` - Attempt history
   - `last_verification_time` - Latest verification timestamp
   - **File**: `.omc/verification-state.json`

**Persistence Pattern**:
```typescript
// Read state
const state = readRalphState(ctx.directory)

// Write state
writeRalphState(ctx.directory, state)

// Create new state
const newState = createRalphState(sessionID, prompt, maxIterations)

// Update state
updateRalphStateIteration(ctx.directory, sessionID, newIteration)

// Clear state
clearRalphState(ctx.directory)
```

### 7. PRD Management (`prd/`)

**Responsibility**: Structured planning and story tracking

**PRD Structure**:
```typescript
interface PRD {
  id: string
  task: string
  created_at: string
  updated_at: string
  status: "in_progress" | "completed"
  stories: UserStory[]
}

interface UserStory {
  id: string
  title: string
  description: string
  acceptance_criteria: string[]
  status: "pending" | "in_progress" | "completed"
  iteration: number
}
```

**Key Functions**:
- `createPrdFromTask(task)` - Auto-generate PRD from task description
- `getNextStory()` - Get next incomplete story
- `markStoryComplete()` - Mark story as done
- `getIncompleteStories()` - Get pending stories
- **Progress Tracking**:
  - `initializeProgress()` - Start iteration log
  - `appendIteration()` - Log completed iteration
  - `formatProgressContext()` - Format for prompt injection

### 8. Tool System (`tools/`)

**Responsibility**: Expose tools to agents and manage background execution

**Tools Exposed**:

1. **background_task** - Start background operation
   ```typescript
   {
     command: string              // shell command to run
     background_task?: {
       name?: string              // task identifier
       timeout?: number           // execution timeout (ms)
       silent?: boolean           // suppress output
     }
   }
   ```

2. **background_output** - Get live output from running task
   ```typescript
   {
     task_id?: string
     lines?: number              // last N lines
     offset?: number             // skip to line
   }
   ```

3. **background_cancel** - Cancel running task
   ```typescript
   {
     task_id?: string
   }
   ```

4. **call_omo_agent** - Delegate to specialized agent
   ```typescript
   {
     agent: string               // agent name
     prompt: string              // task description
     model?: string              // override model
     tools?: string[]            // available tools
   }
   ```

**Background Manager** (`background-manager.ts`):
- Manages concurrent background tasks
- Enforces concurrency limits (default: 5)
- Provider-level and model-level concurrency limits
- Task lifecycle: queued → running → completed/failed

### 9. Shared Utilities (`shared/`)

**logger.ts** - Debug logging
- Controlled via `DEBUG=true` or `OMO_OMCS_DEBUG=true`
- Functions: `log()`, `warn()`, `error()`
- Output format: `[omo-omcs] {ISO timestamp} {message} {data}`

**session-state.ts** - Session-scoped state
- Temporary state for current session only
- NOT persisted across sessions
- Used for transient mode tracking

### 10. Prompts (`prompts/`)

**ultrawork.ts** - Ultrawork execution templates
- Prompt templates for parallel task execution
- Task breakdown templates
- Verification prompt templates

## Event Flow

### Plugin Initialization
```
Plugin instantiation
  ↓
loadConfig() - Load user config
  ↓
createBackgroundManager() - Initialize task executor
  ↓
createSystemPromptInjector() - Initialize context injector
  ↓
createRalphLoopHook() - Initialize persistence loop
  ↓
restorePersistedState() - Recover from crash
  ↓
Plugin ready for events
```

### Ralph Loop Activation
```
User sends: "/ralph task description"
  ↓
chat.message hook detects RALPH LOOP template
  ↓
ralphLoop.startLoop(sessionID, prompt)
  ↓
createRalphState() - Initialize state
  ↓
systemPromptInjector.setMode() - Inject mode context
  ↓
writeRalphState() - Persist state
  ↓
Ralph loop continues until completion or cancellation
```

### Skill Injection Flow
```
User sends: "autopilot: build a todo app"
  ↓
chat.message hook fires
  ↓
skillInjector.detectAndInject() - Detects "autopilot" keyword
  ↓
systemPromptInjector.setSkillInjection() - Queues injection
  ↓
experimental.chat.system.transform fires
  ↓
Skill context injected into system prompt
```

### Session Recovery
```
Plugin restart
  ↓
restorePersistedState() - Check for active sessions
  ↓
If ralph-state.json exists with active=true:
  ├→ Restore RalphLoopState in memory
  ├→ On next session.idle, trigger continuation
  └→ Cycle resumes

If ultrawork-state.json exists:
  ├→ Restore parallel execution state
  └→ Resume incomplete tasks
```

## Key Design Patterns

### 1. Hook-Based Event System
- Plugin uses event hooks to intercept plugin lifecycle
- Each hook is independent, can be disabled via config
- Hooks communicate via session-scoped state or file persistence

### 2. State Persistence Strategy
- **Ralph Loop**: File-persisted to survive crashes
- **Ultrawork**: File-persisted for parallel task tracking
- **Sessions**: In-memory only, cleared on session end
- **Notepad**: Markdown-persisted, survives compaction

### 3. Mode Tracking
- **Active Mode**: ralph-loop, ultrawork-ralph, or skill injection
- **Mode Injection**: System prompt modification at transform time
- **Mode Change Callbacks**: Ralph loop notifies injector of mode changes

### 4. Agent Delegation
- **Avoid Direct Implementation**: Delegate to executor agents
- **Task Tool Blocked**: Prevents infinite delegation loops
- **Context Preservation**: Full codebase context passed to agents

### 5. Skill Auto-Detection
- **Magic Keywords**: "autopilot", "ralph", "ulw", "plan", "ralplan"
- **Keyword Patterns**: Regex-based detection
- **Auto-Injection**: Skills injected into system prompt when detected
- **Clear on Mismatch**: Skill injection cleared when keyword not present

## Configuration & Customization

### Disable Specific Hooks
```json
{
  "disabled_hooks": [
    "agent-usage-reminder",
    "remember-tag-processor"
  ]
}
```

### Override Agent Models
```json
{
  "agents": {
    "architect": {
      "model": "anthropic/claude-opus",
      "temperature": 0.3
    }
  }
}
```

### Adjust Background Concurrency
```json
{
  "background_task": {
    "defaultConcurrency": 10,
    "providerConcurrency": {
      "openai": 5,
      "anthropic": 20
    }
  }
}
```

### Customize Ralph Loop
```json
{
  "ralph_loop": {
    "enabled": true,
    "default_max_iterations": 200
  }
}
```

## Debugging

### Enable Debug Logging
```bash
DEBUG=true node run-opencode-plugin.js
# or
OMO_OMCS_DEBUG=true node run-opencode-plugin.js
```

**Debug Output** includes:
- Ralph loop iteration tracking
- State persistence operations
- Hook execution events
- Skill detection results
- Background task lifecycle

### Check Persisted State
```bash
cat .omc/ralph-state.json
cat .omc/ultrawork-state.json
cat .omc/verification-state.json
cat .omc/prd.json
```

### View Notepad
```bash
ls -la .omc/notepads/
cat .omc/notepads/{plan-name}/notepad.md
```

## Integration Points

### With oh-my-claudecode
- **Skills**: Uses skill injection framework
- **Mode System**: Integrates with persistent-mode
- **Agents**: Exposes all v3.0.11 agents
- **Keywords**: Detects magic keywords for skill activation

### With OpenCode Plugin System
- **PluginInput**: Receives context and directory
- **Event Hooks**: Routes to hook handlers
- **Tool Registration**: Exposes tools via tool registry
- **Config Handler**: Registers agents as commands

### With Notepad System
- **Compaction Resilience**: Survives chat context compaction
- **Memory Sections**: Priority, Working Memory, Manual
- **Plan Scoping**: Per-plan notepad in `.omc/notepads/`
- **Auto-Pruning**: Old entries cleaned up automatically

## Version History

### v3.0.11 (Current)
- Renamed agents: oracle→architect, librarian→researcher, etc.
- Added planning agents: planner, analyst, critic
- New vision agent for visual analysis
- Backward compatible aliases for all renames
- CLAUDE.md integration for skill system

### v3.0.0
- Multi-agent orchestration framework
- Ralph loop for persistent execution
- Background task management
- PRD-based structured planning

## File Locations Reference

| File/Directory | Purpose | Location |
|---|---|---|
| Configuration | Plugin settings | `.opencode/omo-omcs.jsonc` |
| Ralph state | Persistence loop | `.omc/ralph-state.json` |
| Ultrawork state | Parallel tasks | `.omc/ultrawork-state.json` |
| Verification state | Verification attempts | `.omc/verification-state.json` |
| PRD | Structured plan | `.omc/prd.json` |
| Notepad | Memory system | `.omc/notepads/{plan}/notepad.md` |
| Debug logs | Runtime logs | Console output (with DEBUG=true) |

## Contributing Guidelines

### Adding New Hooks
1. Create hook file in `hooks/` directory
2. Export factory function: `createXxxHook(ctx, options)`
3. Add to `hooks/index.ts` exports
4. Register in `index.ts` plugin initialization
5. Add to `HookName` type in `config/index.ts`

### Adding New Agents
1. Define `AgentDefinition` in `agents/index.ts`
2. Add system prompt with capabilities
3. Register in `agents` record
4. Add to `listAgents()` if primary agent
5. Consider backward-compatible aliases

### Tool Integration
1. Create tool function in `tools/`
2. Export from `tools/index.ts`
3. Register in plugin's `tool` object
4. Add to `builtinTools` registry if built-in

## Architecture Principles

1. **Hooks Over Direct Implementation**: Use event hooks, not direct calls
2. **State Persistence**: Critical state must survive crashes
3. **Session Isolation**: State per session, no global mutable state
4. **Delegation Pattern**: Orchestrate agents, don't implement
5. **Read-Only Consulting**: Architects read-only, executors write
6. **Configurable Behavior**: All major features configurable
7. **Backward Compatibility**: Old names still work
8. **Debug Visibility**: Can enable detailed logging without code changes
