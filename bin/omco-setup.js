#!/usr/bin/env node

// bin/omco-setup.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as readline from "node:readline";
var CONFIG_DIR = join(homedir(), ".config/opencode");
var CONFIG_FILE = join(CONFIG_DIR, "omco.json");
var TIER_PRESETS = {
  openai: {
    haiku: "openai/gpt-4o-mini",
    sonnet: "openai/gpt-4o",
    opus: "openai/o1"
  },
  google: {
    haiku: "google/gemini-2.0-flash",
    sonnet: "google/gemini-2.5-pro",
    opus: "google/gemini-2.5-pro"
  },
  anthropic: {
    haiku: "anthropic/claude-3-5-haiku-latest",
    sonnet: "anthropic/claude-sonnet-4-20250514",
    opus: "anthropic/claude-opus-4-20250514"
  },
  "github-copilot": {
    haiku: "github-copilot/claude-3.5-sonnet",
    sonnet: "github-copilot/claude-sonnet-4",
    opus: "github-copilot/claude-sonnet-4"
  }
};
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
async function main() {
  console.log(`
\uD83D\uDD27 OMCO Setup - Configure Model Tier Mapping
`);
  console.log(`This configures which models to use for subagents.
`);
  console.log(`Select your AI provider:
`);
  console.log("  1. OpenAI     - GPT-4o, GPT-5, o1, Codex");
  console.log("  2. Google     - Gemini models");
  console.log("  3. Anthropic  - Claude via API");
  console.log("  4. GitHub Copilot - Claude via GitHub");
  console.log("  5. Skip       - Don't configure (subagents inherit parent model)");
  console.log("");
  const choice = await prompt("Enter choice (1-5): ");
  const providers = ["openai", "google", "anthropic", "github-copilot"];
  const providerIndex = parseInt(choice, 10) - 1;
  if (choice === "5" || isNaN(providerIndex) || providerIndex < 0 || providerIndex > 3) {
    console.log(`
⏭️  Skipped. Subagents will inherit the parent session model.`);
    console.log(`   Run 'npx omco-setup' anytime to configure.
`);
    return;
  }
  const provider = providers[providerIndex];
  const tiers = TIER_PRESETS[provider];
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`
\uD83D\uDCC1 Created ${CONFIG_DIR}`);
  }
  let config = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      console.log(`\uD83D\uDCC4 Updating existing ${CONFIG_FILE}`);
    } catch {
      console.log(`⚠️  Could not parse existing config, creating new one`);
    }
  }
  config.model_mapping = {
    ...config.model_mapping || {},
    tierDefaults: tiers
  };
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + `
`);
  try {
    const written = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    if (written.model_mapping?.tierDefaults) {
      console.log(`
✅ Config verification passed.`);
    }
  } catch {
    console.error(`
⚠️ Warning: Could not verify written config.`);
  }
  console.log(`
✅ Configured tier mapping for ${provider}:
`);
  console.log(`   haiku  → ${tiers.haiku}`);
  console.log(`   sonnet → ${tiers.sonnet}`);
  console.log(`   opus   → ${tiers.opus}`);
  console.log(`
\uD83D\uDCDD Config saved to: ${CONFIG_FILE}`);
  console.log(`
\uD83D\uDD04 Restart OpenCode to apply changes.
`);
}
main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
