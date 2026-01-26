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
import { type PluginInput, type ToolDefinition } from "@opencode-ai/plugin";
import type { BackgroundManager } from "./background-manager";
export declare function createTestAgentsTool(ctx: PluginInput, manager: BackgroundManager): ToolDefinition;
