/**
 * Configuration for a delegation category.
 * Categories determine which model tier and behavior profile to use for delegated tasks.
 */
export interface CategoryConfig {
    /** Abstract model tier name (haiku/sonnet/opus) - resolved by model resolution service */
    model?: string;
    /** Model variant for extended thinking budget */
    variant?: "low" | "medium" | "high" | "max" | "xhigh";
    /** Human-readable description of what this category is for */
    description?: string;
    /** Additional prompt context appended when using this category */
    prompt_append?: string;
    /** Flag indicating this agent configuration is experimental/unstable */
    is_unstable_agent?: boolean;
}
/**
 * Map of category names to their configurations.
 */
export type CategoriesConfig = Record<string, CategoryConfig>;
