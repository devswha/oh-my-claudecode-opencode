const DEBUG = process.env.DEBUG === "true" || process.env.OMO_OMCS_DEBUG === "true";

export function log(message: string, data?: Record<string, unknown>): void {
  if (!DEBUG) return;

  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  console.log(`[omco] ${timestamp} ${message}${dataStr}`);
}

export function warn(message: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  console.warn(`[omco] ${timestamp} WARN: ${message}${dataStr}`);
}

export function error(message: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const dataStr = data ? ` ${JSON.stringify(data)}` : "";
  console.error(`[omco] ${timestamp} ERROR: ${message}${dataStr}`);
}
