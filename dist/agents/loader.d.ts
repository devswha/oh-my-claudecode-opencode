import type { AgentDefinition } from './types.js';
/**
 * Parses agent markdown file with YAML frontmatter
 */
export declare function loadAgent(filepath: string): Promise<AgentDefinition>;
/**
 * Loads all agent definitions from a directory
 */
export declare function loadAllAgents(directory: string): Promise<Map<string, AgentDefinition>>;
/**
 * Gets the default agents directory path
 */
export declare function getAgentsDirectory(): string;
