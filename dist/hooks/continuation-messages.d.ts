/**
 * Continuation message variants to prevent pattern fatigue
 * and provide contextual reminders
 */
export interface ContinuationContext {
    completedCount: number;
    totalCount: number;
    nextTask?: string;
    iteration?: number;
    maxIterations?: number;
    mode?: "todo" | "ralph-loop" | "ultrawork-ralph";
}
/**
 * Get a contextual continuation message
 */
export declare function getContinuationMessage(context: ContinuationContext): string;
/**
 * Get a progress summary message
 */
export declare function getProgressSummary(context: ContinuationContext): string;
/**
 * Get a short toast message
 */
export declare function getToastMessage(context: ContinuationContext): string;
