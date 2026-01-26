# E2E Tests for OMCO

## Overview

This directory contains end-to-end tests that verify the complete npm installation and plugin loading workflow.

## Test Files

### `npm-install.test.ts`

Comprehensive E2E test that simulates the full npm installation process:

1. **Package Creation**: Packs the current package with `npm pack`
2. **Installation**: Installs the tarball in a temporary directory
3. **Structure Verification**: Validates package structure, files, and directories
4. **Asset Verification**: Confirms all agents and skills markdown files are included
5. **Plugin Loading**: Tests that the plugin can be imported and initialized
6. **Content Validation**: Validates agent and skill file contents

## Test Coverage (19 tests, 70 assertions)

### Package Structure (5 tests)
- ✓ Package.json validation
- ✓ Dist/ directory with compiled files
- ✓ Bin/ directory with executables
- ✓ Assets/agents/ directory with markdown files
- ✓ Assets/skills/ directory with markdown files

### Assets Directory (4 tests)
- ✓ All expected agent files present (30 agents)
- ✓ All expected skill files present (33 skills)
- ✓ Agent files can be read directly
- ✓ Skill files can be read directly

### Plugin Loading (4 tests)
- ✓ Plugin module can be imported
- ✓ Plugin initializes without errors
- ✓ OpenCode plugin API hooks present
- ✓ Returns proper config/event structure

### Content Validation (4 tests)
- ✓ Agent instructions non-empty with role info
- ✓ Key agents present (architect, executor, planner, explore)
- ✓ Skill instructions non-empty
- ✓ Orchestrate skill present with content

### Package Metadata (2 tests)
- ✓ Correct files array in package.json
- ✓ OpenCode peer dependency declared

## Running Tests

```bash
# Run all E2E tests
bun test tests/e2e/

# Run specific test file
bun test tests/e2e/npm-install.test.ts

# Run with verbose output
bun test tests/e2e/npm-install.test.ts --verbose
```

## Test Environment

- Creates temporary directory for installation
- Packs current package with npm
- Installs in temp location simulating `~/.config/opencode/`
- Cleans up all temporary files after completion

## Timeout

- Individual test timeout: 2 minutes
- npm operations timeout: 60 seconds (pack + install)

## What Gets Verified

### 1. Package Integrity
- All required files included in tarball
- Correct package.json metadata
- Proper file structure (dist/, assets/, bin/)

### 2. Asset Loading
- 30 agent markdown files present
- 33 skill markdown files present
- Files contain valid content
- Markdown/YAML frontmatter formatting

### 3. Plugin Functionality
- Can be imported from node_modules
- Initializes with proper OpenCode plugin structure
- Config handler present
- Event handlers registered

### 4. Installation Path Resolution
- Assets resolve from installed location
- No hardcoded paths breaking installation
- Works from `node_modules/oh-my-claudecode-opencode/`

## Key Test Patterns

### Dynamic Import from Installed Location
```typescript
const pluginPath = join(packagePath, 'dist', 'index.js');
const plugin = await import(pluginPath);
```

### Mock OpenCode Context
```typescript
const mockContext = {
  directory: tempDir,
  client: {
    log: () => {},
    error: () => {},
  },
};
```

### Cleanup Pattern
```typescript
afterAll(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  if (tarballPath && existsSync(tarballPath)) {
    rmSync(tarballPath, { force: true });
  }
});
```

## Expected Output

```
✓ npm installation E2E > package structure (5)
✓ npm installation E2E > assets directory (4)
✓ npm installation E2E > plugin loading (4)
✓ npm installation E2E > agent content validation (2)
✓ npm installation E2E > skill content validation (3)
✓ npm installation E2E > package metadata (2)

19 pass
0 fail
70 expect() calls
```

## Maintenance

When adding new agents/skills:
1. Update `EXPECTED_AGENTS` or `EXPECTED_SKILLS` in `tests/test-utils.ts`
2. Tests automatically validate 80% coverage threshold
3. No need to modify E2E tests unless structure changes

## Debugging

If tests fail:
- Check console output for temp directory path
- Inspect tarball contents with `tar -tzf oh-my-claudecode-opencode-*.tgz`
- Verify assets included in package.json `files` array
- Ensure build ran before tests (`bun run build`)
