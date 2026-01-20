import type { PluginInput } from "@opencode-ai/plugin";
import type { OmoOmcsConfig } from "../config";
import { agents, type AgentDefinition } from "../agents";
import { log } from "../shared/logger";

// OpenCode Config types (from SDK)
interface AgentConfig {
  model?: string;
  temperature?: number;
  top_p?: number;
  topP?: number;
  topK?: number;
  prompt?: string;
  description?: string;
  color?: string;
  mode?: "subagent" | "primary" | "all";
  maxSteps?: number;
  tools?: Record<string, boolean>;
  disable?: boolean;
}

interface CommandConfig {
  template: string;
  description?: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
}

interface OpenCodeConfig {
  default_agent?: string;
  agent?: Record<string, AgentConfig | undefined>;
  command?: Record<string, CommandConfig>;
  [key: string]: unknown;
}

// Define available slash commands
const SLASH_COMMANDS: Record<string, CommandConfig> = {
  "ultrawork": {
    template: `[ULTRAWORK MODE ACTIVATED - MAXIMUM INTENSITY]

Execute this task at MAXIMUM INTENSITY:

<user-task>
$ARGUMENTS
</user-task>

## ULTRAWORK OVERRIDES (ACTIVE)

| Default Behavior | Ultrawork Override |
|------------------|-------------------|
| Parallelize when profitable | **PARALLEL EVERYTHING** |
| Do simple tasks directly | **DELEGATE EVEN SMALL TASKS** |
| Wait for verification | **DON'T WAIT - continue immediately** |
| Background for long ops | **BACKGROUND EVERYTHING POSSIBLE** |

Begin working NOW. PARALLEL EVERYTHING.`,
    description: "Maximum intensity mode - parallel everything, delegate aggressively",
    agent: "Ssalsyphus",
  },
  "ralph-loop": {
    template: `[RALPH LOOP ACTIVATED - COMPLETION GUARANTEE]

Execute this task with COMPLETION GUARANTEE:

<user-task>
$ARGUMENTS
</user-task>

## RALPH LOOP ENFORCEMENT

The \`<promise>TASK_COMPLETE</promise>\` tag binds you to completion. You may ONLY output it when:

- ALL todo items are marked 'completed'
- ALL requested functionality is implemented AND TESTED
- ALL errors have been resolved
- You have TESTED (not assumed) the changes work

**If you stop without the promise, YOU WILL BE FORCED TO CONTINUE.**

Begin working NOW. The loop will not release you until you earn your \`<promise>TASK_COMPLETE</promise>\`.`,
    description: "Self-referential development loop until task completion",
    agent: "Ssalsyphus",
  },
  "ultrawork-ralph": {
    template: `[ULTRAWORK-RALPH ACTIVATED - MAXIMUM INTENSITY + COMPLETION GUARANTEE]

Execute this task at MAXIMUM INTENSITY with COMPLETION GUARANTEE:

<user-task>
$ARGUMENTS
</user-task>

## THE ULTIMATE MODE

This combines:
- **ULTRAWORK**: Maximum intensity, parallel everything, aggressive delegation
- **RALPH LOOP**: Inescapable completion guarantee

There is no half-measures. There is no early exit. Work at MAXIMUM INTENSITY until VERIFIED completion.

Begin working NOW. PARALLEL EVERYTHING. The loop will not release you until you earn your \`<promise>TASK_COMPLETE</promise>\`.`,
    description: "Maximum intensity mode with completion guarantee",
    agent: "Ssalsyphus",
  },
  "deepsearch": {
    template: `Perform a thorough search across the codebase for:

<query>
$ARGUMENTS
</query>

Use multiple search strategies:
1. Glob for file patterns
2. Grep for content search
3. Read to examine specific files

Return comprehensive results with file paths and relevant code snippets.`,
    description: "Thorough codebase search",
    agent: "Ssalsyphus",
  },
  "analyze": {
    template: `Perform deep analysis and investigation of:

<target>
$ARGUMENTS
</target>

Analyze systematically:
1. Understand the current state
2. Identify patterns and relationships
3. Find potential issues or improvements
4. Provide actionable insights

Return thorough analysis with evidence and recommendations.`,
    description: "Deep analysis and investigation",
    agent: "Ssalsyphus",
  },
  "update-ssalsyphus": {
    template: `Update oh-my-ssalsyphus plugin to the latest version.

Run this command in your terminal:

\`\`\`bash
cd ~/.opencode && npm update oh-my-ssalsyphus && npm list oh-my-ssalsyphus --depth=0
\`\`\`

After the update completes:
1. Check the version number in the output
2. **Restart OpenCode** to load the new version (Ctrl+C and reopen)

Current changelog: https://github.com/devswha/oh-my-ssalsyphus/commits/main`,
    description: "Update oh-my-ssalsyphus plugin to latest version",
  },
  "cancel-ralph": {
    template: `Cancel the currently active Ralph Loop.

This will:
- Stop the continuation enforcement
- Clear the ralph-loop state
- Allow you to work freely without completion guarantee

The loop has been cancelled. You are now free.`,
    description: "Cancel active Ralph Loop",
    agent: "Ssalsyphus",
  },
};

