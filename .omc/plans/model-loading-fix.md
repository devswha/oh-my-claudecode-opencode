# Model Loading Fix Plan (Refined)

## Problem Statement

When using OpenCode with OpenAI (or other providers) as the main model:
1. If the parent session hasn't generated an assistant message yet, `getParentSessionModel()` returns `undefined`
2. If `tierDefaults` aren't configured in omco.json, model resolution falls back to abstract tier names ("haiku", "sonnet", "opus")
3. These abstract names aren't valid model IDs, causing OpenCode to use some default that may result in 401 errors
4. Skills like `/ralplan` can't even be invoked because subagent spawning fails immediately

## Root Cause Analysis

### Flow Analysis

```
User invokes skill (e.g., /ralplan)
  └─> call-omco-agent.ts: spawn subagent
      └─> manager.getParentSessionModel() → undefined (no assistant messages yet)
      └─> modelService.resolveModelForAgent(agent, undefined)
          └─> ModelResolver.resolve() → { model: "sonnet", source: "tier-default" }
          └─> parseModelString("sonnet") → undefined (no "/" in string)
          └─> return fallbackModel (which is undefined!)
      └─> resolvedModel = undefined
      └─> session.prompt() with NO model specified
      └─> OpenCode uses its default → 401 if incompatible provider
```

### Key Issue Locations

1. **`src/config/index.ts:246-257`** - Default config hardcodes `github-copilot/claude-*` models
   ```typescript
   agents: {
     omc: { model: 'github-copilot/claude-opus-4', enabled: true },
     // ...all hardcoded to github-copilot
   }
   ```

2. **`src/config/model-resolver.ts:54-58`** - Hardcoded tier defaults are abstract
   ```typescript
   export const HARDCODED_TIER_DEFAULTS: TierModelMapping = {
     haiku: "haiku",    // Not a valid provider/model format!
     sonnet: "sonnet",
     opus: "opus",
   };
   ```

3. **`src/tools/model-resolution-service.ts:107-124`** - Returns `undefined` when model can't be parsed
   ```typescript
   const modelConfig = parseModelString(resolution.model);
   if (modelConfig) return modelConfig;
   return fallbackModel; // Can be undefined!
   ```

4. **`src/tools/background-manager.ts:101-140`** - Only checks assistant messages for model
   - No fallback to OpenCode's provider.list() API
   - No environment variable detection

## Solution Design

### Strategy: Multi-Layer Fallback Chain

```
1. Per-agent config model override (existing)
2. Per-agent config tier → tierDefaults (existing)
3. Agent definition tier → tierDefaults (existing)
4. Fallback to sonnet tier (existing)
5. Parent session model from messages (existing)
6. [NEW] Connected provider detection via provider.list()
7. [NEW] Clear error with actionable guidance
```

### Key Principle: Never Return Undefined

The model resolution chain should ALWAYS return a valid `ModelConfig` or throw an actionable error.

## Implementation Tasks

### Task 1: Add Provider Detection to Background Manager

**File:** `src/tools/background-manager.ts`

**Changes:**

Add new method `detectConfiguredProvider()` that:
1. Calls `ctx.client.provider.list()`
2. Returns first connected provider with a default model
3. Maps provider to sensible default model

```typescript
interface ProviderListResponse {
  all: Array<{
    id: string;
    name: string;
    models: Record<string, unknown>;
  }>;
  default: Record<string, string>; // e.g., { "anthropic": "claude-sonnet-4" }
  connected: string[];  // e.g., ["anthropic", "openai"]
}

const detectConfiguredProvider = async (): Promise<ModelConfig | undefined> => {
  try {
    const response = await ctx.client.provider.list();
    const data = response.data as ProviderListResponse | undefined;

    if (!data?.connected?.length) return undefined;

    // Use first connected provider
    const providerID = data.connected[0];

    // Check if there's a default model for this provider
    const defaultModel = data.default?.[providerID];
    if (defaultModel) {
      return { providerID, modelID: defaultModel };
    }

    // Find provider info and use first model
    const providerInfo = data.all?.find(p => p.id === providerID);
    if (providerInfo?.models) {
      const firstModel = Object.keys(providerInfo.models)[0];
      if (firstModel) {
        return { providerID, modelID: firstModel };
      }
    }

    return undefined;
  } catch (err) {
    log(`[background-manager] Provider detection failed`, { error: String(err) });
    return undefined;
  }
};
```

Update `getParentSessionModel()` to use provider detection as fallback:

