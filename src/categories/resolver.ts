import { DEFAULT_CATEGORIES, CATEGORY_PROMPT_APPENDS } from "./constants";
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
export function resolveCategoryConfig(
  categoryName: string,
  userCategories?: CategoriesConfig
): ResolvedCategory | null {
  const defaultConfig = DEFAULT_CATEGORIES[categoryName];
  const userConfig = userCategories?.[categoryName];
  const defaultPromptAppend = CATEGORY_PROMPT_APPENDS[categoryName] ?? "";

  if (!defaultConfig && !userConfig) {
    return null;
  }

  // Model priority: user override > category default
  const model = userConfig?.model ?? defaultConfig?.model;

  // Merge configs: user overrides default
  const config: CategoryConfig = {
    ...defaultConfig,
    ...userConfig,
    model,
  };

  // Combine prompt appends
  let promptAppend = defaultPromptAppend;
  if (userConfig?.prompt_append) {
    promptAppend = defaultPromptAppend
      ? defaultPromptAppend + "\n\n" + userConfig.prompt_append
      : userConfig.prompt_append;
  }

  return { config, promptAppend, model };
}

/**
 * Get list of all available category names.
 */
export function getAvailableCategories(userCategories?: CategoriesConfig): string[] {
  const allCategories = { ...DEFAULT_CATEGORIES, ...userCategories };
  return Object.keys(allCategories);
}
