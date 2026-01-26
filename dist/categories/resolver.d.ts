import type { CategoryConfig, CategoriesConfig } from "./types";
export interface ResolvedCategory {
    config: CategoryConfig;
    promptAppend: string;
    tier: string;
}
/**
 * Resolve a category name to its configuration.
 * Priority: user override > default category
 */
export declare function resolveCategoryConfig(categoryName: string, userCategories?: CategoriesConfig): ResolvedCategory | null;
/**
 * Get list of all available category names.
 */
export declare function getAvailableCategories(userCategories?: CategoriesConfig): string[];
