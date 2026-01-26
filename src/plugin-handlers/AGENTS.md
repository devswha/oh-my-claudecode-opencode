# Plugin Handlers

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode의 에이전트/명령어 등록 시스템을 OpenCode config handler로 변환. oh-my-claudecode의 MCP 서버 기반 에이전트 등록이 OpenCode 플러그인의 config handler 패턴으로 변환되었다. slash 명령어(/ultrawork, /ralph 등)와 에이전트 등록 로직이 포팅되었다.

## Overview

This directory contains the OpenCode plugin integration layer. It handles agent registration, slash command setup, and configuration merging between OMCO and OpenCode.

## Architecture

The plugin handlers bridge OMCO's agent system with OpenCode's plugin API:
- **Agent registration**: Convert OMCO agents → OpenCode subagents
- **Command registration**: Define slash commands (`/ultrawork`, `/ralph`, etc.)
- **Config merging**: Apply OMCO config to OpenCode config
- **Model routing**: Map agent definitions to OpenCode agent configs

## Key Files

### `index.ts`
**Purpose**: Plugin handler exports
**Exports**:
- Re-exports from `config-handler.ts`

### `config-handler.ts`
**Purpose**: Main plugin configuration handler
**Exports**:
- `registerAgents(input)` - Register all OMCO agents with OpenCode
- `registerCommands(input)` - Register slash commands
- `SLASH_COMMANDS` - Command definitions

## Slash Commands

### Available Commands

| Command | Description | Agent | Template |
|---------|-------------|-------|----------|
| `/ultrawork` | Maximum intensity execution | - | Ultrawork mode with parallel everything |
| `/ralph` | Persistent task completion | - | Ralph loop with iteration tracking |
| `/ralph-init` | Initialize PRD for structured ralph | - | PRD setup workflow |
| `/update-omco` | Update to latest version | - | npm install with latest version |
| `/cancel-ralph` | Cancel active ralph loop | - | Stop ralph iteration |

### Command Structure
```typescript
interface CommandConfig {
  template: string;      // Command prompt template
  description?: string;  // User-visible description
  agent?: string;        // Target agent name
  model?: string;        // Override model
  subtask?: boolean;     // Run as subtask
}
```

### Template Variables
Commands use `$ARGUMENTS` for user input:
```typescript
template: `Execute this task: $ARGUMENTS`
```

## Agent Registration

### Registration Flow
1. Load OMCO config via `loadConfig()`
2. For each agent definition:
   - Extract model, temperature, top_p from config
   - Merge with agent's system prompt
   - Apply config overrides (disable, prompt_append)
   - Register with OpenCode via `input.opencode.config`

### OpenCode Agent Config
```typescript
interface AgentConfig {
  model?: string;              // Model ID
  temperature?: number;        // Sampling temperature
  top_p?: number;             // Nucleus sampling
  topP?: number;              // Alias for top_p
  topK?: number;              // Top-K sampling
  prompt?: string;            // System prompt
  description?: string;       // Agent description
  color?: string;             // UI color
  mode?: "subagent" | "primary" | "all";
  maxSteps?: number;          // Max conversation steps
  tools?: Record<string, boolean>;  // Tool access
  disable?: boolean;          // Disable agent
}
```

### Config Merging Priority
1. **OMCO config file** (highest)
2. **Agent definition defaults**
3. **OpenCode defaults** (lowest)

## Usage Patterns

### Registering Agents
```typescript
import { registerAgents } from './plugin-handlers';

export default function plugin(input: PluginInput) {
  // Register all 28+ agents
  registerAgents(input);

  // Agents now available in OpenCode
}
```

### Registering Commands
```typescript
import { registerCommands } from './plugin-handlers';

export default function plugin(input: PluginInput) {
  // Register /ultrawork, /ralph, etc.
  registerCommands(input);

  // Commands now available in chat
}
```

