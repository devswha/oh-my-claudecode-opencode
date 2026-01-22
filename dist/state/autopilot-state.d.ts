export interface AutopilotState {
    active: boolean;
    sessionId: string;
    phase: 'expansion' | 'planning' | 'execution' | 'qa' | 'validation' | 'complete';
    spec: string;
    plan: string;
    progress: TaskProgress[];
    startedAt: string;
    completedAt?: string;
    lastActivityAt: string;
}
export interface TaskProgress {
    taskId: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    error?: string;
}
export declare function getOmcDir(projectDir: string): string;
export declare function getStatePath(projectDir: string): string;
export declare function ensureDir(dir: string): void;
export declare function readAutopilotState(projectDir: string): AutopilotState | null;
export declare function writeAutopilotState(projectDir: string, state: AutopilotState): void;
export declare function clearAutopilotState(projectDir: string): void;
export declare function createAutopilotState(sessionId: string, initialSpec?: string): AutopilotState;
export declare function updateAutopilotPhase(projectDir: string, state: AutopilotState, phase: AutopilotState['phase']): void;
export declare function addTaskProgress(projectDir: string, state: AutopilotState, task: TaskProgress): void;
export declare function updateTaskProgress(projectDir: string, state: AutopilotState, taskId: string, status: TaskProgress['status'], error?: string): void;
export declare function markAutopilotComplete(projectDir: string, state: AutopilotState): void;
