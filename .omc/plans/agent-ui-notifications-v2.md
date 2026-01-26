# Agent UI Notifications Implementation Plan

> **Created**: 2026-01-26
> **Status**: READY FOR IMPLEMENTATION
> **Version**: v2 (updated after Critic review)

## Problem

서브에이전트 호출 시 UI 피드백이 없음:
- `call_omco_agent` (sync) - 알림 없음
- `background_task` (async) - 완료 알림만 있음, 시작 알림 없음

## Solution

`TuiStatusService`를 tools에 직접 주입하여 에이전트 시작/완료 시 toast 알림 표시

```
┌─────────────────────────────────────────────────────────────┐
│                       src/index.ts                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          createTuiStatusHook(ctx)                    │  │
│  │     Returns: { service, hooks }                      │  │
│  └──────────────────────────────────────────────────────┘  │
│            │                                    │           │
│            ▼                                    ▼           │
│  ┌─────────────────────┐            ┌──────────────────────┐│
│  │ call-omco-agent.ts  │            │ background-manager.ts││
│  │ tuiService.notify() │            │ tuiService.notify()  ││
│  └─────────────────────┘            └──────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

- [ ] AC1: `call_omco_agent` sync 호출 시 "🤖 Agent Started" toast 표시
- [ ] AC2: `call_omco_agent` 완료 시 성공/실패 toast 표시 (duration 포함)
- [ ] AC3: `background_task` 시작 시 "🤖 Agent Started" toast 표시
- [ ] AC4: `background_task` 완료 시 toast 표시 (기존 기능 유지)
- [ ] AC5: `tui_status.showAgentNotifications: false`로 비활성화 가능
- [ ] AC6: 모든 기존 테스트 통과
- [ ] AC7: TypeScript 타입 체크 통과

---

## Implementation Tasks

### Phase 1: TuiStatusService Interface 추출

**File**: `src/hooks/tui-status.ts`

**Task 1.1**: `ToastOptions` 타입 export 추가
```typescript
// Line ~12: 기존 private interface를 export
export interface ToastOptions {
  title?: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}
```

**Task 1.2**: `TuiStatusService` interface 정의 (Line ~60, SessionMetrics 다음)
```typescript
export interface TuiStatusService {
  showToast: (opts: ToastOptions) => Promise<void>;
  notifyAgentStarted: (agentName: string, task?: string, callID?: string) => Promise<void>;
  notifyAgentCompleted: (agentName: string, success?: boolean, callID?: string) => Promise<void>;
  notifyModeChange: (mode: string, active: boolean) => Promise<void>;
  getActiveAgents: () => AgentStatus[];
  getMetrics: () => { session: Omit<SessionMetrics, "agentMetrics">; agents: Record<string, AgentMetrics> };
}
```

**Task 1.3**: Return statement에 `service` property 추가 (Line ~301)
```typescript
const service: TuiStatusService = {
  showToast,
  notifyAgentStarted,
  notifyAgentCompleted,
  notifyModeChange,
  getActiveAgents,
  getMetrics,
};

