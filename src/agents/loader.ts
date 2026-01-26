import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import type { AgentDefinition, AgentFrontmatter } from './types.js';

/**
 * Parses agent markdown file with YAML frontmatter
 */
export async function loadAgent(filepath: string): Promise<AgentDefinition> {
  const content = await fs.readFile(filepath, 'utf-8');

  // Extract frontmatter and content
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    throw new Error(`Invalid agent file format: ${filepath}`);
  }

  const [, frontmatterText, systemPrompt] = frontmatterMatch;
  const frontmatter = yaml.parse(frontmatterText) as AgentFrontmatter;

  // Parse and normalize tools
  const tools = frontmatter.tools
    ? frontmatter.tools.split(',').map(t => t.trim().toLowerCase())
    : [];

  // Derive readOnly: true if no write/edit tools
  const readOnly = !tools.some(t => t.includes('write') || t.includes('edit'));

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    systemPrompt: systemPrompt.trim(),
    model: frontmatter.model,
    readOnly,
    tools,
  };
}

/**
 * Loads all agent definitions from a directory
 */
export async function loadAllAgents(directory: string): Promise<Map<string, AgentDefinition>> {
  const agents = new Map<string, AgentDefinition>();

  const files = await fs.readdir(directory);
  const agentFiles = files.filter(f => f.endsWith('.md'));

  for (const file of agentFiles) {
    const filepath = join(directory, file);
    try {
      const agent = await loadAgent(filepath);
      agents.set(agent.name, agent);
    } catch (error) {
      console.warn(`Failed to load agent ${file}:`, error);
    }
  }

  return agents;
}

/**
 * Gets the default agents directory path
 */
export function getAgentsDirectory(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const projectRoot = join(dirname(currentFile), '..');
  return join(projectRoot, 'assets', 'agents');
}
