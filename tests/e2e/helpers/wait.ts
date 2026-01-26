import type { OpencodeClient } from "@opencode-ai/sdk";

export async function waitForSessionIdle(
  client: OpencodeClient,
  sessionId: string,
  projectDir: string,
  timeoutMs: number = 60000
): Promise<void> {
  // Try SSE-based approach first
  try {
    return await waitForSessionIdleSSE(client, sessionId, projectDir, timeoutMs);
  } catch (sseError) {
    console.warn("SSE approach failed, falling back to message polling:", sseError);
    return await waitForSessionIdleMessagePoll(client, sessionId, projectDir, timeoutMs);
  }
}

async function waitForSessionIdleSSE(
  client: OpencodeClient,
  sessionId: string,
  projectDir: string,
  timeoutMs: number
): Promise<void> {
  // NOTE: We do NOT check initial status, because right after promptAsync()
  // the session may still briefly show as "idle" before processing begins.
  // We rely on SSE events to detect completion.

  const result = await client.event.subscribe({
    query: { directory: projectDir },
  });

  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      result.stream.return?.(undefined);
      reject(new Error(`Session ${sessionId} did not become idle within ${timeoutMs}ms (SSE)`));
    }, timeoutMs);

    (async () => {
      for await (const event of result.stream) {
        if (
          "type" in event &&
          event.type === "session.idle" &&
          "properties" in event &&
          (event as any).properties?.sessionID === sessionId
        ) {
          clearTimeout(timeout);
          result.stream.return?.(undefined);
          resolve();
          return;
        }
      }
    })().catch((err) => {
      clearTimeout(timeout);
      result.stream.return?.(undefined);
      reject(err);
    });
  });
}

/**
 * Poll for completion by checking if there's an assistant message with content.
 * This is more reliable than status API which may not return the session.
 */
async function waitForSessionIdleMessagePoll(
  client: OpencodeClient,
  sessionId: string,
  projectDir: string,
  timeoutMs: number
): Promise<void> {
  const startTime = Date.now();
  let lastMessageCount = 0;
  let lastPartCount = 0;
  let stableCount = 0;
  const pollInterval = 2000; // 2 seconds between polls

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Get messages for this session
      const messages = await client.session.messages({
        path: { id: sessionId },
        query: { directory: projectDir },
      });

      const msgData = messages.data ?? [];
      const currentMessageCount = msgData.length;

      // Check if there's an assistant message with actual content
      const assistantMessages = msgData.filter(m => m.info.role === "assistant");
      const totalParts = assistantMessages.reduce((sum, m) => sum + m.parts.length, 0);

      // Check if any message has an error
      const hasError = msgData.some(m => (m.info as any).error);

      // If we have assistant message with parts, or error, check for stability
      if ((assistantMessages.length > 0 && totalParts > 0) || hasError) {
        // Check if both message count AND part count are stable
        if (currentMessageCount === lastMessageCount && totalParts === lastPartCount) {
          stableCount++;
          // Consider idle if stable for 2 consecutive polls (4 seconds)
          if (stableCount >= 2) {
            return;
          }
        } else {
          stableCount = 0;
        }
        lastMessageCount = currentMessageCount;
        lastPartCount = totalParts;
      }

      // Also try status API as secondary check
      try {
        const allStatuses = await client.session.status({
          query: { directory: projectDir },
        });
        const status = allStatuses.data?.[sessionId];
        if (status?.type === "idle") {
          // Double-check with parts before returning
          if (assistantMessages.length > 0 && totalParts > 0) {
            return;
          }
        }
      } catch {
        // Status API failed, continue with message polling
      }
    } catch (err) {
      console.warn("Message poll error:", err);
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  throw new Error(`Session ${sessionId} did not become idle within ${timeoutMs}ms (message poll)`);
}
