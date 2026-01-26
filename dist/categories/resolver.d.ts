import type { CategoryConfig, CategoriesConfig } from "./types";
export interface ResolvedCategory {
    config: CategoryConfig;
    promptAppend: string;
    /** Full provider/model string (e.g., "anthropic/claude-sonnet-4-5") */
    model: string | undefined;
}
/**
 * Resolve a category name to its configuration.
 * Priority: user override > default category
 *
 * Model resolution priority:
 * 1. userConfig.model (user override)
 * 2. defaultConfig.model (category default)
 */
export declare function resolveCategoryConfig(categoryName: string, userCategories?: CategoriesConfig): ResolvedCategory | null;
/**
 * Get list of all available category names.
 */
export declare function getAvailableCategories(userCategories?: CategoriesConfig): string[];
