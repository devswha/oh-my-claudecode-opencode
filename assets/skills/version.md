---
name: version
description: Check OMCO plugin version and update status
user-invocable: true
---

# Version Check Skill

Display the current OMCO plugin version and check for updates.

## What to Do

When user invokes this skill, run the following checks:

### 1. Check Installed Version

```bash
# Read version from installed location
cat ~/.config/opencode/node_modules/oh-my-claudecode-opencode/package.json 2>/dev/null | grep '"version"' | head -1
```

### 2. Check Development Version (if in dev directory)

```bash
# If in oh-my-claudecode-opencode project directory
cat package.json 2>/dev/null | grep '"version"' | head -1
```

### 3. Check Latest Version on npm

```bash
npm view oh-my-claudecode-opencode version 2>/dev/null
```

## Output Format

Present the information in a clear table:

| Location | Version |
|----------|---------|
| Installed | X.X.X |
| Development | X.X.X (if applicable) |
| npm Latest | X.X.X |

### Status Indicators

- **Up to date**: Installed version matches npm latest
- **Update available**: npm has newer version
- **Ahead of npm**: Local version is higher (pre-release or unpublished)
- **Mismatch**: Development and installed versions differ

## Update Instructions

If update is available:
```bash
cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest
```

If development version differs from installed:
```bash
# From development directory
bun run build
cp -r dist/ ~/.config/opencode/node_modules/oh-my-claudecode-opencode/dist/
cp package.json ~/.config/opencode/node_modules/oh-my-claudecode-opencode/package.json
```

## After Update

Remind users to restart OpenCode for changes to take effect.
