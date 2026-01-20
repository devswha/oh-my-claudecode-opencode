/**
 * Agent definitions for omo-omcs
 *
 * These define the specialized subagents available for delegation.
 * Each agent has specific capabilities and use cases.
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
 * Oracle - Strategic Architecture & Debugging Advisor
 */
export declare const oracleAgent: AgentDefinition;
/**
 * Librarian - External Documentation & Reference Researcher
 */
export declare const librarianAgent: AgentDefinition;
/**
 * Explore - Fast Codebase Search Specialist
 */
export declare const exploreAgent: AgentDefinition;
/**
 * Frontend UI/UX Engineer
 */
export declare const frontendEngineerAgent: AgentDefinition;
/**
 * Document Writer
 */
export declare const documentWriterAgent: AgentDefinition;
/**
 * Sisyphus Junior - Focused Task Executor
 */
export declare const sisyphusJuniorAgent: AgentDefinition;
/**
 * QA Tester - Interactive CLI Testing Specialist
 */
export declare const qaTesterAgent: AgentDefinition;
export declare const agents: Record<string, AgentDefinition>;
export declare function getAgent(name: string): AgentDefinition | undefined;
export declare function listAgents(): AgentDefinition[];
