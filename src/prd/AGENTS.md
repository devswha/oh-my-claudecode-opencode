# PRD Management System

**Parent:** [../AGENTS.md](../AGENTS.md)

## Porting Context

oh-my-claudecode의 PRD 시스템 그대로 포팅. Ralph Loop의 핵심 컴포넌트. PRD 파일 형식(.omc/prd.json), User Story 구조, 수락 기준 추적 메커니즘이 oh-my-claudecode와 동일하다. Ralph Loop의 구조화된 작업 추적을 위한 핵심 시스템이다.

## Overview

This directory implements the Product Requirements Document (PRD) system for structured task tracking in ralph-loop mode. It provides persistence, progress tracking, and acceptance criteria verification for multi-iteration task execution.

## Architecture

The PRD system enables structured, goal-oriented task execution:
- **User Story model**: Tasks broken down into stories with acceptance criteria
- **Progress tracking**: Track completion status per story
- **Persistence**: JSON-based storage in `.omc/prd.json`
- **Iteration support**: Ralph loop checks PRD progress each iteration
- **Verification**: Pass/fail status for each acceptance criterion

## Key Files

### `index.ts`
**Purpose**: Module exports
**Exports**:
- Re-exports from `prd-manager.ts` and `progress-tracker.ts`

### `prd-manager.ts`
**Purpose**: PRD CRUD operations
**Exports**:
- `readPrd(projectDir)` - Read existing PRD
- `writePrd(projectDir, prd)` - Write/update PRD
- `createPrd(projectDir, project, description)` - Create new PRD
- `addUserStory(projectDir, story)` - Add story to PRD
- `updateUserStory(projectDir, storyId, updates)` - Update story
- `markStoryComplete(projectDir, storyId)` - Mark story as passed
- `getPrdStats(projectDir)` - Get completion statistics

**Types**:
- `UserStory` - Individual task/requirement
- `PRD` - Complete project requirements document

### `progress-tracker.ts`
**Purpose**: Progress monitoring and reporting
**Exports**:
- `getProgress(projectDir)` - Get detailed progress report
- `isProjectComplete(projectDir)` - Check if all stories pass
- `getNextStory(projectDir)` - Get next incomplete story
- `formatProgressReport(projectDir)` - Generate markdown report

## Data Model

### UserStory Interface
```typescript
interface UserStory {
  id: string;                    // Unique identifier (uuid)
  title: string;                 // Story title
  description?: string;          // Detailed description
  acceptanceCriteria: string[];  // List of acceptance criteria
  priority: number;              // 1 (highest) to 5 (lowest)
  passes: boolean;               // Verification status
  notes?: string;                // Implementation notes
  completedAt?: string;          // ISO timestamp
}
```

### PRD Interface
```typescript
interface PRD {
  project: string;              // Project name
  branchName?: string;          // Git branch name
  description: string;          // Project description
  userStories: UserStory[];     // List of stories
  createdAt?: string;           // ISO timestamp
  updatedAt?: string;           // ISO timestamp
}
```

## File Structure

### PRD Storage Location
```
<project-root>/.omc/prd.json
```

### PRD Format Example
```json
{
  "project": "task-manager-api",
  "branchName": "feature/user-auth",
  "description": "REST API for task management with user authentication",
  "createdAt": "2026-01-22T10:00:00.000Z",
  "updatedAt": "2026-01-22T12:30:00.000Z",
  "userStories": [
    {
      "id": "us-001",
      "title": "User Registration",
      "description": "Allow new users to create accounts",
      "acceptanceCriteria": [
        "POST /api/users endpoint exists",
        "Password is hashed before storage",
        "Returns 201 with user ID on success",
        "Returns 400 for invalid email format"
      ],
      "priority": 1,
      "passes": true,
      "completedAt": "2026-01-22T11:15:00.000Z"
    },
    {
      "id": "us-002",
      "title": "User Login",
      "description": "Authenticate existing users",
      "acceptanceCriteria": [
        "POST /api/auth/login endpoint exists",
        "Returns JWT token on successful auth",
        "Returns 401 for invalid credentials"
      ],
      "priority": 1,
      "passes": false,
      "notes": "In progress - endpoint created, JWT pending"
    }
  ]
}
```

## Usage Patterns

### Creating a PRD
```typescript
import { createPrd } from './prd';

const prd = createPrd(
  '/path/to/project',
  'My Project',
  'Build a REST API for task management'
);
```

### Adding User Stories
```typescript
import { addUserStory } from './prd';

const story: UserStory = {
  id: 'us-003',
  title: 'Create Task',
  description: 'Allow users to create new tasks',
  acceptanceCriteria: [
    'POST /api/tasks endpoint exists',
    'Requires authentication',
    'Returns 201 with task ID'
  ],
  priority: 2,
  passes: false
};

addUserStory('/path/to/project', story);
```

