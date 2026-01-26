/**
 * Shared session pause state for coordinating abort handling across hooks.
 * When user presses ESC (triggers MessageAbortedError), the session is paused
 * and remains paused until explicitly resumed or user sends a new prompt.
 */
interface SessionPauseState {
    isPaused: boolean;
    pausedAt: number | null;
    pauseReason: 'user_abort' | 'error' | 'explicit' | null;
}
/**
 * Pause a session, preventing automatic continuations.
 * Called when MessageAbortedError is detected (user pressed ESC).
 */
export declare function pauseSession(sessionId: string, reason?: SessionPauseState['pauseReason']): void;
/**
 * Check if a session is currently paused.
 */
export declare function isSessionPaused(sessionId: string): boolean;
/**
 * Get the pause state for a session.
 */
export declare function getSessionPauseState(sessionId: string): SessionPauseState | undefined;
/**
 * Resume a session, allowing automatic continuations.
 * Called when user sends a new prompt or explicitly resumes.
 */
export declare function resumeSession(sessionId: string): void;
/**
 * Clear session state when session is deleted.
 */
export declare function clearSessionPauseState(sessionId: string): void;
export {};
