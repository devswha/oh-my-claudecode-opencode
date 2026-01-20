import type { UserStory } from "./prd-manager";
export interface IterationLog {
    iteration: number;
    timestamp: string;
    storyId: string;
    storyTitle: string;
    implementation: string[];
    filesChanged: string[];
    learnings: string[];
}
export interface ProgressData {
    startedAt: string;
    task: string;
    patterns: string[];
    iterations: IterationLog[];
}
export declare function initializeProgress(projectDir: string, task: string): void;
export declare function readProgress(projectDir: string): string | null;
export declare function appendIteration(projectDir: string, iteration: number, story: UserStory, implementation: string[], filesChanged: string[], learnings: string[]): void;
export declare function addPattern(projectDir: string, pattern: string): void;
export declare function getProgressSummary(projectDir: string): string;
export declare function formatProgressContext(projectDir: string): string;
