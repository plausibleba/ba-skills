// ─── LLM Client ──────────────────────────────────────────────────────────────
// Shared Anthropic API caller used by all pipeline passes.
//
// In production (/api/claude), the proxy forces stream: true and returns SSE.
// In dev mode (Vite proxy), the response may be plain JSON.
// This client auto-detects the response format and handles both.

export interface LLMResponse {
  text: string;
  stopReason: string;
}

export async function callLLM(params: {
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
