# Prompt Templates

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode의 시스템 프롬프트 템플릿 포팅. ultrawork, ralph 모드 프롬프트. ULTRAWORK_SYSTEM_PROMPT, RALPH_LOOP_SYSTEM_PROMPT 등 고강도 실행 모드를 위한 행동 오버레이 프롬프트가 oh-my-claudecode에서 그대로 포팅되었다. 프롬프트 내용과 구조가 동일하게 유지된다.

## Overview

This directory contains behavioral overlay prompts that modify default agent behavior for high-intensity execution modes. These prompts are injected into slash commands to enable specialized execution patterns.

## Architecture

Prompt templates provide behavior overrides:
- **Mode-specific instructions**: Ultrawork, ralph, etc.
- **Protocol definitions**: Step-by-step execution guidelines
- **Override tables**: Clear before/after behavior changes
- **Integration**: Used by slash commands in plugin-handlers

## Key Files

### `ultrawork.ts`
**Purpose**: Maximum intensity execution prompt
**Exports**:
- `ULTRAWORK_SYSTEM_PROMPT` - Complete ultrawork behavior definition

**Mode**: Maximum parallel execution with aggressive delegation

## Ultrawork System Prompt

### The Ultrawork Oath

Core principle: **MAXIMUM INTENSITY** - Half-measures are unacceptable.

### Behavior Overrides

| Default Behavior | Ultrawork Override |
|------------------|-------------------|
| Parallelize when profitable | **PARALLEL EVERYTHING** |
| Do simple tasks directly | **DELEGATE EVEN SMALL TASKS** |
| Wait for verification | **DON'T WAIT - continue immediately** |
| Background for long ops | **BACKGROUND EVERYTHING POSSIBLE** |

### Execution Protocol

#### 1. PARALLEL EVERYTHING
- Fire off MULTIPLE agents simultaneously
- Don't analyze dependencies, just launch
- Use background execution for ALL operations
- Maximum throughput is the only goal
- Launch 3-5 agents in parallel when possible

#### 2. DELEGATE AGGRESSIVELY
Route tasks to specialists IMMEDIATELY:
- `architect` → ANY debugging or analysis
- `researcher` → ANY research or doc lookup
- `explore` → ANY search operation
- `frontend-engineer` → ANY UI work
- `document-writer` → ANY documentation
- `sisyphus-junior` → ANY code changes

#### 3. NEVER WAIT
- Start next task BEFORE previous completes
- Check background task results LATER
- Don't block on verification - launch and continue
- Maximum concurrency at all times

#### 4. PERSISTENCE ENFORCEMENT
- Create TODO list IMMEDIATELY
- Mark tasks in_progress BEFORE starting
- Mark completed ONLY after VERIFICATION
- LOOP until 100% complete
- Re-check todo list before ANY conclusion

### The Ultrawork Promise

> "I will NOT stop until EVERY task is VERIFIED complete. Incomplete work is FAILURE."

### Verification Requirements

Before claiming completion:
1. **All todos complete** - Zero pending/in_progress
2. **All tests pass** - Fresh test run evidence
3. **All builds succeed** - Fresh build output
4. **All acceptance criteria met** - Verified against requirements

### Anti-Patterns

Ultrawork mode FORBIDS:
- Waiting for user input mid-execution
- Sequential processing when parallel possible
- Direct task execution instead of delegation
- Claiming completion without verification
- Stopping with pending tasks

## Usage Patterns

### In Slash Commands
```typescript
// plugin-handlers/config-handler.ts
const SLASH_COMMANDS = {
  "ultrawork": {
    template: `${ULTRAWORK_SYSTEM_PROMPT}

Execute this task at MAXIMUM INTENSITY:
<user-task>
$ARGUMENTS
</user-task>`,
    description: "Maximum intensity execution"
  }
};
```

### In Agent Spawning
```typescript
// When spawning ultrawork mode agent
const prompt = `${ULTRAWORK_SYSTEM_PROMPT}

<task>
${userTask}
</task>`;

Task({
  subagent_type: "oh-my-claudecode:executor-high",
  model: "opus",
  prompt: prompt
});
```

## Prompt Structure

### Standard Template Format

All prompt templates follow this structure:

1. **Header**: Mode announcement
   ```
   [MODE NAME ACTIVATED - TAGLINE]
   ```

2. **Oath/Principle**: Core commitment
   ```
   ## THE [MODE] OATH
   [Statement of commitment]
   ```

3. **Override Table**: Behavior changes
   ```
   ## [MODE] OVERRIDES
   | Default | Override |
   |---------|----------|
   ```

4. **Execution Protocol**: Step-by-step instructions
   ```
   ## EXECUTION PROTOCOL
   ### 1. First Step
   ### 2. Second Step
   ```

5. **Verification**: Completion requirements
   ```
   ## VERIFICATION
   - Requirement 1
   - Requirement 2
   ```

6. **Anti-Patterns**: Forbidden behaviors
   ```
   ## ANTI-PATTERNS
   - Forbidden action 1
   - Forbidden action 2
   ```

## Integration Points

- **Plugin Handlers**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/` - Consumes prompts for commands
- **Agent Definitions**: `/home/calvin/workspace/omo-omcs/src/agents/` - Base prompts modified by overlays
- **Config System**: `/home/calvin/workspace/omo-omcs/src/config/` - prompt_append configuration

## Future Prompt Templates

Planned additions:

### `ralph.ts`
**Purpose**: Persistence mode with PRD integration
**Features**:
- PRD-driven iteration
- Acceptance criteria verification
- User story tracking
- Loop continuation logic

### `architect.ts`
**Purpose**: Deep analysis mode
**Features**:
- Root cause analysis protocol
- Architecture decision records
- Read-only constraint enforcement
- Diagnostic reporting format

### `designer.ts`
**Purpose**: UI/UX design mode
**Features**:
- Component hierarchy analysis
- Style system adherence
- Accessibility requirements
- Responsive design checklist

## Design Principles

1. **Clarity**: Explicit override tables
2. **Completeness**: Cover all execution phases
3. **Enforcement**: Anti-pattern sections
4. **Verification**: Clear success criteria
5. **Modularity**: Composable with base prompts

## Prompt Composition

### Base + Overlay Pattern
```typescript
const finalPrompt = `
${baseAgentPrompt}

${behaviorOverlay}

<task>
${userTask}
</task>
`;
```

### Config Append Pattern
```json
{
  "agents": {
    "executor": {
      "prompt_append": "\n\nAlways use TypeScript strict mode."
    }
  }
}
```

Final prompt becomes:
```
[Base executor prompt]

[Ultrawork overlay if /ultrawork used]

Always use TypeScript strict mode.

<task>
[User task]
</task>
```

## Testing Prompts

Verify prompt effectiveness:
1. **Mode activation**: Does behavior change visibly?
2. **Override compliance**: Are defaults actually overridden?
3. **Verification enforcement**: Does it check completion?
4. **Anti-pattern avoidance**: Does it avoid forbidden behaviors?

## Maintenance Guidelines

When updating prompts:
1. **Preserve structure**: Keep standard template format
2. **Update examples**: Ensure examples use current agent names
3. **Sync commands**: Update matching slash command templates
4. **Document changes**: Add to version comments
5. **Test integration**: Verify with actual command usage

## Dependencies

- None (pure string exports)

## Related Documentation

- [Plugin Handlers](../plugin-handlers/AGENTS.md) - Command integration
- [Agent Definitions](../agents/AGENTS.md) - Base prompts
- [Configuration](../config/AGENTS.md) - prompt_append feature