### Tracking Progress
```typescript
import { getProgress, isProjectComplete } from './prd';

const progress = getProgress('/path/to/project');
// { total: 5, completed: 3, pending: 2, percentComplete: 60 }

const isComplete = isProjectComplete('/path/to/project');
// false
```

### Marking Stories Complete
```typescript
import { markStoryComplete } from './prd';

markStoryComplete('/path/to/project', 'us-002');
// Updates passes: true, completedAt: <timestamp>
```

### Getting Next Story
```typescript
import { getNextStory } from './prd';

const nextStory = getNextStory('/path/to/project');
// Returns highest-priority incomplete story
```

### Formatting Progress Report
```typescript
import { formatProgressReport } from './prd';

const report = formatProgressReport('/path/to/project');
console.log(report);
```

Output:
```markdown
# Project Progress: My Project

**Status**: 3 of 5 stories complete (60%)

## Completed Stories ✅
- [x] User Registration (Priority 1)
- [x] User Login (Priority 1)
- [x] List Tasks (Priority 2)

## Pending Stories ⏳
- [ ] Create Task (Priority 2)
- [ ] Update Task (Priority 3)

## Next Up
**Create Task** (Priority 2)
- POST /api/tasks endpoint exists
- Requires authentication
- Returns 201 with task ID
```

## Integration with Ralph Loop

### Ralph Loop Flow
1. **Initialization**: `/ralph-init "project description"`
   - Creates PRD via `createPrd()`
   - Breaks down project into user stories
   - Defines acceptance criteria

2. **Each Iteration**:
   - Execute tasks toward current user story
   - Update story progress via `updateUserStory()`
   - Check completion via `isProjectComplete()`

3. **Story Completion**:
   - Verify all acceptance criteria
   - Mark complete via `markStoryComplete()`
   - Get next story via `getNextStory()`

4. **Loop Termination**:
   - `isProjectComplete()` returns true
   - All stories have `passes: true`
   - Ralph loop exits successfully

## File Operations

### Directory Initialization
```typescript
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
```

### Read Operations
```typescript
function readPrd(projectDir: string): PRD | null {
  const prdPath = getPrdPath(projectDir);
  if (fs.existsSync(prdPath)) {
    const content = fs.readFileSync(prdPath, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}
```

### Write Operations
```typescript
function writePrd(projectDir: string, prd: PRD): void {
  ensureDir(getSisyphusDir(projectDir));
  prd.updatedAt = new Date().toISOString();
  const prdPath = getPrdPath(projectDir);
  fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2));
}
```

## Progress Tracking Details

### Statistics Calculation
```typescript
interface PrdStats {
  total: number;          // Total stories
  completed: number;      // Stories with passes: true
  pending: number;        // Stories with passes: false
  percentComplete: number; // (completed / total) * 100
}
```

### Story Prioritization
Stories are sorted by:
1. **Priority** (1 = highest, 5 = lowest)
2. **Creation order** (earlier stories first)

### Completion Criteria
A story is considered complete when:
- `passes: true`
- All acceptance criteria verified
- `completedAt` timestamp set

## Logging

All operations log via shared logger:
```typescript
import { log } from '../shared/logger';

log('Created PRD', { project: prd.project, stories: prd.userStories.length });
log('Updated story', { id: storyId, passes: story.passes });
```

Enable debug logging:
```bash
export DEBUG=true
# or
export OMO_OMCS_DEBUG=true
```

## Design Principles

1. **Atomic updates**: Each operation reads, modifies, writes
2. **Timestamping**: Track creation and modification times
3. **Graceful fallbacks**: Return null if PRD doesn't exist
4. **Type safety**: Strong TypeScript types throughout
5. **Logging**: Debug visibility into all operations

## Error Handling

- **Missing PRD**: Return null from read operations
- **Directory creation**: Auto-create `.omc/` if missing
- **Parse errors**: Logged via shared logger
- **Write failures**: Propagated to caller

## Integration Points

- **Ralph Loop**: `/ralph-init` command creates PRD
- **Slash Commands**: `/home/calvin/workspace/omo-omcs/src/plugin-handlers/` - ralph-init command
- **Shared Logger**: `/home/calvin/workspace/omo-omcs/src/shared/` - Debug logging

## Dependencies

- `node:fs` - File system operations
- `node:path` - Path resolution
- `../shared/logger` - Debug logging

## Related Documentation

- [Plugin Handlers](../plugin-handlers/AGENTS.md) - Ralph commands
- [Shared Utilities](../shared/AGENTS.md) - Logger integration
