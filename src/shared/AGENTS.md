# Shared Utilities

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

공유 유틸리티. oh-my-claudecode와 동일한 로깅 패턴 및 세션 상태 관리. logger.ts와 session-state.ts는 oh-my-claudecode의 공유 유틸리티를 포팅한 것으로, DEBUG 플래그 기반 로깅과 세션 추적 메커니즘이 동일하게 작동한다.

## Overview

This directory provides shared utility modules used across the omo-omcs codebase. These utilities handle cross-cutting concerns like logging and session state management.

## Architecture

Shared utilities follow these principles:
- **Single responsibility**: Each module handles one concern
- **Zero dependencies**: No imports from other omo-omcs modules
- **Environment-aware**: Respect DEBUG environment variables
- **Type-safe**: Full TypeScript type coverage

## Key Files

### `logger.ts`
**Purpose**: Debug and error logging with conditional output
**Exports**:
- `log(message, data?)` - Debug-level logging (respects DEBUG flag)
- `warn(message, data?)` - Warning-level logging (always shown)
- `error(message, data?)` - Error-level logging (always shown)

**Environment Variables**:
- `DEBUG=true` - Enable debug logging
- `OMO_OMCS_DEBUG=true` - Alternative flag for debug logging

### `session-state.ts`
**Purpose**: Session and agent tracking for multi-agent coordination
**Exports**:
- `getMainSessionID()` - Get primary session ID
- `setMainSessionID(sessionID)` - Set primary session ID
- `getSessionAgent(sessionID)` - Get agent name for session
- `setSessionAgent(sessionID, agent)` - Map session to agent
- `clearSessionAgent(sessionID)` - Remove session mapping

## Logger Implementation

### Log Levels

| Function | Output | When Shown | Use Case |
|----------|--------|------------|----------|
| `log()` | stdout | DEBUG=true only | Development debugging |
| `warn()` | stderr | Always | Recoverable issues |
| `error()` | stderr | Always | Fatal errors |

### Output Format
```
[omo-omcs] 2026-01-22T10:30:45.123Z <message> {"key":"value"}
[omo-omcs] 2026-01-22T10:30:45.456Z WARN: <message> {"key":"value"}
[omo-omcs] 2026-01-22T10:30:45.789Z ERROR: <message> {"key":"value"}
```

### Usage Examples

#### Basic Logging
```typescript
import { log } from './shared/logger';

log('Agent registered', { name: 'architect', model: 'opus' });
// Output (if DEBUG=true):
// [omo-omcs] 2026-01-22T10:30:45.123Z Agent registered {"name":"architect","model":"opus"}
```

#### Warning Logging
```typescript
import { warn } from './shared/logger';

warn('Config file not found', { path: '/path/to/config.json' });
// Output (always shown):
// [omo-omcs] 2026-01-22T10:30:45.456Z WARN: Config file not found {"path":"/path/to/config.json"}
```

#### Error Logging
```typescript
import { error } from './shared/logger';

error('Failed to parse PRD', { file: 'prd.json', reason: 'Invalid JSON' });
// Output (always shown):
// [omo-omcs] 2026-01-22T10:30:45.789Z ERROR: Failed to parse PRD {"file":"prd.json","reason":"Invalid JSON"}
```

### Debug Mode Activation

Enable debug logging:
```bash
# Option 1
export DEBUG=true

# Option 2
export OMO_OMCS_DEBUG=true

# Run command
opencode "task description"
```

Disable debug logging:
```bash
unset DEBUG
unset OMO_OMCS_DEBUG
```

## Session State Management

### Purpose

Track which agents are handling which sessions during multi-agent orchestration. Prevents:
- Session ID collisions
- Agent confusion
- Lost session context

### State Storage

In-memory storage using JavaScript Maps:
```typescript
let mainSessionID: string | undefined;
const sessionAgents = new Map<string, string>();
```

### Session Lifecycle

#### 1. Main Session Tracking
```typescript
import { setMainSessionID, getMainSessionID } from './shared/session-state';

// When primary orchestrator starts
setMainSessionID(currentSessionID);

// Later, check if we're in main session
if (getMainSessionID() === currentSessionID) {
  // Main session logic
}
```

