# OMCO Installation Guide

> This guide is optimized for AI agents. If you're human, just copy the prompt below and paste it to your AI assistant.

## Quick Install (For Humans)

Tell your AI assistant:

> "Install oh-my-claudecode-opencode by following these instructions: https://raw.githubusercontent.com/devswha/oh-my-claudecode-opencode/main/docs/guide/installation.md"

---

## Installation Steps (For AI Agents)

### Step 1: Create OpenCode plugins directory

```bash
mkdir -p ~/.opencode/plugins
```

### Step 2: Install the package

```bash
cd ~/.opencode && npm install oh-my-claudecode-opencode@latest
```

### Step 3: Create plugin loader

```bash
cat > ~/.opencode/plugins/omco.ts << 'EOF'
import OmoOmcsPlugin from "oh-my-claudecode-opencode";
export default OmoOmcsPlugin;
EOF
```

### Step 4: Verify installation

```bash
npm list oh-my-claudecode-opencode --depth=0
```

### Step 5: Restart OpenCode

Tell the user to restart OpenCode (Ctrl+C and reopen) to load the plugin.

## Verification

After restart, the OMCO agent should appear in the Tab menu. Test with:

```
/ultrawork hello world
```

## One-liner Install

For convenience:

```bash
mkdir -p ~/.opencode/plugins && cd ~/.opencode && npm install oh-my-claudecode-opencode@latest && echo 'import OmoOmcsPlugin from "oh-my-claudecode-opencode";
export default OmoOmcsPlugin;' > plugins/omco.ts && echo "✅ OMCO installed! Restart OpenCode to activate."
```

## Update

```bash
cd ~/.opencode && npm update oh-my-claudecode-opencode && npm list oh-my-claudecode-opencode --depth=0
```

Then restart OpenCode.

## Troubleshooting

- If OMCO doesn't appear in Tab menu: Ensure you restarted OpenCode
- If npm install fails: Check Node.js version (requires 18+)
- For diagnostics: `/doctor` command

---

*Repository: https://github.com/devswha/oh-my-claudecode-opencode*
