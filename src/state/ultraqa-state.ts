import * as fs from "fs";
import * as path from "path";

export interface UltraQAState {
  active: boolean;
  sessionId: string;
  goal: string;
  iteration: number;
  maxIterations: number;
  lastBuildResult?: 'pass' | 'fail';
  lastLintResult?: 'pass' | 'fail';
  lastTestResult?: 'pass' | 'fail';
  issues: QAIssue[];
  startedAt: string;
  completedAt?: string;
  lastActivityAt: string;
}

export interface QAIssue {
  type: 'build' | 'lint' | 'test';
  message: string;
  file?: string;
  line?: number;
  fixedAt?: string;
}

const STATE_FILENAME = "ultraqa-state.json";

function getStateFilePath(projectDir: string): string {
  return path.join(projectDir, ".omc", STATE_FILENAME);
}

export function readUltraQAState(projectDir: string): UltraQAState | null {
  const statePath = getStateFilePath(projectDir);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(statePath, "utf-8");
    return JSON.parse(content) as UltraQAState;
  } catch (error) {
    console.error("Failed to read UltraQA state:", error);
    return null;
  }
}

export function writeUltraQAState(projectDir: string, state: UltraQAState): void {
  const statePath = getStateFilePath(projectDir);
  const omcDir = path.dirname(statePath);

  if (!fs.existsSync(omcDir)) {
    fs.mkdirSync(omcDir, { recursive: true });
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf-8");
}

export function clearUltraQAState(projectDir: string): void {
  const statePath = getStateFilePath(projectDir);
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

export function createUltraQAState(
  sessionId: string,
  goal: string,
  maxIterations: number = 10
): UltraQAState {
  const now = new Date().toISOString();
  return {
    active: true,
    sessionId,
    goal,
    iteration: 0,
    maxIterations,
    issues: [],
    startedAt: now,
    lastActivityAt: now,
  };
}

export function updateUltraQAIteration(
  projectDir: string,
  state: UltraQAState,
  results: {
    build?: 'pass' | 'fail';
    lint?: 'pass' | 'fail';
    test?: 'pass' | 'fail';
  }
): void {
  state.iteration += 1;
  state.lastActivityAt = new Date().toISOString();

  if (results.build !== undefined) {
    state.lastBuildResult = results.build;
  }
  if (results.lint !== undefined) {
    state.lastLintResult = results.lint;
  }
  if (results.test !== undefined) {
    state.lastTestResult = results.test;
  }

  writeUltraQAState(projectDir, state);
}

export function addQAIssue(
  projectDir: string,
  state: UltraQAState,
  issue: QAIssue
): void {
  state.issues.push(issue);
  state.lastActivityAt = new Date().toISOString();
  writeUltraQAState(projectDir, state);
}

export function markIssueFixed(
  projectDir: string,
  state: UltraQAState,
  issueIndex: number
): void {
  if (issueIndex >= 0 && issueIndex < state.issues.length) {
    state.issues[issueIndex].fixedAt = new Date().toISOString();
    state.lastActivityAt = new Date().toISOString();
    writeUltraQAState(projectDir, state);
  }
}

export function markUltraQAComplete(
  projectDir: string,
  state: UltraQAState
): void {
  state.active = false;
  state.completedAt = new Date().toISOString();
  state.lastActivityAt = new Date().toISOString();
  writeUltraQAState(projectDir, state);
}

export function isUltraQAPassing(state: UltraQAState): boolean {
  return (
    (state.lastBuildResult === 'pass' || state.lastBuildResult === undefined) &&
    (state.lastLintResult === 'pass' || state.lastLintResult === undefined) &&
    (state.lastTestResult === 'pass' || state.lastTestResult === undefined)
  );
}