```typescript
const getParentSessionModel = async (parentSessionID: string): Promise<ModelConfig | undefined> => {
  // Check cache first
  if (modelCache.has(parentSessionID)) {
    return modelCache.get(parentSessionID);
  }

  try {
    // Try to get from assistant messages first
    const messagesResp = await ctx.client.session.messages({...});
    const assistantMsg = messages?.find(...);

    if (assistantMsg?.info.providerID && assistantMsg?.info.modelID) {
      const model = { providerID: ..., modelID: ... };
      modelCache.set(parentSessionID, model);
      return model;
    }

    // [NEW] No assistant message yet - try provider detection
    log(`[background-manager] No assistant messages, trying provider detection`);
    const detectedModel = await detectConfiguredProvider();
    if (detectedModel) {
      modelCache.set(parentSessionID, detectedModel);
      log(`[background-manager] Using detected provider model`, detectedModel);
      return detectedModel;
    }

    return undefined;
  } catch (err) {
    // ... existing error handling
  }
};
```

**Acceptance Criteria:**
- [ ] `detectConfiguredProvider()` correctly calls `provider.list()`
- [ ] Returns valid ModelConfig when provider is connected
- [ ] Returns undefined gracefully when no provider available
- [ ] `getParentSessionModel()` uses detection as fallback

---

### Task 2: Update Model Resolution Service with Guaranteed Result

**File:** `src/tools/model-resolution-service.ts`

**Changes:**

Add `resolveModelForAgentOrThrow()` method that never returns undefined:

```typescript
export interface ModelResolutionService {
  resolveModelForAgent(agentName: string, fallbackModel?: ModelConfig): ModelConfig | undefined;

  // [NEW] Always returns a model or throws with actionable error
  resolveModelForAgentOrThrow(agentName: string, fallbackModel?: ModelConfig): ModelConfig;

  isTierMappingConfigured(): boolean;
}

// Implementation
const resolveModelForAgentOrThrow = (
  agentName: string,
  fallbackModel?: ModelConfig
): ModelConfig => {
  const result = resolveModelForAgent(agentName, fallbackModel);

  if (result) return result;

  // No model could be resolved - throw with actionable error
  const tierDefaults = resolver.getTierDefaults();
  const hasConfiguredTiers = Object.values(tierDefaults).some(m => m.includes("/"));

  let errorMessage = `[OMCO] Cannot resolve model for agent "${agentName}".`;

  if (!hasConfiguredTiers) {
    errorMessage += `\n\nNo tier mapping configured. Run one of:\n` +
      `  1. npx omco-setup (interactive setup)\n` +
      `  2. Add tierDefaults to ~/.config/opencode/omco.json:\n` +
      `     {\n` +
      `       "model_mapping": {\n` +
      `         "tierDefaults": {\n` +
      `           "haiku": "openai/gpt-4o-mini",\n` +
      `           "sonnet": "openai/gpt-4o",\n` +
      `           "opus": "openai/o1"\n` +
      `         }\n` +
      `       }\n` +
      `     }`;
  } else {
    errorMessage += `\n\nTier mapping is configured but no fallback model available.\n` +
      `This usually means the parent session hasn't started yet.\n` +
      `Try sending a message first to establish the session model.`;
  }

  throw new Error(errorMessage);
};
```

**Acceptance Criteria:**
- [ ] `resolveModelForAgentOrThrow()` always returns `ModelConfig` or throws
- [ ] Error message includes clear guidance for unconfigured tiers
- [ ] Error message includes guidance for missing fallback

---

### Task 3: Update call-omco-agent.ts to Use Throwing Resolver

**File:** `src/tools/call-omco-agent.ts`

**Changes:**

Wrap model resolution in try/catch and return actionable error:

```typescript
// In execute()
try {
  const parentModel = await manager.getParentSessionModel(context.sessionID);
  const resolvedModel = modelService
    ? modelService.resolveModelForAgentOrThrow(subagent_type, parentModel)
    : parentModel;

  if (!resolvedModel) {
    // This can only happen if modelService is not provided AND parentModel is undefined
    return JSON.stringify({
      status: "failed",
      error: `[OMCO] No model configured for agent "${subagent_type}". ` +
             `Run 'npx omco-setup' to configure tier mapping.`,
    });
  }

  // ... rest of execution
} catch (err) {
  // Model resolution threw - return the actionable error
  return JSON.stringify({
    status: "failed",
    error: String(err),
  });
}
```

**Acceptance Criteria:**
- [ ] Model resolution errors are caught and returned as failed status
- [ ] Error messages are user-friendly and actionable
- [ ] Sync and async (background) paths both handle errors properly

---

### Task 4: Remove Hardcoded github-copilot Defaults

**File:** `src/config/index.ts`

**Changes:**

Remove hardcoded model strings from default config. Use tier-based references instead:

```typescript
// BEFORE (lines 246-257):
return {
  agents: {
    omc: { model: 'github-copilot/claude-opus-4', enabled: true },
    architect: { model: 'github-copilot/claude-opus-4', enabled: true },
    // ...
  },
  routing: {
    tierModels: {
      LOW: 'github-copilot/claude-haiku-4',
      MEDIUM: 'github-copilot/claude-sonnet-4',
      HIGH: 'github-copilot/claude-opus-4',
    },
    // ...
  },
  // ...
};

