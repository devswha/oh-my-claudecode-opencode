import { DEFAULT_CATEGORIES, CATEGORY_PROMPT_APPENDS } from "./constants";
import type { CategoryConfig, CategoriesConfig } from "./types";

export interface ResolvedCategory {
  config: CategoryConfig;
  promptAppend: string;
  tier: string;  // haiku, sonnet, or opus
}

/**
 * Resolve a category name to its configuration.
 * Priority: user override > default category
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

  // Merge configs: user overrides default
  const config: CategoryConfig = {
    ...defaultConfig,
    ...userConfig,
  };

  // Get tier from merged config (defaults to sonnet)
  const tier = config.model ?? "sonnet";

  // Combine prompt appends
  let promptAppend = defaultPromptAppend;
  if (userConfig?.prompt_append) {
    promptAppend = defaultPromptAppend
      ? defaultPromptAppend + "\n\n" + userConfig.prompt_append
      : userConfig.prompt_append;
  }

  return { config, promptAppend, tier };
}

/**
 * Get list of all available category names.
 */
export function getAvailableCategories(userCategories?: CategoriesConfig): string[] {
  const allCategories = { ...DEFAULT_CATEGORIES, ...userCategories };
  return Object.keys(allCategories);
}
