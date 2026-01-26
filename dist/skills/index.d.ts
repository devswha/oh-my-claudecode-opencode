import type { Skill } from './types.js';
/**
 * Get a skill by name
 */
export declare function getSkill(name: string): Skill | undefined;
/**
 * List all skills
 */
export declare function listSkills(): Skill[];
/**
 * Get all user-invocable skills
 */
export declare function getInvocableSkills(): Skill[];
export type { Skill, SkillMetadata } from './types.js';