// AFTER:
return {
  agents: {
    omc: { tier: 'opus', enabled: true },
    architect: { tier: 'opus', enabled: true },
    researcher: { tier: 'sonnet', enabled: true },
    explore: { tier: 'haiku', enabled: true },
    frontendEngineer: { tier: 'sonnet', enabled: true },
    documentWriter: { tier: 'haiku', enabled: true },
    multimodalLooker: { tier: 'sonnet', enabled: true },
    critic: { tier: 'opus', enabled: true },
    analyst: { tier: 'opus', enabled: true },
    planner: { tier: 'opus', enabled: true },
  },
  routing: {
    enabled: true,
    defaultTier: 'MEDIUM',
    escalationEnabled: true,
    maxEscalations: 2,
    // Remove tierModels - let tier resolution handle it
    agentOverrides: {
      architect: { tier: 'HIGH', reason: 'Advisory agent requires deep reasoning' },
      planner: { tier: 'HIGH', reason: 'Strategic planning requires deep reasoning' },
      critic: { tier: 'HIGH', reason: 'Critical review requires deep reasoning' },
      analyst: { tier: 'HIGH', reason: 'Pre-planning analysis requires deep reasoning' },
      explore: { tier: 'LOW', reason: 'Exploration is search-focused' },
      documentWriter: { tier: 'LOW', reason: 'Documentation is straightforward' },
    },
    // ...
  },
  // ...
};
```

**Schema Edge Case Handling:**

When user config has an agent entry with neither `model` nor `tier`, the fallback chain is:
1. Agent definition tier from assets (e.g., `assets/agents/architect.md` has `model: opus`)
2. If no agent definition, fallback to sonnet tier
3. If tier can't be resolved to provider/model, throw actionable error

This is already handled by `ModelResolver.resolve()` which uses `agentDefinitionTier` parameter.

**Acceptance Criteria:**
- [ ] No hardcoded provider/model strings in default config
- [ ] Agents use tier references (opus, sonnet, haiku)
- [ ] Routing config doesn't hardcode models
- [ ] Schema allows agent config with neither model nor tier (falls back to agent definition)

---

### Task 5: Enhance omco-setup CLI (Simplified)

**File:** `bin/omco-setup.ts`

**Changes:**

Keep it simple - just verify the config was written correctly. Remove `--auto` flag (deferred to future - requires running OpenCode instance which CLI can't reliably connect to).

```typescript
// After writing config
console.log(`\n✅ Configured tier mapping for ${provider}:\n`);
console.log(`   haiku  → ${tiers.haiku}`);
console.log(`   sonnet → ${tiers.sonnet}`);
console.log(`   opus   → ${tiers.opus}`);
console.log(`\n📝 Config saved to: ${CONFIG_FILE}`);
console.log(`\n🔄 Restart OpenCode to apply changes.`);

