export interface RalphState {
    active: boolean;
    iteration: number;
    max_iterations: number;
    completion_promise: string;
    started_at: string;
    prompt: string;
    session_id: string;
    prd_mode: boolean;
    current_story_id: string | null;
    last_activity_at: string;
}
export declare function readRalphState(projectDir: string): RalphState | null;
export declare function writeRalphState(projectDir: string, state: RalphState): void;
export declare function clearRalphState(projectDir: string): void;
export declare function createRalphState(sessionId: string, prompt: string, maxIterations?: number, prdMode?: boolean): RalphState;
export declare function updateRalphStateIteration(projectDir: string, state: RalphState, currentStoryId?: string): void;
export declare function markRalphStateComplete(projectDir: string, state: RalphState): void;
