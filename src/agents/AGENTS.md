# Agent Definitions

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode의 28개 전문 에이전트 정의를 그대로 포팅. 레거시 이름(oracle, librarian 등)과 새 이름(architect, researcher 등) 모두 지원. 에이전트 시스템 프롬프트와 역할 정의는 oh-my-claudecode v3.0.11과 동일하게 유지되었으며, OpenCode 에이전트 설정 형식으로 변환되었다.

## Overview

This directory contains the core agent definition system for omo-omcs. It defines all 28+ specialized agents available for multi-agent orchestration, following the oh-my-claudecode v3.0.11 naming conventions.

## Architecture

The agent system provides a type-safe, hierarchical agent registry with:
- **Agent tiers**: LOW (Haiku), MEDIUM (Sonnet), HIGH (Opus)
- **Specialized roles**: Architecture, execution, search, design, documentation, testing, security
- **System prompts**: Role-specific instructions and constraints
- **Model routing**: Automatic model selection based on task complexity

## Key Files

### `index.ts`
**Purpose**: Central agent registry and definitions
**Exports**:
- `AgentDefinition` - Interface for agent configuration
- `agents` - Map of all 28+ agent definitions by role and tier
- Agent constants organized by domain (architect, executor, designer, etc.)

**Agent Categories**:
1. **Architect Agents** (was: Oracle)
   - `architect-low`, `architect-medium`, `architect` - Analysis & debugging

2. **Executor Agents** (was: Sisyphus-Junior)
   - `executor-low`, `executor`, `executor-high` - Code implementation

3. **Explorer Agents**
   - `explore`, `explore-medium` - Codebase search & navigation

4. **Researcher Agents** (was: Librarian)
   - `researcher-low`, `researcher` - Documentation & API research

5. **Designer Agents** (was: Frontend-Engineer)
   - `designer-low`, `designer`, `designer-high` - UI/UX design

6. **Writer Agents** (was: Document-Writer)
   - `writer` - Technical documentation

7. **Vision Agents** (was: Multimodal-Looker)
   - `vision` - Visual/media analysis

8. **Planning Agents**
   - `planner` (Opus) - Strategic planning
   - `analyst` (Opus, was: Metis) - Pre-planning analysis
   - `critic` (Opus, was: Momus) - Plan review & critique

9. **QA Agents**
   - `qa-tester`, `qa-tester-high` - Interactive CLI testing

10. **Security Agents**
    - `security-reviewer-low`, `security-reviewer` - Security analysis

11. **Build Agents**
    - `build-fixer-low`, `build-fixer` - Build error resolution

12. **TDD Agents**
    - `tdd-guide-low`, `tdd-guide` - Test-driven development

13. **Code Review Agents**
    - `code-reviewer-low`, `code-reviewer` - Code quality review

14. **Data Science Agents**
    - `scientist-low`, `scientist`, `scientist-high` - Data analysis & ML

## Usage Patterns

### Direct Agent Access
```typescript
import { agents } from './agents';

const architectAgent = agents.get('architect');
const executorLowAgent = agents.get('executor-low');
```

### Model Tier Selection
- **LOW (Haiku)**: Fast lookups, simple tasks, quick checks
- **MEDIUM (Sonnet)**: Standard implementation, balanced reasoning
- **HIGH (Opus)**: Complex debugging, architecture, deep analysis

### System Prompt Structure
All agents follow this pattern:
1. **Role**: Identity and primary responsibility
2. **Critical_Constraints**: What the agent CANNOT do
3. **Work_Protocol**: Step-by-step execution guidelines
4. **Verification**: How to prove completion
5. **Style**: Communication preferences

## Naming Convention Migration (v3.0.11)

| Old Name (v2.x) | New Name (v3.x) | Role |
|-----------------|-----------------|------|
| `oracle` | `architect` | Architecture advisor |
| `librarian` | `researcher` | Documentation research |
| `frontend-engineer` | `designer` | UI/UX design |
| `document-writer` | `writer` | Technical writing |
| `sisyphus-junior` | `executor` | Task execution |
| `multimodal-looker` | `vision` | Visual analysis |
| `metis` | `analyst` | Pre-planning |
| `momus` | `critic` | Plan critique |

## Integration Points

- **Config System**: `/home/calvin/workspace/omo-omcs/src/config/` - Agent configuration loading
- **Plugin Handlers**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/` - OpenCode integration
- **Prompts**: `/home/calvin/workspace/omo-omcs/src/prompts/` - Behavioral overlays (ultrawork, etc.)

## Design Principles

1. **Specialization**: Each agent has a narrow, well-defined role
2. **Read-only by default**: Most agents analyze and recommend, not implement
3. **Explicit constraints**: System prompts block forbidden actions
4. **Model efficiency**: Route simple tasks to Haiku, complex to Opus
5. **Extensibility**: Easy to add new agent types via the definition structure

## Dependencies

- `@opencode-ai/plugin` - OpenCode plugin API
- `zod` - Configuration validation (via config module)

## Related Documentation

- [Config System](../config/AGENTS.md) - Agent configuration
- [Plugin Handlers](../plugin-handlers/AGENTS.md) - OpenCode registration
- [Prompts](../prompts/AGENTS.md) - Behavioral overlays
