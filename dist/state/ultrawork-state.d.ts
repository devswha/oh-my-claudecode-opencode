export interface UltraworkState {
    active: boolean;
    started_at: string;
    original_prompt: string;
    session_id: string;
    reinforcement_count: number;
    last_checked_at: string;
}
export declare function readUltraworkState(projectDir: string): UltraworkState | null;
export declare function writeUltraworkState(projectDir: string, state: UltraworkState, writeGlobal?: boolean): void;
export declare function clearUltraworkState(projectDir: string, clearGlobal?: boolean): void;
export declare function createUltraworkState(sessionId: string, originalPrompt: string): UltraworkState;
export declare function updateUltraworkStateChecked(projectDir: string, state: UltraworkState): void;
