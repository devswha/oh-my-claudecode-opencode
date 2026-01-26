/**
 * test-agents tool - Agent health check and validation utility
 *
 * Provides comprehensive testing of OMCO agents to verify they work correctly.
 *
 * Features:
 * - Quick mode: Validate agent definitions without API calls
 * - Full mode: Invoke agents and verify responses (uses API quota)
 * - Test individual agents or all agents
 * - Automatic alias resolution and skipping
 * - Detailed pass/fail reporting with duration metrics
 *
 * Usage:
 * - Quick validation: test_omco_agents({ agent_name: "executor", quick: true })
 * - Full test: test_omco_agents({ agent_name: "executor", quick: false })
 * - Test all: test_omco_agents({ quick: true })
 *
 * @module test-agents
 */

import { tool, type PluginInput, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager, ModelConfig } from "./background-manager";
import { listAgentNames, getAgent, isAlias, getCanonicalName } from "../agents";
import { log } from "../shared/logger";

interface AgentTestResult {
  agent: string;
  status: "pass" | "fail" | "skip";
  message: string;
  duration_ms?: number;
}

interface TestSummary {
  total: number;
  pass: number;
  fail: number;
  skip: number;
}

/**
 * Test prompt used for agent health checks
 */
const TEST_PROMPT = `This is an automated test from OMCO Doctor.
Reply with exactly: "OMCO_AGENT_TEST_OK"
Do not add any other text.`;

/**
 * Quick validation: check agent definition without API call
 */
async function quickValidateAgent(agentName: string): Promise<AgentTestResult> {
  const startTime = Date.now();

  // Resolve canonical name if alias
  const canonicalName = isAlias(agentName) ? getCanonicalName(agentName) : agentName;

  // Check if agent exists
  const agent = getAgent(canonicalName);
  if (!agent) {
    return {
      agent: agentName,
      status: "fail",
      message: `Agent definition not found`,
      duration_ms: Date.now() - startTime,
    };
  }

  // Validate required fields
  const missingFields: string[] = [];
  if (!agent.name) missingFields.push("name");
  if (!agent.description) missingFields.push("description");
  if (!agent.systemPrompt) missingFields.push("systemPrompt");

  if (missingFields.length > 0) {
    return {
      agent: agentName,
      status: "fail",
      message: `Missing required fields: ${missingFields.join(", ")}`,
      duration_ms: Date.now() - startTime,
    };
  }

  // Validate model tier if present
  if (agent.model && !["haiku", "sonnet", "opus"].includes(agent.model)) {
    return {
      agent: agentName,
      status: "fail",
      message: `Invalid model tier: ${agent.model}`,
      duration_ms: Date.now() - startTime,
    };
  }

  return {
    agent: agentName,
    status: "pass",
    message: `Definition valid (${isAlias(agentName) ? `alias for ${canonicalName}` : "primary"})`,
    duration_ms: Date.now() - startTime,
  };
}

/**
 * Full test: invoke agent and verify response
 */
