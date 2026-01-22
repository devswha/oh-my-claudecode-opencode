# Test Suite

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode 기능의 포팅 검증을 위한 테스트 스위트. 테스트는 포팅된 기능들(ralph loop, ultrawork, 노트패드, PRD 등)이 oh-my-claudecode와 동일하게 작동하는지 검증한다. 테스트 커버리지는 포팅의 정확성을 보장하기 위해 설계되었다.

## Overview

This directory contains the comprehensive test suite for omo-omcs, covering unit tests, integration tests, and feature-specific test suites using Bun's test runner.

## Architecture

The test suite is organized by concern:
- **Hook tests**: Verify plugin hook behavior
- **Integration tests**: End-to-end plugin flow testing
- **Feature tests**: Specific feature validation (notepad, PRD, etc.)

Test framework: **Bun Test** (`bun:test`)

## Key Files

### `hooks.test.ts`
**Purpose**: Unit tests for plugin hooks
**Coverage**:
- Keyword detector hook (ultrawork, ralph detection)
- Mode transitions and activation
- System prompt injection
- Hook event handling

**Test Categories**:
- Keyword detection (ultrawork, ralph-loop, ultrawork-ralph)
- Mode state management
- Output transformation

### `integration.test.ts`
**Purpose**: Full plugin integration tests
**Coverage**:
- Plugin initialization
- Hook registration and execution
- Multi-mode workflows
- Client API interactions
- Session management

**Test Categories**:
- Plugin lifecycle (init, teardown)
- Mode transitions across hooks
- System prompt injection pipeline
- Completion detection
- Todo list integration

### `notepad.test.ts`
**Purpose**: Notepad memory system tests
**Coverage**:
- Notepad initialization
- Priority context management
- Working memory entries
- Manual entries
- Entry pruning (time-based expiration)
- `<remember>` tag processing
- Context formatting

**Test Categories**:
- File operations (create, read, update)
- Section management (priority, working, manual)
- Entry lifecycle (add, prune, stats)
- Tag processing (`<remember>`, `<remember priority>`)

## Test Structure

### Test Setup Pattern
```typescript
import { describe, it, expect, beforeEach, mock } from "bun:test";

describe("Feature Name", () => {
  beforeEach(() => {
    // Reset mocks
    mock.restore();
    // Clean test data
  });

  it("should perform specific behavior", async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Mock Client Pattern
```typescript
const mockClient = {
  session: {
    create: mock(() => Promise.resolve({ data: { id: "test-session" } })),
    prompt: mock(() => Promise.resolve({})),
    messages: mock(() => Promise.resolve({ data: [] })),
    todo: mock(() => Promise.resolve({ data: [] })),
  },
  tui: {
    showToast: mock(() => Promise.resolve({})),
  },
};
```

### Mock Context Pattern
```typescript
const mockCtx = {
  client: mockClient,
  directory: "/tmp/test",
  project: { path: "/tmp/test" },
  worktree: "/tmp/test",
  serverUrl: new URL("http://localhost:3000"),
  $: {} as unknown,
};
```

## Test Coverage

### Hooks (hooks.test.ts)

#### Keyword Detector
- ✅ Detects "ultrawork" keyword
- ✅ Detects "ralph-loop" keyword
- ✅ Detects combined "ultrawork-ralph" command
- ✅ Transforms message parts to include mode prompts
- ✅ Calls onModeChange callback with correct mode

#### Expected Behaviors
- Mode detection from user messages
- Output transformation (inject mode prompts)
- Callback invocation with mode info

### Integration (integration.test.ts)

#### Plugin Lifecycle
- ✅ Plugin initializes successfully
- ✅ Returns all required hooks
- ✅ Hooks execute without errors

#### Mode Transitions
- ✅ Normal → Ultrawork transition
- ✅ Normal → Ralph-loop transition
- ✅ Normal → Ultrawork-ralph transition
- ✅ Mode state persists across hooks

#### System Injection
- ✅ Ultrawork prompt injected correctly
- ✅ Ralph-loop prompt injected correctly
- ✅ Combined mode prompts merge properly

#### Session Management
- ✅ Unique session IDs prevent conflicts
- ✅ Session state isolated between tests
- ✅ Mock client API calls tracked

### Notepad (notepad.test.ts)

#### Initialization
- ✅ Creates notepad.md file
- ✅ Initializes with correct structure
- ✅ Returns true on success

#### Priority Context
- ✅ Sets priority context
- ✅ Retrieves priority context
- ✅ Persists across reads

#### Working Memory
- ✅ Adds working memory entries
- ✅ Entries include timestamps
- ✅ Retrieves all entries
- ✅ Formats as markdown

#### Manual Entries
- ✅ Adds manual entries
- ✅ Custom section support
- ✅ Retrieves by section
- ✅ Multi-entry support

#### Entry Pruning
- ✅ Prunes entries older than threshold
- ✅ Keeps recent entries
- ✅ Working memory pruned correctly
- ✅ Manual entries pruned correctly

#### Remember Tags
- ✅ Processes `<remember>` tags
- ✅ Processes `<remember priority>` tags
- ✅ Removes tags from content
- ✅ Adds to appropriate sections

#### Statistics
- ✅ Returns entry counts
- ✅ Returns section sizes
- ✅ Calculates total entries

#### Context Formatting
- ✅ Formats full context as markdown
- ✅ Includes all sections
- ✅ Proper heading levels
- ✅ Timestamp formatting

## Running Tests

### Run All Tests
```bash
bun test
```

### Run Specific Test File
```bash
bun test tests/hooks.test.ts
bun test tests/integration.test.ts
bun test tests/notepad.test.ts
```

### Run with Coverage
```bash
bun test --coverage
```

### Watch Mode
```bash
bun test --watch
```

## Test Utilities

### Unique Session IDs
```typescript
let testCounter = 0;
const uniqueSessionId = () => `test-session-${Date.now()}-${++testCounter}`;
```

Prevents state conflicts between parallel tests.

### Cleanup Patterns

#### File Cleanup
```typescript
beforeEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
});
```

#### Mock Cleanup
```typescript
beforeEach(() => {
  mock.restore();
});
```

## Assertions

### Common Patterns

#### Value Assertions
```typescript
expect(value).toBe(expected);
expect(value).toEqual(expected);
expect(value).toBeGreaterThan(0);
expect(array).toContain(item);
```

#### Type Assertions
```typescript
expect(value).toBeTypeOf("string");
expect(value).toBeInstanceOf(Class);
```

#### Truthiness
```typescript
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
```

#### Async Assertions
```typescript
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);
```

## Mocking Strategies

### Function Mocks
```typescript
import { mock } from "bun:test";

