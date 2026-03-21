// ─── LLM Client ──────────────────────────────────────────────────────────────
// Shared Anthropic API caller used by all pipeline passes.
//
// In production (/api/claude), the proxy forces stream: true and returns SSE.
// In dev mode (Vite proxy), the response may be plain JSON.
// This client auto-detects the response format and handles both.
//
// Retry behaviour: network errors and 5xx/429 responses are retried up to 2
// times with exponential backoff (2s → 4s). Non-retryable errors throw immediately.

export interface LLMResponse {
  text: string;
  stopReason: string;
}

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 2000;

/** Returns true for errors that are worth retrying (network issues, server overload) */
function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) return true; // "Failed to fetch" — network error
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("aborted") ||
      msg.includes("timeout") ||
      msg.includes("api 429") ||
      msg.includes("api 500") ||
      msg.includes("api 502") ||
      msg.includes("api 503") ||
      msg.includes("api 529")
    );
  }
  return false;
}

export async function callLLM(params: {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: { role: string; content: string }[];
}): Promise<LLMResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`LLM retry ${attempt}/${MAX_RETRIES} after ${delay}ms…`);
        await sleep(delay);
      }
      return await doCallLLM(params);
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES && isRetryable(e)) {
        console.warn("LLM call failed (retryable):", e instanceof Error ? e.message : String(e));
        continue;
      }
      throw e; // non-retryable or out of retries
    }
  }

  throw lastError; // unreachable but TS wants it
}

// ── Single-attempt call ─────────────────────────────────────────────────────

async function doCallLLM(params: {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: { role: string; content: string }[];
}): Promise<LLMResponse> {
  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "/api/claude";

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 300)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";

  // SSE stream (production) — collect chunks into full text
  if (contentType.includes("text/event-stream")) {
    return collectStream(res);
  }

  // Plain JSON (dev mode) — parse directly
  const data = await res.json();
  if (data.error) {
    throw new Error(`API error: ${JSON.stringify(data.error).slice(0, 300)}`);
  }
  const text = data.content?.find((b: any) => b.type === "text")?.text ?? "";
  return { text, stopReason: data.stop_reason ?? "end_turn" };
}

// ── SSE stream collector ─────────────────────────────────────────────────────

async function collectStream(res: Response): Promise<LLMResponse> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let stopReason = "end_turn";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines
    const lines = buffer.split("\n");
    buffer = lines.pop()!; // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;

      try {
        const event = JSON.parse(data);
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          fullText += event.delta.text;
        } else if (event.type === "message_delta" && event.delta?.stop_reason) {
          stopReason = event.delta.stop_reason;
        }
      } catch {
        // Skip malformed SSE events
      }
    }
  }

  if (!fullText) {
    throw new Error("Empty response from LLM — no text content received");
  }

  return { text: fullText, stopReason };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
