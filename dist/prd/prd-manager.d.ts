export interface UserStory {
    id: string;
    title: string;
    description?: string;
    acceptanceCriteria: string[];
    priority: number;
    passes: boolean;
    notes?: string;
    completedAt?: string;
}
export interface PRD {
    project: string;
    branchName?: string;
    description: string;
    userStories: UserStory[];
    createdAt?: string;
    updatedAt?: string;
}
export declare function readPrd(projectDir: string): PRD | null;
export declare function writePrd(projectDir: string, prd: PRD): void;
export declare function createPrdFromTask(task: string, projectName?: string): PRD;
export declare function getIncompleteStories(prd: PRD): UserStory[];
export declare function getCompletedStories(prd: PRD): UserStory[];
export declare function getNextStory(prd: PRD): UserStory | null;
export declare function markStoryComplete(projectDir: string, storyId: string, notes?: string): boolean;
export declare function addStory(projectDir: string, story: UserStory): boolean;
export declare function getPrdStatus(prd: PRD): {
    total: number;
    completed: number;
    remaining: number;
    percentComplete: number;
};
export declare function formatPrdStatusMessage(prd: PRD): string;
export declare function generateStoryContextPrompt(prd: PRD): string;
