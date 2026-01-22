export interface UltraQAState {
    active: boolean;
    sessionId: string;
    goal: string;
    iteration: number;
    maxIterations: number;
    lastBuildResult?: 'pass' | 'fail';
    lastLintResult?: 'pass' | 'fail';
    lastTestResult?: 'pass' | 'fail';
    issues: QAIssue[];
    startedAt: string;
    completedAt?: string;
    lastActivityAt: string;
}
export interface QAIssue {
    type: 'build' | 'lint' | 'test';
    message: string;
    file?: string;
    line?: number;
    fixedAt?: string;
}
export declare function readUltraQAState(projectDir: string): UltraQAState | null;
export declare function writeUltraQAState(projectDir: string, state: UltraQAState): void;
export declare function clearUltraQAState(projectDir: string): void;
export declare function createUltraQAState(sessionId: string, goal: string, maxIterations?: number): UltraQAState;
export declare function updateUltraQAIteration(projectDir: string, state: UltraQAState, results: {
    build?: 'pass' | 'fail';
    lint?: 'pass' | 'fail';
    test?: 'pass' | 'fail';
}): void;
export declare function addQAIssue(projectDir: string, state: UltraQAState, issue: QAIssue): void;
export declare function markIssueFixed(projectDir: string, state: UltraQAState, issueIndex: number): void;
export declare function markUltraQAComplete(projectDir: string, state: UltraQAState): void;
export declare function isUltraQAPassing(state: UltraQAState): boolean;
