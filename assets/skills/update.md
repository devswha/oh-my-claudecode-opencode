---
name: update
description: Check for OMCO updates and provide upgrade instructions
user-invocable: true
---

# Update Skill

OMCO 플러그인의 새 버전을 확인하고 업그레이드 방법을 안내합니다.

## Invocation

User says: "update", "check for updates", "upgrade omco", "/oh-my-claudecode:update"

## Workflow

### Step 1: Check Current Version

Read the installed version:

```bash
cat ~/.config/opencode/node_modules/oh-my-claudecode-opencode/package.json | grep '"version"'
```

### Step 2: Check Latest Version on npm

```bash
npm view oh-my-claudecode-opencode version
```

### Step 3: Compare Versions

If current < latest, show update instructions.

## Output Format

### Update Available

```
📦 OMCO Update Available

Current Version: X.X.X
Latest Version:  Y.Y.Y

To update, run:

  cd ~/.config/opencode && npm update oh-my-claudecode-opencode

Then restart OpenCode (Ctrl+C and reopen).
```

### Already Up to Date

```
✅ OMCO is up to date

Current Version: X.X.X

You're running the latest version.
```

### Error Handling

If npm check fails (network error):

```
⚠️ Could not check for updates

Current Version: X.X.X

Manual check: npm view oh-my-claudecode-opencode version
```

## Example

User: "/update"

1. Read current version from installed package
2. Query npm for latest version
3. Compare and show result with upgrade instructions if needed
