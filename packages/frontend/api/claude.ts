// ─── Anthropic Streaming Proxy (Edge Runtime) ────────────────────────────────
// Edge Runtime + streaming solves the Vercel Hobby timeout:
// - Serverless functions die at 10s even when streaming (ERR_NETWORK_CHANGED)
// - Edge functions support native Web Streams and 30s wall-clock
// - With streaming, first bytes arrive in ~1s — connection stays alive
//
// The client (llm-client.ts) collects SSE events and reconstructs the message.

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    body.stream = true;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "output-128k-2025-02-19",
      },
      body: JSON.stringify(body),
    });

    // If Anthropic returns an error, forward it
    if (!response.ok) {
      const errBody = await response.text();
      return new Response(errBody, {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Proxy the SSE stream directly — Edge Runtime supports Web Streams natively
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    return new Response(JSON.stringify({ error: "Upstream request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
