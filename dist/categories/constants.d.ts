import type { CategoryConfig } from "./types";
/**
 * Prompt append for visual-engineering category.
 * Encourages bold design choices and distinctive aesthetics.
 */
export declare const VISUAL_CATEGORY_PROMPT_APPEND = "<Category_Context>\nYou are working on VISUAL/UI tasks.\n\nDesign-first mindset:\n- Bold aesthetic choices over safe defaults\n- Unexpected layouts, asymmetry, grid-breaking elements\n- Distinctive typography (avoid: Arial, Inter, Roboto, Space Grotesk)\n- Cohesive color palettes with sharp accents\n- High-impact animations with staggered reveals\n- Atmosphere: gradient meshes, noise textures, layered transparencies\n\nAVOID: Generic fonts, purple gradients on white, predictable layouts, cookie-cutter patterns.\n</Category_Context>";
/**
 * Prompt append for ultrabrain category.
 * Encourages strategic thinking and architectural clarity.
 */
export declare const ULTRABRAIN_CATEGORY_PROMPT_APPEND = "<Category_Context>\nYou are working on COMPLEX ARCHITECTURE / DEEP REASONING tasks.\n\nStrategic advisor mindset:\n- Bias toward simplicity: least complex solution that fulfills requirements\n- Leverage existing code/patterns over new components\n- Prioritize developer experience and maintainability\n- One clear recommendation with effort estimate (Quick/Short/Medium/Large)\n- Signal when advanced approach warranted\n\nResponse format:\n- Bottom line (2-3 sentences)\n- Action plan (numbered steps)\n- Risks and mitigations (if relevant)\n</Category_Context>";
/**
 * Prompt append for artistry category.
 * Encourages radical creativity and unconventional approaches.
 */
export declare const ARTISTRY_CATEGORY_PROMPT_APPEND = "<Category_Context>\nYou are working on HIGHLY CREATIVE / ARTISTIC tasks.\n\nArtistic genius mindset:\n- Push far beyond conventional boundaries\n- Explore radical, unconventional directions\n- Surprise and delight: unexpected twists, novel combinations\n- Rich detail and vivid expression\n- Break patterns deliberately when it serves the creative vision\n\nApproach:\n- Generate diverse, bold options first\n- Embrace ambiguity and wild experimentation\n- Balance novelty with coherence\n- This is for tasks requiring exceptional creativity\n</Category_Context>";
/**
 * Prompt append for quick category.
 * Optimized for fast, focused execution with less capable models.
 */
export declare const QUICK_CATEGORY_PROMPT_APPEND = "<Category_Context>\nYou are working on SMALL / QUICK tasks.\n\nEfficient execution mindset:\n- Fast, focused, minimal overhead\n- Get to the point immediately\n- No over-engineering\n- Simple solutions for simple problems\n\nApproach:\n- Minimal viable implementation\n- Skip unnecessary abstractions\n- Direct and concise\n</Category_Context>\n\n<Caller_Warning>\nTHIS CATEGORY USES A LESS CAPABLE MODEL (haiku tier).\n\nThe model executing this task has LIMITED reasoning capacity. Your prompt MUST be:\n\n**EXHAUSTIVELY EXPLICIT** - Leave NOTHING to interpretation:\n1. MUST DO: List every required action as atomic, numbered steps\n2. MUST NOT DO: Explicitly forbid likely mistakes and deviations\n3. EXPECTED OUTPUT: Describe exact success criteria with concrete examples\n\n**WHY THIS MATTERS:**\n- Less capable models WILL deviate without explicit guardrails\n- Vague instructions \u2192 unpredictable results\n- Implicit expectations \u2192 missed requirements\n\n**PROMPT STRUCTURE (MANDATORY):**\n```\nTASK: [One-sentence goal]\n\nMUST DO:\n1. [Specific action with exact details]\n2. [Another specific action]\n...\n\nMUST NOT DO:\n- [Forbidden action + why]\n- [Another forbidden action]\n...\n\nEXPECTED OUTPUT:\n- [Exact deliverable description]\n- [Success criteria / verification method]\n```\n\nIf your prompt lacks this structure, REWRITE IT before delegating.\n</Caller_Warning>";
/**
 * Prompt append for unspecified-low category.
 * For moderate-effort tasks that don't fit specific categories.
 */
export declare const UNSPECIFIED_LOW_CATEGORY_PROMPT_APPEND = "<Category_Context>\nYou are working on tasks that don't fit specific categories but require moderate effort.\n\n<Selection_Gate>\nBEFORE selecting this category, VERIFY ALL conditions:\n1. Task does NOT fit: quick (trivial), visual-engineering (UI), ultrabrain (deep logic), artistry (creative), writing (docs)\n2. Task requires more than trivial effort but is NOT system-wide\n3. Scope is contained within a few files/modules\n\nIf task fits ANY other category, DO NOT select unspecified-low.\nThis is NOT a default choice - it's for genuinely unclassifiable moderate-effort work.\n</Selection_Gate>\n</Category_Context>\n\n<Caller_Warning>\nTHIS CATEGORY USES A MID-TIER MODEL (sonnet tier).\n\n**PROVIDE CLEAR STRUCTURE:**\n1. MUST DO: Enumerate required actions explicitly\n2. MUST NOT DO: State forbidden actions to prevent scope creep\n3. EXPECTED OUTPUT: Define concrete success criteria\n</Caller_Warning>";
/**
 * Prompt append for unspecified-high category.
 * For high-effort tasks that don't fit specific categories.
 */
export declare const UNSPECIFIED_HIGH_CATEGORY_PROMPT_APPEND = "<Category_Context>\nYou are working on tasks that don't fit specific categories but require substantial effort.\n\n<Selection_Gate>\nBEFORE selecting this category, VERIFY ALL conditions:\n1. Task does NOT fit: quick (trivial), visual-engineering (UI), ultrabrain (deep logic), artistry (creative), writing (docs)\n2. Task requires substantial effort across multiple systems/modules\n3. Changes have broad impact or require careful coordination\n4. NOT just \"complex\" - must be genuinely unclassifiable AND high-effort\n\nIf task fits ANY other category, DO NOT select unspecified-high.\nIf task is unclassifiable but moderate-effort, use unspecified-low instead.\n</Selection_Gate>\n</Category_Context>";
/**
 * Prompt append for writing category.
 * Optimized for documentation and prose tasks.
 */
export declare const WRITING_CATEGORY_PROMPT_APPEND = "<Category_Context>\nYou are working on WRITING / PROSE tasks.\n\nWordsmith mindset:\n- Clear, flowing prose\n- Appropriate tone and voice\n- Engaging and readable\n- Proper structure and organization\n\nApproach:\n- Understand the audience\n- Draft with care\n- Polish for clarity and impact\n- Documentation, READMEs, articles, technical writing\n</Category_Context>";
/**
 * Default category configurations.
 * Uses abstract tier names (haiku/sonnet/opus) that will be resolved to actual provider/model by the model resolution service.
 */
export declare const DEFAULT_CATEGORIES: Record<string, CategoryConfig>;
/**
 * Map of category names to their prompt appends.
 */
export declare const CATEGORY_PROMPT_APPENDS: Record<string, string>;
/**
 * Map of category names to their human-readable descriptions.
 */
export declare const CATEGORY_DESCRIPTIONS: Record<string, string>;