### Custom Command Example
```typescript
const SLASH_COMMANDS = {
  "my-command": {
    template: `Custom task: $ARGUMENTS`,
    description: "My custom command",
    agent: "executor",
    model: "sonnet"
  }
};
```

## Agent Registration Details

### Per-Agent Configuration
Each agent can be configured individually:
```json
{
  "agents": {
    "architect": {
      "model": "openai/gpt-5.2",
      "temperature": 0.3,
      "top_p": 0.9,
      "prompt_append": "\nExtra instructions here"
    },
    "executor-low": {
      "model": "google/gemini-3-flash",
      "temperature": 0.1,
      "disable": false
    }
  }
}
```

### Disabled Agents
Agents can be disabled via config:
```json
{
  "disabled_agents": ["oracle", "librarian"]
}
```

Or per-agent:
```json
{
  "agents": {
    "oracle": {
      "disable": true
    }
  }
}
```

## Command Templates

### Ultrawork Template
High-intensity execution with aggressive parallelization:
```
[ULTRAWORK MODE ACTIVATED - MAXIMUM INTENSITY]

Execute this task at MAXIMUM INTENSITY:
<user-task>
$ARGUMENTS
</user-task>

## ULTRAWORK OVERRIDES (ACTIVE)
- PARALLEL EVERYTHING
- DELEGATE EVEN SMALL TASKS
- DON'T WAIT - continue immediately
- BACKGROUND EVERYTHING POSSIBLE
```

### Ralph Template
Persistent execution with iteration tracking:
```
[RALPH MODE ACTIVATED - PERSISTENCE UNTIL COMPLETE]

Complete this task FULLY with verification:
<user-task>
$ARGUMENTS
</user-task>

## RALPH PROTOCOL
- Loop until verified complete
- Check PRD progress after each iteration
- Never stop with pending tasks
- Verify all acceptance criteria pass
```

### Ralph Init Template
PRD creation for structured task tracking:
```
Initialize PRD for this project:
<project-description>
$ARGUMENTS
</project-description>

## PRD INITIALIZATION PROTOCOL
- Analyze project requirements
- Break down into user stories
- Define acceptance criteria
- Create .omc/prd.json
```

## Integration Points

- **Agent System**: `/home/calvin/workspace/OMCO/src/agents/` - Source of agent definitions
- **Config System**: `/home/calvin/workspace/OMCO/src/config/` - Configuration loading
- **Prompts**: `/home/calvin/workspace/OMCO/src/prompts/` - Template source for commands
- **OpenCode SDK**: `@opencode-ai/plugin` - Plugin API integration

## Implementation Details

### Type Safety
Uses OpenCode SDK types:
```typescript
import type { PluginInput } from "@opencode-ai/plugin";
```

### Logging
Integrates with shared logger:
```typescript
import { log } from "../shared/logger";
log('Registered agent', { name: 'architect', model: 'opus' });
```

### Config Access
```typescript
const config = loadConfig(input.directory);
const agentConfig = config.agents?.[agentName];
```

### Agent Loop
Iterates through all agent definitions:
```typescript
for (const [name, definition] of agents.entries()) {
  const agentConfig = config.agents?.[name];
  const finalModel = agentConfig?.model || definition.model;
  // Register with OpenCode...
}
```

## Design Principles

1. **Separation of concerns**: Handlers only bridge, don't implement logic
2. **Config-driven**: All behavior configurable via OMCO.json
3. **Type safety**: Leverage OpenCode SDK types
4. **Logging**: Debug-level logging for troubleshooting
5. **Graceful fallbacks**: Missing config = use defaults

## Error Handling

- **Missing config**: Use agent definition defaults
- **Invalid config**: Zod validation catches issues
- **Disabled agents**: Skip registration silently

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin API
- `../agents` - Agent definitions
- `../config` - Configuration loading
- `../shared/logger` - Logging utility

## Related Documentation

- [Agent Definitions](../agents/AGENTS.md) - Agent source of truth
- [Configuration](../config/AGENTS.md) - Config structure
- [Prompts](../prompts/AGENTS.md) - Command template details
