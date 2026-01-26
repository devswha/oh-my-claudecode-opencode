#!/usr/bin/env node
/**
 * OMCO Setup CLI - Configure tierDefaults without needing OpenCode
 *
 * Usage: npx omco-setup
 *
 * This allows users to configure tier mapping even when their main model
 * causes 401 errors (e.g., when using Codex without proper access).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import * as readline from "node:readline";

const CONFIG_DIR = join(homedir(), ".config/opencode");
const CONFIG_FILE = join(CONFIG_DIR, "omco.json");

const TIER_PRESETS: Record<string, { haiku: string; sonnet: string; opus: string }> = {
  openai: {
    haiku: "openai/gpt-4o-mini",
    sonnet: "openai/gpt-4o",
    opus: "openai/o1",
  },
  google: {
    haiku: "google/gemini-2.0-flash",
    sonnet: "google/gemini-2.5-pro",
    opus: "google/gemini-2.5-pro",
  },
  anthropic: {
    haiku: "anthropic/claude-3-5-haiku-latest",
    sonnet: "anthropic/claude-sonnet-4-20250514",
    opus: "anthropic/claude-opus-4-20250514",
  },
  "github-copilot": {
    haiku: "github-copilot/claude-3.5-sonnet",
    sonnet: "github-copilot/claude-sonnet-4",
    opus: "github-copilot/claude-sonnet-4",
  },
};

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n🔧 OMCO Setup - Configure Model Tier Mapping\n");
  console.log("This configures which models to use for subagents.\n");

  console.log("Select your AI provider:\n");
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
    console.log("\n⏭️  Skipped. Subagents will inherit the parent session model.");
    console.log("   Run 'npx omco-setup' anytime to configure.\n");
    return;
  }

  const provider = providers[providerIndex];
  const tiers = TIER_PRESETS[provider];

  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`\n📁 Created ${CONFIG_DIR}`);
  }

  // Load existing config or create new
  let config: Record<string, unknown> = {};
  if (existsSync(CONFIG_FILE)) {
    try {
      config = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
      console.log(`📄 Updating existing ${CONFIG_FILE}`);
    } catch {
      console.log(`⚠️  Could not parse existing config, creating new one`);
    }
  }

  // Set tier defaults
  config.model_mapping = {
    ...(config.model_mapping as Record<string, unknown> || {}),
    tierDefaults: tiers,
  };

  // Write config
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");

  // Verify config can be read back
  try {
    const written = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    if (written.model_mapping?.tierDefaults) {
      console.log(`\n✅ Config verification passed.`);
    }
  } catch {
    console.error(`\n⚠️ Warning: Could not verify written config.`);
  }

  console.log(`\n✅ Configured tier mapping for ${provider}:\n`);
  console.log(`   haiku  → ${tiers.haiku}`);
  console.log(`   sonnet → ${tiers.sonnet}`);
  console.log(`   opus   → ${tiers.opus}`);
  console.log(`\n📝 Config saved to: ${CONFIG_FILE}`);
  console.log("\n🔄 Restart OpenCode to apply changes.\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
