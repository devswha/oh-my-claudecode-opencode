import type { Skill } from './types.js';
/**
 * Load a single skill from a markdown file
 */
export declare function loadSkill(filepath: string): Skill;
/**
 * Load all skills from a directory
 */
export declare function loadAllSkills(directory: string): Skill[];
