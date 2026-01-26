/**
 * Agent definitions for omco (oh-my-claudecode v3.0.11)
 *
 * These define the specialized subagents available for delegation.
 * Each agent has specific capabilities and use cases.
 *
 * Naming Convention v3.0.11:
 * - architect (was: oracle) - Architecture & debugging advisor
 * - researcher (was: librarian) - Documentation & research
 * - explore - Fast codebase search
 * - designer (was: frontend-engineer) - UI/UX design
 * - writer (was: document-writer) - Technical documentation
 * - executor (was: sisyphus-junior) - Task execution
 * - qa-tester - Interactive CLI testing
 * - planner - Strategic planning (Opus)
 * - analyst (was: metis) - Pre-planning analysis (Opus)
 * - critic (was: momus) - Plan review (Opus)
 * - vision - Visual/media analysis (Sonnet)
 * - scientist - Data analysis and research execution (New in v3.3.6)
 *
 * Dynamic Loading (v3.4.0):
 * Agents are loaded from assets/agents/*.md files at runtime.
 * Hardcoded definitions below serve as fallback.
 */
export interface AgentDefinition {
    name: string;
    description: string;
    systemPrompt: string;
    model?: "haiku" | "sonnet" | "opus";
    readOnly?: boolean;
    tools?: string[];
}
/**
 * Architect (Opus) - Strategic Architecture & Debugging Advisor
 */
export declare const architectAgent: AgentDefinition;
/**
 * Architect-Low (Haiku) - Fast architectural checks
 */
export declare const architectLowAgent: AgentDefinition;
/**
 * Architect-Medium (Sonnet) - Balanced architectural analysis
 */
export declare const architectMediumAgent: AgentDefinition;
/**
 * Executor (Sonnet) - Focused Task Executor
 */
export declare const executorAgent: AgentDefinition;
/**
 * Executor-Low (Haiku) - Fast simple task execution
 */
export declare const executorLowAgent: AgentDefinition;
/**
 * Executor-High (Opus) - Complex task execution with deep reasoning
 */
export declare const executorHighAgent: AgentDefinition;
/**
 * Explore (Haiku) - Fast Codebase Search Specialist
 */
export declare const exploreAgent: AgentDefinition;
/**
 * Explore-Medium (Sonnet) - Deeper codebase analysis
 */
export declare const exploreMediumAgent: AgentDefinition;
/**
 * Researcher (Sonnet) - External Documentation & Reference Researcher
 */
export declare const researcherAgent: AgentDefinition;
/**
 * Researcher-Low (Haiku) - Fast documentation lookup
 */
export declare const researcherLowAgent: AgentDefinition;
/**
 * Designer (Sonnet) - UI/UX Designer-Developer
 */
export declare const designerAgent: AgentDefinition;
/**
 * Designer-Low (Haiku) - Fast simple UI changes
 */
export declare const designerLowAgent: AgentDefinition;
/**
 * Designer-High (Opus) - Complex UI architecture
 */
export declare const designerHighAgent: AgentDefinition;
/**
 * Writer (Haiku) - Technical Documentation Writer
 */
export declare const writerAgent: AgentDefinition;
/**
 * QA Tester (Sonnet) - Interactive CLI Testing Specialist
 */
export declare const qaTesterAgent: AgentDefinition;
/**
 * QA Tester High (Opus) - Comprehensive Production QA Specialist
 */
export declare const qaTesterHighAgent: AgentDefinition;
/**
 * Planner (Opus) - Strategic Planning Specialist
 */
export declare const plannerAgent: AgentDefinition;
/**
 * Analyst (Opus) - Pre-Planning Analysis Specialist
 */
export declare const analystAgent: AgentDefinition;
/**
 * Critic (Opus) - Plan Review Specialist
 */
export declare const criticAgent: AgentDefinition;
/**
 * Vision (Sonnet) - Visual/Media Analysis Specialist
 */
export declare const visionAgent: AgentDefinition;
/**
 * Scientist (Sonnet) - Data analysis and research execution
 */
export declare const scientistAgent: AgentDefinition;
/**
 * Scientist-Low (Haiku) - Quick data inspection
 */
export declare const scientistLowAgent: AgentDefinition;
/**
 * Scientist-High (Opus) - Complex research and ML analysis
 */
export declare const scientistHighAgent: AgentDefinition;
/**
 * Coordinator (Opus) - Master Orchestrator for complex multi-step tasks
 */
export declare const coordinatorAgent: AgentDefinition;
declare let agents: Record<string, AgentDefinition>;
export { agents };
export declare function getAgent(name: string): AgentDefinition | undefined;
export declare function listAgents(): AgentDefinition[];
/**
 * Get all agent names including aliases
 */
export declare function listAgentNames(): string[];
/**
 * Check if a name is an alias (backward compatibility name)
 */
export declare function isAlias(name: string): boolean;
/**
 * Get the canonical (new) name for an agent
 */
export declare function getCanonicalName(name: string): string;
/**
 * Force reload agents from disk (useful for hot-reloading during development)
 */
export declare function reloadAgents(): Promise<void>;
/**
 * Get the list of primary (non-alias) agent names
 */
export declare function getPrimaryAgentNames(): string[];
