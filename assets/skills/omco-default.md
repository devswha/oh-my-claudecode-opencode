---
name: omco-default
description: Configure OMCO in local project (.opencode/omco.json)
user-invocable: true
---

# OMCO Default (Project-Scoped)

Configure oh-my-claudecode-opencode settings for the current project.

## Task: Create Project-Local Configuration

### Step 1: Create Local .opencode Directory

```bash
mkdir -p .opencode && echo "✅ .opencode directory created"
```

### Step 2: Create Project omco.json

Ask user which AI provider they use (same as /omco-setup):

**Question:** "Which AI provider do you use for this project?"

**Options:**
1. **OpenAI** - GPT-4o, GPT-5, o1, Codex
2. **Google** - Gemini models
3. **Anthropic** - Claude via API
4. **GitHub Copilot** - Claude via GitHub
5. **Inherit Global** - Use ~/.config/opencode/omco.json settings

### Based on choice, create `.opencode/omco.json`:

**OpenAI:**
```bash
cat > .opencode/omco.json << 'EOF'
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
echo "✅ Created .opencode/omco.json with OpenAI tier mapping"
```

**Google:**
```bash
cat > .opencode/omco.json << 'EOF'
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
echo "✅ Created .opencode/omco.json with Google tier mapping"
```

**Anthropic:**
```bash
cat > .opencode/omco.json << 'EOF'
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
echo "✅ Created .opencode/omco.json with Anthropic tier mapping"
```

**GitHub Copilot:**
```bash
cat > .opencode/omco.json << 'EOF'
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
echo "✅ Created .opencode/omco.json with GitHub Copilot tier mapping"
```

**Inherit Global:** Skip creating local config.

### Step 3: Confirm Success

After completing, report:

```
✅ OMCO Project Configuration Complete
- Config: .opencode/omco.json
- Scope: PROJECT (applies only to this directory)
- Priority: Project config overrides global config

Restart OpenCode to apply changes.
```

---

## Configuration Priority

1. `.opencode/omco.json` (project) - highest priority
2. `~/.config/opencode/omco.json` (global)
3. Plugin defaults (subagents inherit parent model)

---

## Related Commands

- `/omco-default` (this): Project-scoped configuration
- `/omco-default-global`: Global configuration
- `/omco-setup`: Full setup wizard
