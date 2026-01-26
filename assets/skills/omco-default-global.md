---
name: omco-default-global
description: Configure OMCO globally in ~/.config/opencode/omco.json
user-invocable: true
---

# OMCO Default Global

Configure oh-my-claudecode-opencode settings globally (all projects).

## Task: Create Global Configuration

### Step 1: Ensure Config Directory Exists

```bash
mkdir -p ~/.config/opencode && echo "✅ Config directory ready"
```

### Step 2: Create Global omco.json

Ask user which AI provider they use (same as /omco-setup):

**Question:** "Which AI provider do you use?"

**Options:**
1. **OpenAI** - GPT-4o, GPT-5, o1, Codex
2. **Google** - Gemini models
3. **Anthropic** - Claude via API
4. **GitHub Copilot** - Claude via GitHub

### Based on choice, create `~/.config/opencode/omco.json`:

**OpenAI:**
```bash
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
echo "✅ Created global omco.json with OpenAI tier mapping"
```

**Google:**
```bash
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
echo "✅ Created global omco.json with Google tier mapping"
```

**Anthropic:**
```bash
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
echo "✅ Created global omco.json with Anthropic tier mapping"
```

**GitHub Copilot:**
```bash
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
echo "✅ Created global omco.json with GitHub Copilot tier mapping"
```

### Step 3: Verify Configuration

```bash
echo "Global configuration:"
cat ~/.config/opencode/omco.json
```

### Step 4: Confirm Success

After completing, report:

```
✅ OMCO Global Configuration Complete
- Config: ~/.config/opencode/omco.json
- Scope: GLOBAL (applies to all projects)
- Override: Projects can override with .opencode/omco.json

Restart OpenCode to apply changes.
```

---

## Configuration Priority

1. `.opencode/omco.json` (project) - highest priority
2. `~/.config/opencode/omco.json` (global) - this config
3. Plugin defaults (subagents inherit parent model)

---

## Related Commands

- `/omco-default-global` (this): Global configuration
- `/omco-default`: Project-scoped configuration
- `/omco-setup`: Full setup wizard
