#!/usr/bin/env node

/**
 * OMCO Post-Install Script
 * 
 * Adds github-copilot provider to global opencode.json if not present.
 * This ensures OMCO's tier-mapped agents (planner, critic, architect) work out of the box.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const GITHUB_COPILOT_PROVIDER = {
  "name": "GitHub Copilot",
  "models": {
    "claude-opus-4.5": {
      "name": "Claude Opus 4.5",
      "attachment": true,
      "limit": {
        "context": 200000,
        "output": 32000
      }
    },
    "claude-sonnet-4": {
      "name": "Claude Sonnet 4",
      "attachment": true,
      "limit": {
        "context": 200000,
        "output": 16000
      }
    },
    "claude-haiku-4": {
      "name": "Claude Haiku 4",
      "attachment": true,
      "limit": {
        "context": 200000,
        "output": 8000
      }
    }
  }
};

function getOpencodeConfigPath() {
  return join(homedir(), '.config', 'opencode', 'opencode.json');
}

function ensureConfigDir() {
  const configDir = join(homedir(), '.config', 'opencode');
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
    console.error('[omco] Created config directory:', configDir);
  }
}

function main() {
  const configPath = getOpencodeConfigPath();
  
  try {
    ensureConfigDir();
    
    let config = {};
    let configExists = false;
    
    if (existsSync(configPath)) {
      configExists = true;
      const content = readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
    }
    
    // Initialize provider section if not present
    if (!config.provider) {
      config.provider = {};
    }
    
    // Skip if user already has any providers configured (don't override user setup)
    const existingProviders = Object.keys(config.provider || {});
    if (existingProviders.length > 0) {
      console.error('[omco] Skipping auto-config: providers already configured:', existingProviders.join(', '));
      console.error('[omco] Run "npx omco-setup" to manually add github-copilot provider if needed.');
      return;
    }

    // Only auto-configure for fresh installs with no providers
    config.provider['github-copilot'] = GITHUB_COPILOT_PROVIDER;
    
    // Add plugin if not present
    if (!config.plugin) {
      config.plugin = [];
    }
    if (!config.plugin.includes('oh-my-claudecode-opencode')) {
      config.plugin.push('oh-my-claudecode-opencode');
    }
    
    // Write back
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    
    if (configExists) {
      console.error('[omco] ✅ Added github-copilot provider to opencode.json');
    } else {
      console.error('[omco] ✅ Created opencode.json with github-copilot provider');
    }
    
    console.error('[omco] Config path:', configPath);
    console.error('[omco] Available models: claude-opus-4.5, claude-sonnet-4, claude-haiku-4');
    
  } catch (error) {
    // Don't fail install on config errors - just warn
    console.warn('[omco] ⚠️  Could not update opencode.json:', error.message);
    console.warn('[omco] You may need to manually add github-copilot provider for tier mapping to work.');
  }
}

main();