async function fullTestAgent(
  ctx: PluginInput,
  manager: BackgroundManager,
  agentName: string,
  parentSessionID: string
): Promise<AgentTestResult> {
  const startTime = Date.now();

  // Skip aliases - only test primary agents to avoid redundant API calls
  if (isAlias(agentName)) {
    return {
      agent: agentName,
      status: "skip",
      message: `Skipped (alias for ${getCanonicalName(agentName)})`,
      duration_ms: Date.now() - startTime,
    };
  }

  try {
    // First do quick validation
    const quickResult = await quickValidateAgent(agentName);
    if (quickResult.status === "fail") {
      return quickResult;
    }

    // Create a child session for testing
    const sessionResp = await ctx.client.session.create({
      body: {
        parentID: parentSessionID,
        title: `OMCO Test: ${agentName}`,
      },
      query: { directory: ctx.directory },
    });

    const sessionID = (sessionResp.data as { id?: string })?.id ?? (sessionResp as { id?: string }).id;
    if (!sessionID) {
      return {
        agent: agentName,
        status: "fail",
        message: "Failed to create test session",
        duration_ms: Date.now() - startTime,
      };
    }

    // Get agent definition and inject system prompt
    const agent = getAgent(agentName)!;
    const fullPrompt = `${agent.systemPrompt}\n\n---\n\n${TEST_PROMPT}`;

    // Get parent session model for inheritance
    const parentModel = await manager.getParentSessionModel(parentSessionID);

    // Build prompt body
    const promptBody: {
      parts: Array<{ type: "text"; text: string }>;
      model?: ModelConfig;
    } = {
      parts: [{ type: "text" as const, text: fullPrompt }],
    };

    if (parentModel) {
      promptBody.model = parentModel;
    }

    // Invoke agent with timeout
    const timeoutMs = 30000; // 30 seconds
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Test timeout after 30s")), timeoutMs);
    });

    const promptPromise = ctx.client.session.prompt({
      path: { id: sessionID },
      body: promptBody,
      query: { directory: ctx.directory },
    });

    const promptResp = await Promise.race([promptPromise, timeoutPromise]);

    // Check for HTTP-level errors
    if (promptResp.error) {
      return {
        agent: agentName,
        status: "fail",
        message: `API error: ${JSON.stringify(promptResp.error)}`,
        duration_ms: Date.now() - startTime,
      };
    }

    const promptData = promptResp.data as {
      info?: {
        role?: string;
        error?: { name: string; data?: { message?: string } };
      };
      parts?: Array<{ type: string; text?: string }>;
    } | undefined;

    // Check for provider/model errors
    if (promptData?.info?.error) {
      const err = promptData.info.error;
      const errMsg = err.data?.message || err.name || "Unknown error";
      return {
        agent: agentName,
        status: "fail",
        message: `[${err.name}] ${errMsg}`,
        duration_ms: Date.now() - startTime,
      };
    }

    // Extract response text
    const result = promptData?.parts
      ?.filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n") || "";

    // Verify response contains expected text
    const expectedText = "OMCO_AGENT_TEST_OK";
    if (result.includes(expectedText)) {
      return {
        agent: agentName,
        status: "pass",
        message: "Agent responded correctly",
        duration_ms: Date.now() - startTime,
      };
    } else {
      return {
        agent: agentName,
        status: "fail",
        message: `Unexpected response: ${result.substring(0, 100)}`,
        duration_ms: Date.now() - startTime,
      };
    }

  } catch (err) {
    return {
      agent: agentName,
      status: "fail",
      message: String(err),
      duration_ms: Date.now() - startTime,
    };
  }
}

export function createTestAgentsTool(
  ctx: PluginInput,
  manager: BackgroundManager
): ToolDefinition {
  return tool({
    description: `Test OMCO agents to verify they work correctly.

Run health checks on individual agents or all agents.

Modes:
- quick: Validate agent definitions only (no API calls)
- full: Invoke agents and verify responses (slower, uses API)

Usage:
- Test specific agent: test_omco_agents({ agent_name: "executor" })
- Test all (quick): test_omco_agents({ quick: true })
- Test all (full): test_omco_agents({ quick: false })`,
    args: {
      agent_name: tool.schema
        .string()
        .optional()
        .describe('Specific agent to test (e.g., "executor"), or omit to test all agents'),
      quick: tool.schema
        .boolean()
        .optional()
        .describe("If true, only validate definitions without invoking agents (default: true)"),
    },
    async execute(args, context) {
      const { agent_name, quick = true } = args;

      // Determine which agents to test
      const agentNames = agent_name ? [agent_name] : listAgentNames();

      log(`Testing ${agentNames.length} agents`, { quick, agent_name });

      const results: AgentTestResult[] = [];

      // Test agents sequentially to avoid rate limits
      for (const name of agentNames) {
        let result: AgentTestResult;

        if (quick) {
          result = await quickValidateAgent(name);
        } else {
          result = await fullTestAgent(ctx, manager, name, context.sessionID);
        }

        results.push(result);

        // Log progress for long-running tests
        if (!quick && agentNames.length > 1) {
          log(`Tested ${results.length}/${agentNames.length}`, {
            agent: name,
            status: result.status
          });
        }
      }

      // Calculate summary
      const summary: TestSummary = {
        total: results.length,
        pass: results.filter(r => r.status === "pass").length,
        fail: results.filter(r => r.status === "fail").length,
        skip: results.filter(r => r.status === "skip").length,
      };

      // Format output
      const output = {
        mode: quick ? "quick" : "full",
        summary,
        results,
      };

      log(`Agent testing complete`, {
        total: summary.total,
        pass: summary.pass,
        fail: summary.fail,
        skip: summary.skip
      });

      return JSON.stringify(output, null, 2);
    },
  });
}
