/**
 * Categories module for OMCO.
 *
 * Categories provide semantic task classification that automatically maps to:
 * - Model tier (haiku/sonnet/opus)
 * - Temperature settings
 * - Thinking budget (via variant)
 * - Specialized prompt context
 *
 * This allows calling code to delegate tasks by semantic meaning rather than
 * worrying about technical model selection details.
 */
export type { CategoryConfig, CategoriesConfig } from "./types";
export { DEFAULT_CATEGORIES, CATEGORY_PROMPT_APPENDS, CATEGORY_DESCRIPTIONS, VISUAL_CATEGORY_PROMPT_APPEND, ULTRABRAIN_CATEGORY_PROMPT_APPEND, ARTISTRY_CATEGORY_PROMPT_APPEND, QUICK_CATEGORY_PROMPT_APPEND, UNSPECIFIED_LOW_CATEGORY_PROMPT_APPEND, UNSPECIFIED_HIGH_CATEGORY_PROMPT_APPEND, WRITING_CATEGORY_PROMPT_APPEND } from "./constants";
export type { ResolvedCategory } from "./resolver";
export { resolveCategoryConfig, getAvailableCategories } from "./resolver";
