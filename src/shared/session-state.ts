let mainSessionID: string | undefined;
const sessionAgents = new Map<string, string>();

export function getMainSessionID(): string | undefined {
  return mainSessionID;
}

export function setMainSessionID(sessionID: string | undefined): void {
  mainSessionID = sessionID;
}

export function getSessionAgent(sessionID: string): string | undefined {
  return sessionAgents.get(sessionID);
}

export function setSessionAgent(sessionID: string, agent: string): void {
  sessionAgents.set(sessionID, agent);
}

export function clearSessionAgent(sessionID: string): void {
  sessionAgents.delete(sessionID);
}
