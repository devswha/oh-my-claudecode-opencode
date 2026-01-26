---
name: omc-setup
description: Setup and configure oh-my-claudecode-opencode (the ONLY command you need to learn)
user-invocable: true
---

# OMCO Setup (OpenCode)

This is the **only command you need to learn**. After running this, everything else is automatic.

## Step 1: Configure Model Tier Mapping

Ask the user which AI provider they primarily use with AskUserQuestion:

**Question:** "Which AI provider do you use for OpenCode?"

**Options:**
1. **OpenAI** - GPT-4o, GPT-5, o1, Codex models
2. **Google** - Gemini models
3. **Anthropic (Claude)** - Claude models via API
4. **GitHub Copilot** - Claude models via GitHub Copilot
5. **Skip** - I'll configure manually later

### Based on choice, create `~/.config/opencode/omco.json`:

**OpenAI:**
```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/omco.json << 'EOF'
{
  "model_mapping": {
    "tierDefaults": {
      "haiku": "openai/gpt-4o-mini",
      "sonnet": "openai/gpt-4o",
      "opus": "openai/o1"
    }
  }
}
EOF
echo "Created omco.json with OpenAI tier mapping"
```

**Google:**
```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/omco.json << 'EOF'
{
  "model_mapping": {
    "tierDefaults": {
      "haiku": "google/gemini-2.0-flash",
      "sonnet": "google/gemini-2.5-pro",
      "opus": "google/gemini-2.5-pro"
    }
  }
}
EOF
echo "Created omco.json with Google tier mapping"
```

**Anthropic (Claude):**
```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/omco.json << 'EOF'
{
  "model_mapping": {
    "tierDefaults": {
      "haiku": "anthropic/claude-3-5-haiku-latest",
      "sonnet": "anthropic/claude-sonnet-4-20250514",
      "opus": "anthropic/claude-opus-4-20250514"
    }
  }
}
EOF
echo "Created omco.json with Anthropic tier mapping"
```

**GitHub Copilot:**
```bash
mkdir -p ~/.config/opencode
cat > ~/.config/opencode/omco.json << 'EOF'
{
  "model_mapping": {
    "tierDefaults": {
      "haiku": "github-copilot/claude-3.5-sonnet",
      "sonnet": "github-copilot/claude-sonnet-4",
      "opus": "github-copilot/claude-sonnet-4"
    }
  }
}
EOF
echo "Created omco.json with GitHub Copilot tier mapping"
```

**Skip:** Don't create omco.json. Subagents will inherit parent session model.

### Verify Configuration:
```bash
if [ -f ~/.config/opencode/omco.json ]; then
  echo "Tier mapping configured:"
  cat ~/.config/opencode/omco.json
else
  echo "No tier mapping configured (subagents will inherit parent model)"
fi
```

## Step 2: Verify Plugin Installation

```bash
# Check if plugin is in opencode.json
if grep -q "oh-my-claudecode-opencode" ~/.config/opencode/opencode.json 2>/dev/null; then
  echo "✅ Plugin registered in opencode.json"
else
  echo "⚠️ Plugin not in opencode.json - adding..."
  # Try to add plugin to config
  if [ -f ~/.config/opencode/opencode.json ]; then
    # File exists, need to merge
    echo "Please add 'oh-my-claudecode-opencode' to the plugin array in ~/.config/opencode/opencode.json"
  else
    mkdir -p ~/.config/opencode
    echo '{"plugin":["oh-my-claudecode-opencode"]}' > ~/.config/opencode/opencode.json
    echo "✅ Created opencode.json with plugin"
  fi
fi
```

## Step 3: Check Installed Version

```bash
# Check installed version
if [ -d ~/.config/opencode/node_modules/oh-my-claudecode-opencode ]; then
  INSTALLED=$(grep '"version"' ~/.config/opencode/node_modules/oh-my-claudecode-opencode/package.json 2>/dev/null | head -1 | sed 's/.*"\([0-9.]*\)".*/\1/')
  echo "Installed version: $INSTALLED"

  # Check npm for latest
  LATEST=$(npm view oh-my-claudecode-opencode version 2>/dev/null)
  if [ -n "$LATEST" ]; then
    if [ "$INSTALLED" != "$LATEST" ]; then
      echo "⚠️ Update available: $LATEST"
      echo "Run: cd ~/.config/opencode && npm update oh-my-claudecode-opencode"
    else
      echo "✅ You're on the latest version"
    fi
  fi
else
  echo "⚠️ Plugin not installed. Run:"
  echo "cd ~/.config/opencode && npm install oh-my-claudecode-opencode"
fi
```

## Step 4: Show Welcome Message

```
OMCO Setup Complete! (oh-my-claudecode-opencode)

You don't need to learn any commands. I now have intelligent behaviors that activate automatically.

WHAT HAPPENS AUTOMATICALLY:
- Complex tasks -> I parallelize and delegate to specialists
- "plan this" -> I start a planning interview
- "don't stop until done" -> I persist until verified complete
- "stop" or "cancel" -> I intelligently stop current operation

MAGIC KEYWORDS (optional power-user shortcuts):
Just include these words naturally in your request:

| Keyword | Effect | Example |
|---------|--------|---------|
| ralph | Persistence mode | "ralph: fix the auth bug" |
| ralplan | Iterative planning | "ralplan this feature" |
| ulw | Max parallelism | "ulw refactor the API" |
| plan | Planning interview | "plan the new endpoints" |

Combine them: "ralph ulw: migrate the database"

AVAILABLE COMMANDS:
- /version - Check plugin version
- /status - Show active modes
- /doctor - Diagnose issues
- /help - Usage guide

MODEL TIER MAPPING:
Your subagents will use the tier mapping you configured.
Edit ~/.config/opencode/omco.json to customize.

Restart OpenCode to apply changes!
```
