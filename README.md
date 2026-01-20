# oh-my-ssalsyphus

> 🔄 **OpenCode port of [oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus)**

**Oh My Ssal Sisyphus** - Multi-agent orchestration plugin that brings [oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus) features to [OpenCode](https://github.com/opencode-ai/opencode).

Like Sisyphus condemned to roll his boulder eternally, this plugin ensures your AI assistant **never stops until the task is complete**.

---

## 🎯 What is this?

This project **ports the powerful features** of [oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus) (a Claude Code plugin) to the **OpenCode platform**.

| Original (Claude Code) | This Port (OpenCode) |
|------------------------|----------------------|
| [oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus) | **oh-my-ssalsyphus** |
| Shell hooks + Node.js bridge | Native TypeScript plugin API |
| Stop hook (proactive blocking) | session.idle event (reactive) |

### Key Features Ported
- ✅ Ultrawork Mode (maximum intensity parallel execution)
- ✅ Ralph Loop (self-referential completion loop)
- ✅ TODO Continuation Enforcer
- ✅ PRD-based task tracking
- ✅ Notepad memory system (`<remember>` tags)
- ✅ Background agent orchestration
- ✅ Session state persistence

---

## Features

### Core Capabilities

- **TODO Continuation Enforcer** - Automatically reminds the assistant to complete pending tasks
- **Ultrawork Mode** - Maximum intensity parallel execution triggered by keywords
- **Ralph Loop** - Self-referential loop that continues until verified completion
- **Background Agents** - Run explore/librarian agents in parallel without blocking
- **Agent Usage Reminder** - Encourages using specialized agents over direct tool calls

### Specialized Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| `oracle` | Opus | Architecture & debugging advisor |
| `librarian` | Sonnet | Documentation & reference researcher |
| `explore` | Haiku | Fast codebase search |
| `frontend-engineer` | Sonnet | UI/UX implementation |
| `document-writer` | Haiku | Technical documentation |
| `sisyphus-junior` | Sonnet | Focused task executor |
| `qa-tester` | Sonnet | Interactive CLI testing |

## Installation

```bash
# Using npm
npm install omo-omcs

# Using bun
bun add omo-omcs

# Using pnpm
pnpm add omo-omcs
```

Then add to your OpenCode configuration:

```json
{
  "plugins": ["omo-omcs"]
}
```

## Usage

### Ultrawork Mode

Trigger maximum performance mode by including keywords in your prompt:

```
ultrawork: Implement the authentication system with tests
```

or

```
ulw refactor the database layer
```

Keywords: `ultrawork`, `ulw`, `uw`

### Ralph Loop

Start a self-referential loop that continues until the task is verified complete:

```
/ralph-loop "Implement user registration with email verification"
```

Cancel with:

```
/cancel-ralph
```

### Background Agents

The plugin provides tools for running agents in the background:

```typescript
// Run explore agent in background
background_task(agent="explore", prompt="Find all authentication-related files")

// Run librarian for documentation research
background_task(agent="librarian", prompt="Find JWT best practices documentation")

// Get results when ready
background_output(task_id="...")

// Cancel all background tasks
background_cancel(all=true)
```

### Call Agents Directly

```typescript
// Synchronous call
call_omo_agent(
  subagent_type="oracle",
  prompt="Review this architecture decision...",
  run_in_background=false
)

// Async call
call_omo_agent(
  subagent_type="explore",
  prompt="Find all React components",
  run_in_background=true
)
```

## Configuration

Create `.opencode/omo-omcs.json` in your project:

```json
{
  "disabled_hooks": [],
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

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `disabled_hooks` | Hooks to disable | `[]` |
| `background_task.max_concurrent` | Max parallel background tasks | `5` |
| `background_task.timeout_ms` | Background task timeout | `300000` |
| `ralph_loop.max_iterations` | Max loop iterations | `50` |
| `ralph_loop.idle_timeout_ms` | Idle time before continuation | `30000` |
| `todo_continuation.idle_threshold_ms` | Idle threshold for TODO check | `15000` |
| `ultrawork.keywords` | Trigger keywords | `["ultrawork", "ulw", "uw"]` |

### Disabling Hooks

```json
{
  "disabled_hooks": [
    "agent-usage-reminder",
    "keyword-detector"
  ]
}
```

Available hooks:
- `todo-continuation-enforcer`
- `keyword-detector`
- `ralph-loop`
- `session-recovery`
- `agent-usage-reminder`

## How It Works

### TODO Continuation Enforcer

When the assistant has incomplete TODO items and becomes idle:

1. Plugin detects idle state (no tool calls for configured threshold)
2. Checks if pending/in_progress TODOs exist
3. Injects continuation prompt:

```
[SYSTEM REMINDER - TODO CONTINUATION]
Incomplete tasks remain in your todo list. Continue working on the next pending task.
Proceed without asking for permission. Mark each task complete when finished.
Do not stop until all tasks are done.
```

### Ralph Loop

Self-referential execution loop:

1. User invokes `/ralph-loop "task description"`
2. Plugin creates PRD (Product Requirements Document) if not exists
3. Monitors for completion signals (`<promise>DONE</promise>`)
4. Re-injects task prompt on idle until completion
5. Tracks iterations to prevent infinite loops

### Ultrawork Mode

When triggered:

1. Injects high-intensity system prompt
2. Encourages parallel execution
3. Minimizes confirmation requests
4. Maximizes throughput

## Development

```bash
# Clone the repo
git clone https://github.com/devswha/oh-my-ssalsyphus.git
cd oh-my-ssalsyphus

# Install dependencies
bun install

# Build
bun run build

# Type check
bun run typecheck

# Run tests
bun test
```

## Philosophy

Named after Sisyphus from Greek mythology - condemned to roll a boulder up a hill for eternity. Like Sisyphus, this plugin embodies **persistence**:

- Tasks are tracked until completion
- The assistant cannot simply "give up"
- Work continues until the boulder reaches the summit

> "The struggle itself toward the heights is enough to fill a man's heart. One must imagine Sisyphus happy." - Albert Camus

## Credits

This project is an **OpenCode port** of [oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus) by [@Yeachan-Heo](https://github.com/Yeachan-Heo).

Special thanks to:
- [oh-my-claude-sisyphus](https://github.com/Yeachan-Heo/oh-my-claude-sisyphus) - The original Claude Code plugin this project ports
- [OpenCode](https://github.com/opencode-ai/opencode) - The target platform

## License

MIT
