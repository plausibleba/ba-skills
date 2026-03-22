// ─── Stripe Webhook Handler (Edge Runtime) ───────────────────────────────────
// Receives Stripe events and updates the user's tier in Supabase.
//
// Events handled:
//   checkout.session.completed — user just paid, activate their tier
//   customer.subscription.deleted — subscription cancelled, downgrade to free
//
// Required env vars:
//   STRIPE_SECRET_KEY          — to verify events (used for session retrieval)
//   STRIPE_WEBHOOK_SECRET      — webhook endpoint signing secret
//   SUPABASE_URL               — Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY  — service role key (bypasses RLS for profile updates)

export const config = { runtime: "edge" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Stripe signature format: t=timestamp,v1=hash,v1=hash,...
  const elements = signature.split(",");
  const timestamp = elements.find((e) => e.startsWith("t="))?.slice(2);
  const signatures = elements
    .filter((e) => e.startsWith("v1="))
    .map((e) => e.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  // Tolerance: reject events older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) return false;

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signatures.some((s) => s === expectedHex);
}

async function supabaseUpdate(
  url: string,
  serviceKey: string,
  userId: string,
  updates: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
  return { ok: true };
}

// ─── All use cases unlocked for paid tiers ───────────────────────────────────
const ALL_USE_CASES = [
  "solution_engineering",
  "board_diagnostic",
  "transformation_planning",
  "agentic_governance",
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeKey || !webhookSecret || !supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars for Stripe webhook");
    return new Response("Server misconfigured", { status: 500 });
  }

  // Verify signature
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  const valid = await verifyStripeSignature(payload, signature, webhookSecret);
  if (!valid) {
    console.error("Invalid Stripe signature");
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload);

  // ── checkout.session.completed ──────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier;
    const interval = session.metadata?.interval;

    if (!userId || !tier) {
      console.error("Missing metadata on checkout session:", session.id);
      return new Response("OK", { status: 200 }); // ack so Stripe doesn't retry
    }

    // Determine use cases based on tier
    const useCases = tier === "starter"
      ? ["solution_engineering"] // Starter gets one use case — they'll pick in onboarding
      : ALL_USE_CASES;

    const result = await supabaseUpdate(supabaseUrl, supabaseServiceKey, userId, {
      tier,
      billing_interval: interval || "monthly",
      active_use_cases: useCases,
      stripe_customer_id: session.customer || null,
      stripe_subscription_id: session.subscription || null,
      // Clear trial fields — they've upgraded
      trial_started_at: null,
      trial_ends_at: null,
    });

    if (!result.ok) {
      console.error("Supabase update failed:", result.error);
      return new Response("DB update failed", { status: 500 });
    }

    console.log(`[Stripe] Activated ${tier}/${interval} for user ${userId}`);
  }

  // ── customer.subscription.deleted ──────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    // Look up user by stripe_customer_id
    const lookupRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?stripe_customer_id=eq.${customerId}&select=id`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (lookupRes.ok) {
      const profiles = await lookupRes.json();
      if (profiles.length > 0) {
        const userId = profiles[0].id;
        await supabaseUpdate(supabaseUrl, supabaseServiceKey, userId, {
          tier: "free",
          billing_interval: null,
          active_use_cases: [],
          stripe_subscription_id: null,
        });
        console.log(`[Stripe] Downgraded user ${userId} to free (subscription cancelled)`);
      }
    }
  }

  return new Response("OK", { status: 200 });
}
