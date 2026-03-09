// Edge Runtime — 30s wall-clock on all Vercel plans (Hobby included).
// Serverless functions cap at 10s on Hobby, which is not enough for
// capabilityPPIT scaffold generation (typically 20-40s).
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
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.stop_reason && data.stop_reason !== "end_turn") {
      console.error("Anthropic stop_reason:", data.stop_reason, "usage:", data.usage);
    }
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Anthropic proxy error:", err);
    return new Response(JSON.stringify({ error: "Upstream request failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
