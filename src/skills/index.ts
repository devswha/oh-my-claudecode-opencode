import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadAllSkills } from './loader.js';
import type { Skill } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load all skills at module initialization
const SKILLS_DIR = join(__dirname, '../assets/skills');
let skillsCache: Skill[] | null = null;

function getSkillsCache(): Skill[] {
  if (!skillsCache) {
    skillsCache = loadAllSkills(SKILLS_DIR);
  }
  return skillsCache;
}

/**
 * Get a skill by name
 */
export function getSkill(name: string): Skill | undefined {
  const skills = getSkillsCache();
  return skills.find(skill => skill.metadata.name === name);
}

/**
 * List all skills
 */
export function listSkills(): Skill[] {
  return getSkillsCache();
}

/**
 * Get all user-invocable skills
 */
export function getInvocableSkills(): Skill[] {
  const skills = getSkillsCache();
  return skills.filter(skill => skill.metadata.userInvocable);
}

// Re-export types
export type { Skill, SkillMetadata } from './types.js';