#### 2. Agent Session Mapping
```typescript
import { setSessionAgent, getSessionAgent } from './shared/session-state';

// When spawning a subagent
const agentSessionID = await spawnAgent('architect');
setSessionAgent(agentSessionID, 'architect');

// Later, identify which agent owns session
const agentName = getSessionAgent(agentSessionID);
// 'architect'
```

#### 3. Session Cleanup
```typescript
import { clearSessionAgent } from './shared/session-state';

// When agent completes
clearSessionAgent(agentSessionID);
```

### Usage Patterns

#### Multi-Agent Coordination
```typescript
// Orchestrator spawns multiple agents
const exploreSession = await spawnAgent('explore');
setSessionAgent(exploreSession, 'explore');

const architectSession = await spawnAgent('architect');
setSessionAgent(architectSession, 'architect');

// Check which agent is which
if (getSessionAgent(sessionID) === 'architect') {
  // Handle architect response
} else if (getSessionAgent(sessionID) === 'explore') {
  // Handle explore response
}
```

#### Session Isolation
```typescript
// Ensure we're in the main session
function ensureMainSession() {
  const mainID = getMainSessionID();
  if (!mainID) {
    throw new Error('No main session set');
  }
  return mainID;
}
```

## Design Principles

### Logger
1. **Conditional output**: Debug logs only when needed
2. **Consistent format**: Timestamp + prefix + message + data
3. **Structured data**: JSON-serialized data objects
4. **Stream separation**: stdout for debug, stderr for warnings/errors
5. **Zero config**: Works out of the box, debug via env vars

### Session State
1. **Simplicity**: Minimal API surface
2. **Type safety**: String types for IDs and agent names
3. **No persistence**: In-memory only (resets on restart)
4. **Explicit cleanup**: Manual session clearing
5. **Optional main session**: Can be undefined

## Integration Points

Used by virtually all modules:
- **Agent System**: `/home/calvin/workspace/omo-omcs/src/agents/` - Session tracking
- **Config System**: `/home/calvin/workspace/omo-omcs/src/config/` - Config load logging
- **Plugin Handlers**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/` - Registration logging
- **PRD System**: `/home/calvin/workspace/omo-omcs/src/prd/` - Operation logging
- **Tests**: `/home/calvin/workspace/omo-omcs/tests/` - Test logging

## Performance Considerations

### Logger
- Debug logs are **no-op** when DEBUG=false (minimal overhead)
- JSON.stringify() only called when logging enabled
- No file I/O (console output only)

### Session State
- O(1) Map lookups
- No serialization overhead
- Small memory footprint (typically <100 entries)

## Testing Support

### Mock Logger
```typescript
// For testing without console spam
const mockLog = jest.fn();
jest.mock('./shared/logger', () => ({
  log: mockLog,
  warn: jest.fn(),
  error: jest.fn()
}));
```

### Session State Testing
```typescript
// Clean state between tests
import { clearSessionAgent } from './shared/session-state';

afterEach(() => {
  // Clear all session mappings
  // (Note: No clearAll() function, must track IDs)
});
```

## Error Handling

### Logger
- JSON.stringify() errors: Fall back to string representation
- No exceptions thrown (logging is non-critical)

### Session State
- Missing sessions: Return `undefined`
- Duplicate sets: Overwrite silently
- Clear non-existent: No-op

## Migration Notes

### From Console.log
```typescript
// Old
console.log('Agent registered', name);

// New
import { log } from './shared/logger';
log('Agent registered', { name });
```

### From Global State
```typescript
// Old
globalThis.__omo_session_id = sessionID;

// New
import { setMainSessionID } from './shared/session-state';
setMainSessionID(sessionID);
```

## Future Enhancements

### Logger
- Log levels (TRACE, DEBUG, INFO, WARN, ERROR)
- File output support
- Structured logging formats (JSON lines)
- Log rotation

### Session State
- Persistence (file-based or Redis)
- Session expiration/TTL
- Session hierarchy tracking
- Bulk cleanup operations

## Dependencies

- `node:process` - Environment variable access (implicit)

## Related Documentation

- [Agent Definitions](../agents/AGENTS.md) - Uses logger and session state
- [PRD System](../prd/AGENTS.md) - Uses logger
- [Plugin Handlers](../plugin-handlers/AGENTS.md) - Uses logger
- [Tests](../../tests/AGENTS.md) - Uses logger for test output
