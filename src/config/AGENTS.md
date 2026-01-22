# Configuration System

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode 설정 스키마를 .opencode/omo-omcs.json으로 변환. oh-my-claudecode의 .claude/omo-omcs.json 설정 파일 형식이 OpenCode의 .opencode/ 디렉토리 규칙에 맞게 조정되었다. 설정 스키마 구조(에이전트 설정, 훅 비활성화, 백그라운드 작업 설정 등)는 oh-my-claudecode와 동일하다.

## Overview

This directory provides the configuration loading and validation system for omo-omcs. It handles loading configuration from `.opencode/omo-omcs.json` files with JSON/JSONC support and comment stripping.

## Architecture

The config system uses Zod schemas for type-safe configuration with fallback defaults:
- **Multi-location search**: Project-local → global config
- **JSONC support**: Allows comments in JSON config files
- **Type validation**: Zod schemas ensure config correctness
- **Graceful fallbacks**: Returns defaults if no config found

## Key Files

### `index.ts`
**Purpose**: Configuration loader with Zod validation
**Exports**:
- `OmoOmcsConfig` - Main configuration type
- `AgentConfig` - Per-agent configuration (model, temperature, top_p)
- `BackgroundTaskConfig` - Concurrency settings
- `RalphLoopConfig` - Persistence mode settings
- `HookName` - Type-safe hook identifiers
- `AgentName` - Type-safe agent identifiers
- `loadConfig(directory)` - Load and validate config from directory

## Configuration Schema

### Agent Configuration
```typescript
{
  model?: string;           // Override model (e.g., "openai/gpt-5.2")
  temperature?: number;     // 0.0 - 2.0
  top_p?: number;          // 0.0 - 1.0
  disable?: boolean;       // Disable this agent
  prompt_append?: string;  // Append to system prompt
}
```

### Background Task Configuration
```typescript
{
  defaultConcurrency?: number;              // 1-20 default concurrent tasks
  providerConcurrency?: Record<string, number>;  // Per-provider limits
  modelConcurrency?: Record<string, number>;     // Per-model limits
}
```

### Ralph Loop Configuration
```typescript
{
  enabled?: boolean;           // Enable persistence mode
  default_max_iterations?: number;  // 1-1000 iteration limit
}
```

### Sisyphus Agent Configuration
```typescript
{
  disabled?: boolean;         // Disable sisyphus agent
  planner_enabled?: boolean;  // Enable planner integration
  replace_plan?: boolean;     // Replace existing plans
}
```

### Full Configuration Structure
```typescript
{
  $schema?: string;                  // Schema URL
  agents?: Record<string, AgentConfig>;
  disabled_hooks?: string[];
  disabled_agents?: string[];
  disabled_skills?: string[];
  disabled_mcps?: string[];
  background_task?: BackgroundTaskConfig;
  ralph_loop?: RalphLoopConfig;
  sisyphus_agent?: SisyphusAgentConfig;
}
```

## Configuration File Locations

Search order (first found wins):
1. `${projectDir}/.opencode/omo-omcs.json`
2. `${projectDir}/.opencode/omo-omcs.jsonc`
3. `~/.config/opencode/omo-omcs.json`
4. `~/.config/opencode/omo-omcs.jsonc`

## Default Configuration

If no config file is found:
```json
{
  "agents": {
    "oracle": { "model": "openai/gpt-5.2" },
    "librarian": { "model": "google/gemini-3-flash" },
    "explore": { "model": "google/gemini-3-flash" },
    "frontend-ui-ux-engineer": { "model": "google/gemini-3-pro-preview" },
    "document-writer": { "model": "google/gemini-3-flash" },
    "multimodal-looker": { "model": "google/gemini-3-flash" }
  },
  "background_task": {
    "defaultConcurrency": 5
  },
  "ralph_loop": {
    "enabled": true,
    "default_max_iterations": 100
  }
}
```

## Usage Patterns

### Loading Configuration
```typescript
import { loadConfig } from './config';

const config = loadConfig(process.cwd());

// Access agent config
const oracleConfig = config.agents?.oracle;
const model = oracleConfig?.model || 'openai/gpt-5.2';

// Access concurrency settings
const maxConcurrent = config.background_task?.defaultConcurrency || 5;
```

### Disabling Features
```typescript
// Disable specific hooks
{
  "disabled_hooks": ["todo-continuation-enforcer", "ralph-loop"]
}

// Disable specific agents
{
  "disabled_agents": ["oracle", "librarian"]
}

// Disable specific skills
{
  "disabled_skills": ["ultrawork", "ralplan"]
}
```

## Hook Types

Available hooks for configuration:
- `todo-continuation-enforcer` - Enforce todo completion
- `keyword-detector` - Detect magic keywords
- `ralph-loop` - Persistence mode
- `session-recovery` - Resume interrupted sessions
- `agent-usage-reminder` - Remind to use agents
- `context-window-monitor` - Track token usage
- `comment-checker` - Check code comments
- `tool-output-truncator` - Truncate large outputs
- `system-prompt-injector` - Inject custom prompts
- `persistent-mode` - Persistent execution
- `remember-tag-processor` - Process `<remember>` tags

## Agent Types (Legacy Names)

Historical agent names for backwards compatibility:
- `oracle` → now `architect`
- `librarian` → now `researcher`
- `explore` (unchanged)
- `frontend-ui-ux-engineer` → now `designer`
- `document-writer` → now `writer`
- `multimodal-looker` → now `vision`

## Implementation Details

### Comment Stripping
The `stripJsonComments()` function removes:
- Single-line comments: `// comment`
- Multi-line comments: `/* comment */`

This enables JSONC (JSON with Comments) support for configuration files.

### Error Handling
- **Parse errors**: Logged to console with warning
- **Validation errors**: Caught and logged via Zod parsing
- **Missing files**: Returns default configuration silently

### Type Safety
All configuration types are inferred from Zod schemas:
```typescript
const OmoOmcsConfigSchema = z.object({ /* ... */ });
export type OmoOmcsConfig = z.infer<typeof OmoOmcsConfigSchema>;
```

## Integration Points

- **Agent Registry**: `/home/calvin/workspace/omo-omcs/src/agents/` - Agent definitions use config
- **Plugin Handlers**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/` - Applies config to OpenCode agents
- **Skills**: Config controls which skills are enabled/disabled

## Design Principles

1. **Graceful degradation**: Missing config = use defaults
2. **Type safety**: Zod schemas prevent invalid config
3. **Flexibility**: Override any agent's model/temperature
4. **Backwards compatibility**: Support legacy agent names
5. **Comment support**: JSONC for better documentation

## Dependencies

- `node:fs` - File system access
- `node:path` - Path resolution
- `zod` - Schema validation

## Related Documentation

- [Agent Definitions](../agents/AGENTS.md) - Agent configuration targets
- [Plugin Handlers](../plugin-handlers/AGENTS.md) - Config application
