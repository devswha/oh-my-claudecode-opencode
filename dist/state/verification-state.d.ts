export interface VerificationState {
    pending: boolean;
    original_task: string;
    completion_claim: string;
    verification_attempts: number;
    max_verification_attempts: number;
    oracle_feedback: string | null;
    last_attempt_at: string | null;
    session_id: string;
}
export declare function readVerificationState(projectDir: string): VerificationState | null;
export declare function writeVerificationState(projectDir: string, state: VerificationState): void;
export declare function clearVerificationState(projectDir: string): void;
export declare function createVerificationState(sessionId: string, originalTask: string, completionClaim: string, maxAttempts?: number): VerificationState;
export declare function updateVerificationAttempt(projectDir: string, state: VerificationState, feedback: string | null, approved: boolean): void;
