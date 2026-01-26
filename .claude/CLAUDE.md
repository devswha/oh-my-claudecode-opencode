# oh-my-claudecode-opencode (OMCO)

## 중요: 이 프로젝트는 OpenCode용입니다!

**이 프로젝트는 Claude Code가 아닌 OpenCode를 위한 플러그인입니다.**

| 구분 | 원본 | 이 프로젝트 |
|------|------|------------|
| 이름 | oh-my-claudecode | oh-my-claudecode-opencode (OMCO) |
| 플랫폼 | Claude Code | **OpenCode** |
| 플러그인 API | Claude Code Plugin API | **@opencode-ai/plugin** |
| 설치 위치 | ~/.claude/plugins/ | OpenCode 플러그인 시스템 |

## 프로젝트 개요

- **버전**: 0.3.0
- **설명**: oh-my-claudecode의 OpenCode 포트 - 멀티 에이전트 오케스트레이션 플러그인
- **저장소**: https://github.com/devswha/oh-my-claudecode-opencode

## 핵심 차이점

### 1. 플러그인 API
```typescript
// Claude Code (원본)
import { Plugin } from '@anthropic/claude-code-plugin';

// OpenCode (이 프로젝트)
import { Plugin } from '@opencode-ai/plugin';
```

### 2. 실행 환경
- **Claude Code**: Anthropic의 Claude Code CLI
- **OpenCode**: @opencode-ai/sdk 기반 CLI (별도 프로젝트)

### 3. 설정 파일 위치
- **Claude Code**: `~/.claude/`
- **OpenCode**: `~/.opencode/` 또는 프로젝트별 `.opencode/`

## 아키텍처

```
oh-my-claudecode-opencode/
├── src/
│   ├── index.ts              # 플러그인 진입점
│   ├── agents/               # 에이전트 정의 및 로더
│   ├── skills/               # 스킬 정의 및 로더
│   ├── hooks/                # 이벤트 훅들
│   ├── plugin-handlers/      # 설정 핸들러
│   ├── tools/                # 커스텀 도구들
│   ├── config/               # 설정 관리
│   └── shared/               # 공유 유틸리티
├── assets/
│   ├── agents/               # 에이전트 마크다운 파일 (30개)
│   └── skills/               # 스킬 마크다운 파일 (31개)
└── tests/                    # 테스트 파일
```

## 에이전트 (30개)

동적 로딩 시스템으로 `assets/agents/`에서 마크다운 파일 로드:
- architect, architect-low, architect-medium
- executor, executor-low, executor-high
- explore, explore-medium
- researcher, researcher-low
- designer, designer-low, designer-high
- writer, planner, analyst, critic, vision
- scientist, scientist-low, scientist-high
- qa-tester, security-reviewer, security-reviewer-low
- build-fixer, build-fixer-low
- tdd-guide, tdd-guide-low
- code-reviewer, code-reviewer-low

## 스킬 (31개)

동적 로딩 시스템으로 `assets/skills/`에서 마크다운 파일 로드:
- ultrawork, ralph, autopilot, ultrapilot
- plan, planner, ralplan, review, analyze
- deepsearch, deepinit, research
- tdd, code-review, security-review, build-fix
- 등등...

## 빌드 및 테스트

```bash
# 빌드
bun run build

# 타입 체크
bun run typecheck

# 테스트
bun test
```

## 업스트림 동기화

원본 oh-my-claudecode에서 에이전트/스킬 업데이트 시:
1. `assets/agents/` 및 `assets/skills/` 복사
2. OpenCode API와의 호환성 확인
3. 테스트 실행

## 주의사항

- **Claude Code용 문서를 그대로 적용하지 마세요** - API가 다릅니다
- 플러그인 설치/업데이트 경로가 다릅니다
- 설정 파일 구조가 다를 수 있습니다