const fn = mock((arg) => arg * 2);
fn(5); // 10

expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(5);
expect(fn).toHaveBeenCalledTimes(1);
```

### Module Mocks
```typescript
// Mock entire module
mock.module("../src/config", () => ({
  loadConfig: mock(() => ({ /* config */ }))
}));
```

### Client API Mocks
```typescript
const mockClient = {
  session: {
    create: mock(() => Promise.resolve({ data: { id: "test" } })),
    prompt: mock(() => Promise.resolve({})),
  },
};
```

## Testing Best Practices

### 1. Isolation
- Each test should be independent
- Use beforeEach/afterEach for cleanup
- Don't rely on test execution order

### 2. Clarity
- Descriptive test names
- Arrange-Act-Assert pattern
- One assertion per logical concept

### 3. Coverage
- Happy paths
- Error cases
- Edge cases (empty input, null, undefined)
- Boundary conditions

### 4. Speed
- Keep tests fast (<100ms each)
- Use mocks for external dependencies
- Minimize file I/O

### 5. Maintainability
- DRY: Extract common setup to helpers
- Clear variable names
- Comments for complex test logic

## Test Organization

### File Naming
- `*.test.ts` - Test files
- Match source file names: `hooks.test.ts` tests `hooks/*`

### Describe Blocks
- Top level: Module/feature name
- Nested: Function/class being tested
- Deep nested: Specific scenarios

```typescript
describe("Module Name", () => {
  describe("functionName", () => {
    it("should handle specific case", () => {
      // Test
    });
  });
});
```

## Integration Points

Tests verify integration with:
- **OpenCode SDK**: `@opencode-ai/plugin` - Client API
- **Config System**: `/home/calvin/workspace/omo-omcs/src/config/` - Configuration loading
- **Hook System**: `/home/calvin/workspace/omo-omcs/src/hooks/` - Plugin hooks
- **Agent System**: `/home/calvin/workspace/omo-omcs/src/agents/` - Agent definitions
- **PRD System**: `/home/calvin/workspace/omo-omcs/src/prd/` - Task tracking
- **Notepad System**: `/home/calvin/workspace/omo-omcs/src/hooks/notepad.ts` - Memory system

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
```

## Future Test Coverage

### Planned Tests
- **PRD Management**: prd-manager.test.ts
- **Progress Tracking**: progress-tracker.test.ts
- **Agent Registration**: agents.test.ts
- **Config Loading**: config.test.ts
- **Slash Commands**: commands.test.ts
- **Session State**: session-state.test.ts
- **Logger**: logger.test.ts

### Test Scenarios
- Multi-agent coordination
- Ralph-loop iteration limits
- PRD user story completion
- Config override precedence
- Error handling paths
- Concurrent session management

## Debugging Tests

### Enable Debug Output
```bash
DEBUG=true bun test
```

### Run Single Test
```typescript
it.only("should test specific behavior", () => {
  // Only this test runs
});
```

### Skip Test
```typescript
it.skip("should be implemented later", () => {
  // Test skipped
});
```

### Verbose Output
```bash
bun test --verbose
```

## Dependencies

- `bun:test` - Test framework
- `node:fs` - File system (for notepad tests)
- `node:path` - Path utilities
- `@opencode-ai/plugin` - SDK types for mocking

## Related Documentation

- [Hooks](../src/hooks/AGENTS.md) - Hook implementations tested
- [Config System](../src/config/AGENTS.md) - Config loading tested
- [PRD System](../src/prd/AGENTS.md) - PRD operations tested
- [Agent System](../src/agents/AGENTS.md) - Agent registration tested
