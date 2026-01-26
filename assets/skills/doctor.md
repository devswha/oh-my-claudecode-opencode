---
name: doctor
description: Diagnose and fix OMCO installation issues for OpenCode
user-invocable: true
---

# Doctor Skill (OpenCode)

## Quick Diagnosis

When users report "OMCO agent not showing in Tab menu" or similar issues, guide them to run:

```bash
npx oh-my-claudecode-opencode doctor
```

Or if npx is not available:
```bash
cd ~/.config/opencode && node node_modules/oh-my-claudecode-opencode/bin/doctor.js
```

## 5 Failure Modes

The doctor tool checks for 5 common failure modes:

| # | Check | What It Means |
|---|-------|---------------|
| 1 | Plugin Installed | Is the package in `~/.config/opencode/node_modules/`? |
| 2 | Plugin in Config | Is it registered in `opencode.json` `plugin` array? |
| 3 | Assets Present | Do `assets/agents/*.md` files exist? |
| 4 | Package Dependency | Is it listed in `package.json` dependencies? |
| 5 | OMCO Config Valid | Is `omco.json` valid JSON (if exists)? |

## Report Analysis

When a user pastes a diagnostic report (JSON or text), analyze it:

1. **Identify failures**: Look for `FAIL` or `status: "FAIL"` entries
2. **Check warnings**: Look for `WARN` entries
3. **Extract recommendations**: The report includes fix commands

## Interpreting Results

### Exit Codes
- **0**: All checks passed - plugin should work
- **1**: Critical failure - plugin won't work until fixed
- **2**: Warnings only - plugin may work but issues exist

### Common Fixes

**Plugin Not Installed (FAIL)**
```bash
cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest
```

**Plugin Not in Config (FAIL)**
```bash
# Create or edit ~/.config/opencode/opencode.json
cat > ~/.config/opencode/opencode.json << 'EOF'
{
  "plugin": ["oh-my-claudecode-opencode"]
}
EOF
```

**Assets Directory Missing (FAIL)**
```bash
# Reinstall to get fresh assets
cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest --force
```

**Package Dependency Missing (WARN)**
```bash
cd ~/.config/opencode && npm install oh-my-claudecode-opencode --save
```

## After Fixes

Always remind users to **restart OpenCode** after making fixes:
- Close OpenCode (Ctrl+C)
- Reopen OpenCode

## Reporting Issues

If the doctor tool doesn't identify the problem, ask users to:
1. Share the full doctor report (JSON format preferred)
2. Share their OpenCode version: `opencode --version`
3. Open an issue: https://github.com/devswha/oh-my-claudecode-opencode/issues