// Verify config can be read back
try {
  const written = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  if (written.model_mapping?.tierDefaults) {
    console.log(`\n✅ Config verification passed.`);
  }
} catch {
  console.error(`\n⚠️ Warning: Could not verify written config.`);
}
```

**Note:** `--auto` flag deferred to future version because:
- CLI runs independently of OpenCode
- `createOpencode({ port: 0 })` starts a NEW server, not connects to existing
- Finding the running OpenCode's port is non-trivial

**Acceptance Criteria:**
- [ ] Setup CLI verifies config was written correctly
- [ ] Clear success message after setup
- [ ] No `--auto` flag (deferred)

---

### Task 6: Update background-manager.ts Error Handling

**File:** `src/tools/background-manager.ts`

**Changes:**

Update `createTask()` to:
1. Use throwing resolver
2. Handle undefined model BEFORE attempting session creation
3. Return failed task with actionable error

```typescript
const createTask = async (
  parentSessionID: string,
  description: string,
  prompt: string,
  agent: string,
  model?: ModelConfig
): Promise<BackgroundTask> => {
  // ... concurrency check ...

  // Generate task ID early for potential early failure
  const taskId = generateTaskId();

  try {
    // Resolve model: explicit model > tier mapping > parent session model > provider detection
    const parentModel = model || await getParentSessionModel(parentSessionID);

    let resolvedModel: ModelConfig | undefined;
    if (modelService) {
      // Use throwing resolver - will throw with actionable error if resolution fails
      resolvedModel = modelService.resolveModelForAgentOrThrow(agent, parentModel);
    } else {
      resolvedModel = parentModel;
    }

    // [CRITICAL] Check for undefined BEFORE creating session
    if (!resolvedModel) {
      throw new Error(
        `[OMCO] No model available for agent "${agent}". ` +
        `Configure tier mapping with 'npx omco-setup'.`
      );
    }

    // Now safe to create session and task...
    const task: BackgroundTask = {
      id: taskId,
      status: "running",
      description,
      parentSessionID,
      startedAt: Date.now(),
    };
    tasks.set(taskId, task);

    // ... rest of task creation (session.create, session.prompt, etc.)...

    return task;
  } catch (err) {
    // [CRITICAL] Return immediately failed task with actionable error
    // This handles both model resolution errors AND any session creation errors
    const failedTask: BackgroundTask = {
      id: taskId,
      status: "failed",
      description,
      parentSessionID,
      error: String(err),
      startedAt: Date.now(),
      completedAt: Date.now(),
    };
    tasks.set(taskId, failedTask);
    return failedTask;
  }
};
```

**Key Changes:**
1. Generate `taskId` before try block so we have it for failed task
2. Check `resolvedModel` is defined BEFORE session creation
3. Wrap entire flow in try/catch to handle all error types
4. Return proper failed task object (not throw) for graceful handling

**Acceptance Criteria:**
- [ ] Background task creation handles model resolution errors
- [ ] Failed tasks include actionable error messages
- [ ] No uncaught exceptions from model resolution
- [ ] Undefined model check happens BEFORE session.create()

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/tools/background-manager.ts` | Add `detectConfiguredProvider()`, update `getParentSessionModel()`, update `createTask()` error handling |
| `src/tools/model-resolution-service.ts` | Add `resolveModelForAgentOrThrow()` |
| `src/tools/call-omco-agent.ts` | Use throwing resolver, handle errors gracefully |
| `src/config/index.ts` | Remove hardcoded github-copilot models, use tier references |
| `bin/omco-setup.ts` | Add config testing, add `--auto` flag |

## Testing Strategy

### Unit Tests

1. **model-resolution-service.test.ts**
   - Test `resolveModelForAgentOrThrow()` returns model when configured
   - Test throws with actionable message when unconfigured

2. **background-manager.test.ts**
   - Test `detectConfiguredProvider()` with mock provider.list()
   - Test `getParentSessionModel()` fallback chain

### Integration Tests

1. Test subagent spawning with:
   - No tierDefaults, no assistant messages → should fail with clear error
   - No tierDefaults, connected provider → should detect and use provider
   - tierDefaults configured → should use tier mapping

### Manual Testing

1. Fresh install without omco.json
   - Run skill → expect clear error guiding to `npx omco-setup`

2. Run `npx omco-setup`
   - Select OpenAI
   - Verify config written
   - Run skill → should work

## Success Criteria

1. **No Silent 401 Failures**
   - When model can't be resolved, return clear error instead of failing silently

2. **Provider Detection Works**
   - When no tierDefaults and no assistant messages, detect connected provider

3. **Skills Work Regardless of Provider**
   - `/ralplan`, `/autopilot`, etc. work with any main model

4. **Clear Error Messages**
   - All error messages include actionable guidance (`npx omco-setup`)

5. **Backward Compatible**
   - Existing omco.json configurations continue to work
   - github-copilot users with existing config see no change

## Commit Strategy

1. **Commit 1: Add provider detection**
   - `feat(background-manager): add provider detection fallback for model resolution`

2. **Commit 2: Add throwing resolver**
   - `feat(model-resolution): add resolveModelForAgentOrThrow with actionable errors`

3. **Commit 3: Update agent spawning**
   - `refactor(call-omco-agent): use throwing resolver for clear error messages`
   - Note: Using "refactor" not "fix" because we're changing the pattern, not fixing a bug

4. **Commit 4: Remove hardcoded defaults**
   - `refactor(config): use tier references instead of hardcoded github-copilot models`

5. **Commit 5: Update background manager error handling**
   - `fix(background-manager): handle model resolution errors before session creation`

6. **Commit 6: Update setup CLI**
   - `feat(omco-setup): add config verification after write`

## Execution

After plan approval, execute with `/ultrapilot` for parallel implementation.

## PLAN_READY
