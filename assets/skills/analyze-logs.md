---
name: analyze-logs
description: Analyze OpenCode logs to find and fix OMCO bugs
user-invocable: true
---

# Analyze Logs Skill

OpenCode 로그를 분석하여 OMCO 플러그인의 버그를 찾고 수정 방안을 제안합니다.

## Invocation

User says: "analyze logs", "check logs", "find bugs in logs", "/oh-my-claudecode:analyze-logs"

Arguments: $ARGUMENTS

## OpenCode Log Location

```
~/.local/share/opencode/log/
```

Files are named by timestamp: `YYYY-MM-DDTHHMMSS.log`

## Log Format

```
LEVEL TIMESTAMP +XXms service=NAME key=value key=value...
```

Levels: INFO, WARN, ERROR

## Workflow

### Step 1: Find Recent Log Files

```bash
ls -lt ~/.local/share/opencode/log/ | head -10
```

### Step 2: Search for OMCO-related Errors

Look for patterns:
- `oh-my-claudecode`
- `omco`
- Plugin loading errors
- Hook execution failures
- Agent spawn failures

```bash
grep -i "error.*omco\|error.*oh-my-claudecode\|plugin.*error" ~/.local/share/opencode/log/*.log | tail -50
```

### Step 3: Analyze Error Patterns

Common OMCO issues to look for:

| Pattern | Meaning | Fix Location |
|---------|---------|--------------|
| `plugin.*load.*error` | Plugin failed to load | Check `src/index.ts` exports |
| `hook.*error` | Hook threw exception | Check hook files in `src/hooks/` |
| `agent.*spawn.*fail` | Agent didn't start | Check agent definition in `assets/agents/` |
| `skill.*not found` | Skill missing | Check `assets/skills/` |
| `config.*invalid` | Bad configuration | Check `src/config/index.ts` |

### Step 4: Find OMCO Source Code

After identifying the error, locate the relevant source file:

```bash
# Find files related to the error
grep -r "ERROR_MESSAGE_HERE" src/
```

### Step 5: Propose Fix

Based on the error analysis:
1. Read the relevant source file
2. Identify the bug
3. Propose a specific code fix
4. Optionally implement the fix with user permission

## Output Format

```markdown
## OMCO Log Analysis Report

### Summary
- Total errors found: X
- OMCO-related errors: Y
- Critical issues: Z

### Errors Found

#### Error 1: [Brief description]
- **Log entry**: `[timestamp] ERROR ...`
- **Source file**: `src/hooks/xxx.ts:123`
- **Root cause**: [Explanation]
- **Proposed fix**: [Code change or action]

### Recommendations

1. [Priority action]
2. [Secondary action]
```

## Example Usage

User: "analyze logs"
→ Read latest log files
→ Filter OMCO-related errors
→ Correlate with source code
→ Propose fixes

User: "analyze logs --last 3"
→ Analyze last 3 log files

User: "analyze logs --error-only"
→ Only show ERROR level entries