// Build Ssalsyphus agent config
function buildSsalsyphusAgent(
  _pluginConfig: OmoOmcsConfig,
  availableAgents: AgentDefinition[]
): AgentConfig {
  const agentList = availableAgents
    .map((a) => `- ${a.name}: ${a.description}`)
    .join("\n");

  return {
    description: "Multi-agent orchestrator with intelligent delegation",
    color: "#F5A742", // Orange color for Ssalsyphus
    mode: "primary",
    prompt: `You are Ssalsyphus, a multi-agent orchestrator with intelligent delegation capabilities.

## Your Role
You coordinate specialized agents to accomplish complex tasks efficiently.

## Available Subagents
${agentList}

## Core Behaviors
1. **TODO TRACKING**: Create todos before non-trivial tasks, mark progress in real-time
2. **SMART DELEGATION**: Delegate complex/specialized work to subagents
3. **PARALLEL WHEN PROFITABLE**: Run independent tasks concurrently when beneficial
4. **BACKGROUND EXECUTION**: Long-running operations run async
5. **PERSISTENCE**: Continue until todo list is empty

## What You Do vs. Delegate

| Action | Do Directly | Delegate |
|--------|-------------|----------|
| Read single file | Yes | - |
| Quick search (<10 results) | Yes | - |
| Status/verification checks | Yes | - |
| Single-line changes | Yes | - |
| Multi-file code changes | - | Yes |
| Complex analysis/debugging | - | Yes |
| Specialized work (UI, docs) | - | Yes |
| Deep codebase exploration | - | Yes |

Delegate using call_omo_agent or background_task tools.`,
  };
}

// Build subagent configs
function buildSubagentConfigs(
  agentOverrides?: Record<string, { model?: string; temperature?: number }>
): Record<string, AgentConfig> {
  const result: Record<string, AgentConfig> = {};

  for (const [name, agent] of Object.entries(agents)) {
    const override = agentOverrides?.[name];

    result[name] = {
      description: agent.description,
      mode: "subagent",
      prompt: agent.systemPrompt,
      ...(override?.model && { model: override.model }),
      ...(override?.temperature !== undefined && { temperature: override.temperature }),
    };
  }

  return result;
}

export interface ConfigHandlerDeps {
  ctx: PluginInput;
  pluginConfig: OmoOmcsConfig;
}

export function createConfigHandler(deps: ConfigHandlerDeps) {
  const { pluginConfig } = deps;

  return async (config: OpenCodeConfig): Promise<void> => {
    const isSsalsyphusEnabled = pluginConfig.sisyphus_agent?.disabled !== true;

    if (!isSsalsyphusEnabled) {
      log("Ssalsyphus agent disabled by config");
      return;
    }

    // Get available subagents
    const availableAgents = Object.values(agents);

    // Build Ssalsyphus agent
    const ssalsyphusConfig = buildSsalsyphusAgent(pluginConfig, availableAgents);

    // Set default agent to Ssalsyphus
    config.default_agent = "Ssalsyphus";

    // Initialize agent config if not present
    if (!config.agent) {
      config.agent = {};
    }

    // Register Ssalsyphus as main agent
    config.agent["Ssalsyphus"] = ssalsyphusConfig;

    // Register subagents
    const subagentConfigs = buildSubagentConfigs(pluginConfig.agents);
    for (const [name, agentConfig] of Object.entries(subagentConfigs)) {
      config.agent[name] = agentConfig;
    }

    // Initialize command config if not present
    if (!config.command) {
      config.command = {};
    }

    // Register slash commands
    for (const [name, commandConfig] of Object.entries(SLASH_COMMANDS)) {
      // Skip if disabled
      if (pluginConfig.disabled_skills?.includes(name)) {
        continue;
      }
      config.command[name] = commandConfig;
    }

    log("Ssalsyphus agent and commands registered", {
      agent: "Ssalsyphus",
      subagents: Object.keys(subagentConfigs),
      commands: Object.keys(SLASH_COMMANDS).filter(
        (c) => !pluginConfig.disabled_skills?.includes(c)
      ),
    });
  };
}
