import * as fs from "fs";
import * as path from "path";
import { log } from "../shared/logger";

export interface AutopilotState {
  active: boolean;
  sessionId: string;
  phase: 'expansion' | 'planning' | 'execution' | 'qa' | 'validation' | 'complete';
  spec: string;
  plan: string;
  progress: TaskProgress[];
  startedAt: string;
  completedAt?: string;
  lastActivityAt: string;
}

export interface TaskProgress {
  taskId: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

const STATE_FILENAME = "autopilot-state.json";

export function getOmcDir(projectDir: string): string {
  return path.join(projectDir, ".omc");
}

export function getStatePath(projectDir: string): string {
  return path.join(getOmcDir(projectDir), STATE_FILENAME);
}

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readAutopilotState(projectDir: string): AutopilotState | null {
  const statePath = getStatePath(projectDir);

  if (fs.existsSync(statePath)) {
    try {
      const content = fs.readFileSync(statePath, "utf-8");
      const state = JSON.parse(content) as AutopilotState;
      log(`Read autopilot state from ${statePath}`, {
        active: state.active,
        phase: state.phase,
        sessionId: state.sessionId,
      });
      return state;
    } catch (err) {
      log(`Failed to read autopilot state`, { error: String(err) });
    }
  }

  return null;
}

export function writeAutopilotState(projectDir: string, state: AutopilotState): void {
  const dir = getOmcDir(projectDir);
  ensureDir(dir);
  const statePath = getStatePath(projectDir);

  try {
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    log(`Wrote autopilot state`, { phase: state.phase, active: state.active, sessionId: state.sessionId });
  } catch (err) {
    log(`Failed to write autopilot state`, { error: String(err) });
  }
}

export function clearAutopilotState(projectDir: string): void {
  const statePath = getStatePath(projectDir);

  if (fs.existsSync(statePath)) {
    try {
      fs.unlinkSync(statePath);
      log(`Cleared autopilot state`);
    } catch (err) {
      log(`Failed to clear autopilot state`, { error: String(err) });
    }
  }
}

export function createAutopilotState(
  sessionId: string,
  initialSpec: string = ""
): AutopilotState {
  return {
    active: true,
    sessionId,
    phase: 'expansion',
    spec: initialSpec,
    plan: "",
    progress: [],
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };
}

export function updateAutopilotPhase(
  projectDir: string,
  state: AutopilotState,
  phase: AutopilotState['phase']
): void {
  state.phase = phase;
  state.lastActivityAt = new Date().toISOString();
  writeAutopilotState(projectDir, state);
}

export function addTaskProgress(
  projectDir: string,
  state: AutopilotState,
  task: TaskProgress
): void {
  state.progress.push(task);
  state.lastActivityAt = new Date().toISOString();
  writeAutopilotState(projectDir, state);
}

export function updateTaskProgress(
  projectDir: string,
  state: AutopilotState,
  taskId: string,
  status: TaskProgress['status'],
  error?: string
): void {
  const task = state.progress.find(t => t.taskId === taskId);
  if (task) {
    task.status = status;
    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date().toISOString();
    }
    if ((status === 'completed' || status === 'failed') && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }
    if (error) {
      task.error = error;
    }
    state.lastActivityAt = new Date().toISOString();
    writeAutopilotState(projectDir, state);
  }
}

export function markAutopilotComplete(projectDir: string, state: AutopilotState): void {
  state.active = false;
  state.phase = 'complete';
  state.completedAt = new Date().toISOString();
  state.lastActivityAt = new Date().toISOString();
  writeAutopilotState(projectDir, state);
}
