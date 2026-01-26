# OMCO Installation Guide

> This guide is optimized for AI agents. If you're human, just copy the prompt below and paste it to your AI assistant.

## Quick Install (For Humans)

Tell your AI assistant:

> "Install oh-my-claudecode-opencode by following these instructions: https://raw.githubusercontent.com/devswha/oh-my-claudecode-opencode/main/docs/guide/installation.md"

---

## Installation Steps (For AI Agents)

### Step 1: Install the package globally in OpenCode config

```bash
cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest
```

### Step 2: Register the plugin in opencode.json

Create or update `~/.config/opencode/opencode.json`:

```bash
# If opencode.json doesn't exist, create it:
cat > ~/.config/opencode/opencode.json << 'EOF'
{
  "plugin": [
    "oh-my-claudecode-opencode"
  ]
}
EOF
```

If `opencode.json` already exists, add `"oh-my-claudecode-opencode"` to the `"plugin"` array:

```json
{
  "plugin": [
    "existing-plugin",
    "oh-my-claudecode-opencode"
  ]
}
```

### Step 3: Verify installation

```bash
cd ~/.config/opencode && npm list oh-my-claudecode-opencode --depth=0
cat ~/.config/opencode/opencode.json
```

### Step 4: Restart OpenCode

Tell the user to restart OpenCode (Ctrl+C and reopen) to load the plugin.

## Verification

After restart, the OMCO agent should appear in the Tab menu. Test with:

```
/ultrawork hello world
```

## One-liner Install

For new installations (creates opencode.json):

```bash
cd ~/.config/opencode && npm install oh-my-claudecode-opencode@latest && cat > opencode.json << 'EOF'
{
  "plugin": [
    "oh-my-claudecode-opencode"
  ]
}
EOF
echo "✅ OMCO installed! Restart OpenCode to activate."
```

## Update

```bash
cd ~/.config/opencode && npm update oh-my-claudecode-opencode && npm list oh-my-claudecode-opencode --depth=0
```

Then restart OpenCode.

## Troubleshooting

- If OMCO doesn't appear in Tab menu: Ensure you restarted OpenCode
- If npm install fails: Check Node.js version (requires 18+)
- Verify plugin is registered: `cat ~/.config/opencode/opencode.json`
- For diagnostics: `/doctor` command

---

*Repository: https://github.com/devswha/oh-my-claudecode-opencode*
