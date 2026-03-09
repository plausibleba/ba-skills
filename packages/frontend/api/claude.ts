// ─── Anthropic Streaming Proxy ────────────────────────────────────────────────
// Forces stream: true on all requests so data flows immediately and Vercel's
// 10s serverless timeout is never hit (bytes arrive within ~1s).
// The client collects the SSE stream and reconstructs the full message.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const body = { ...req.body, stream: true };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    // If Anthropic returns an error, forward it as JSON
    if (!response.ok) {
      const errBody = await response.text();
      return res.status(response.status).end(errBody);
    }

    // Stream the SSE response to the client
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: "No response body from upstream" });
    }

    // Pipe chunks directly to the client
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    res.end();
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Upstream request failed" });
    }
    res.end();
  }
}