return {
  service,  // NEW: 직접 접근용
  // ... 기존 exports 유지 ...
  "tool.execute.before": ...,
  "tool.execute.after": ...,
};
```

### Phase 2: hooks/index.ts Export 추가

**File**: `src/hooks/index.ts`

**Task 2.1**: TuiStatusService 타입 export (Line 69 근처)
```typescript
export { 
  createTuiStatusHook, 
  type TuiStatusOptions,
  type TuiStatusService,  // ADD
  type ToastOptions,      // ADD
} from "./tui-status";
```

### Phase 3: call-omco-agent.ts 수정

**File**: `src/tools/call-omco-agent.ts`

**Task 3.1**: Import 추가 (Line 1-6)
```typescript
import type { TuiStatusService } from "../hooks/tui-status";
```

**Task 3.2**: Function signature 수정 (Line 7-11)
```typescript
export function createCallOmcoAgent(
  ctx: PluginInput,
  manager: BackgroundManager,
  modelService?: ModelResolutionService,
  tuiService?: TuiStatusService  // ADD
): ToolDefinition {
```

**Task 3.3**: Sync 실행 시 시작 알림 (Line 82, try 블록 전)
```typescript
// Sync execution - notify start
const callID = `sync_${Date.now()}_${subagent_type}`;
if (tuiService) {
  const taskSummary = description?.substring(0, 50) || prompt.split('\n')[0]?.substring(0, 50);
  await tuiService.notifyAgentStarted(subagent_type, taskSummary, callID);
}

try {
```

**Task 3.4**: 성공 시 완료 알림 (return 전)
```typescript
if (tuiService) {
  await tuiService.notifyAgentCompleted(subagent_type, true, callID);
}

return JSON.stringify({
  session_id: sessionID,
  status: "completed",
  result,
});
```

**Task 3.5**: 에러 시 완료 알림 (각 에러 return 전)
```typescript
// HTTP error, provider error, catch block 각각에 추가
if (tuiService) {
  await tuiService.notifyAgentCompleted(subagent_type, false, callID);
}
```

### Phase 4: background-manager.ts 수정

**File**: `src/tools/background-manager.ts`

**Task 4.1**: Import 추가 (Line 1-5)
```typescript
import type { TuiStatusService } from "../hooks/tui-status";
```

**Task 4.2**: Function signature 수정 (Line 47-51)
```typescript
export function createBackgroundManager(
  ctx: PluginInput,
  config?: BackgroundTaskConfig,
  modelService?: ModelResolutionService,
  tuiService?: TuiStatusService  // ADD
): BackgroundManager {
```

**Task 4.3**: 시작 알림 추가 (Line ~139, tasks.set 후)
```typescript
tasks.set(taskId, task);
log(`Background task created`, { taskId, description, agent });

// Notify TUI that background agent is starting
if (tuiService) {
  const taskSummary = description?.substring(0, 50);
  tuiService.notifyAgentStarted(agent, taskSummary, taskId).catch(() => {});
}
```

**Task 4.4**: 완료 알림을 tuiService로 교체 (Line ~226)
```typescript
// 기존 ctx.client.tui.showToast 대신:
if (tuiService) {
  tuiService.notifyAgentCompleted(agent, true, taskId).catch(() => {});
} else {
  // Fallback (backward compatibility)
  ctx.client.tui.showToast({...}).catch(() => {});
}
```

**Task 4.5**: 실패 알림 추가 (catch block, Line ~235)
```typescript
if (tuiService) {
  tuiService.notifyAgentCompleted(agent, false, taskId).catch(() => {});
}
```

**NOTE**: background-manager 내부의 async IIFE에서는 `await` 대신 `.catch(() => {})` 사용 (non-blocking)

### Phase 5: index.ts 수정 (Wiring)

**File**: `src/index.ts`

**Task 5.1**: tuiStatus 생성을 backgroundManager 전으로 이동

현재 순서:
```
modelService → backgroundManager → ... → tuiStatus (Line 93)
```

새 순서:
```
modelService → tuiStatus → backgroundManager (with tuiService) → callOmcoAgent (with tuiService)
```

```typescript
// Line ~36: tuiStatus를 먼저 생성
const tuiStatus = createTuiStatusHook(ctx, {
  enabled: pluginConfig.tui_status?.enabled ?? true,
  showAgentNotifications: pluginConfig.tui_status?.showAgentNotifications ?? true,
  showModeChanges: pluginConfig.tui_status?.showModeChanges ?? true,
  toastDuration: pluginConfig.tui_status?.toastDuration ?? 3000,
  trackMetrics: pluginConfig.tui_status?.trackMetrics ?? true,
});

// backgroundManager에 tuiService 전달
const backgroundManager = createBackgroundManager(
  ctx, 
  pluginConfig.background_task, 
  modelService,
  tuiStatus.service  // ADD
);

// callOmcoAgent에 tuiService 전달
const callOmcoAgent = createCallOmcoAgent(
  ctx, 
  backgroundManager, 
  modelService,
  tuiStatus.service  // ADD
);
```

**Task 5.2**: 기존 tuiStatus 생성 코드 제거 (Line 93-100)

### Phase 6: Testing & Verification

**Task 6.1**: TypeScript check
```bash
bun run typecheck
```

**Task 6.2**: Build
```bash
bun run build
```

**Task 6.3**: Unit tests
```bash
bun test
```

**Task 6.4**: Manual verification
1. OpenCode 시작
2. `call_omco_agent` 실행 (run_in_background=false)
3. 시작 toast 확인: "🔎 Agent Started: explore"
4. 완료 toast 확인: "✅ Agent Completed: explore (5.2s)"
5. `call_omco_agent` 실행 (run_in_background=true)
6. 시작 toast 즉시 확인
7. 완료 toast 확인

**Task 6.5**: Config toggle test
```json
// .opencode/omco.json
{
  "tui_status": {
    "showAgentNotifications": false
  }
}
```
- Toast가 나타나지 않는지 확인

---

## Summary

| Phase | Files | Changes |
|-------|-------|---------|
| 1 | tui-status.ts | Export interface, add `service` property |
| 2 | hooks/index.ts | Export TuiStatusService type |
| 3 | call-omco-agent.ts | Add tuiService param, notify on start/complete |
| 4 | background-manager.ts | Add tuiService param, notify on start/complete |
| 5 | index.ts | Reorder creation, pass tuiService |
| 6 | - | Testing |

**Estimated Time**: ~1.5 hours
**Risk Level**: Low (additive changes, fallback for backward compat)
