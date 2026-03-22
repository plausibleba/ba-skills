// ─── Stripe Checkout Session Creator (Edge Runtime) ──────────────────────────
// Creates a Stripe Checkout session and returns the URL for client-side redirect.
//
// Request body: { priceId: string, userId?: string, email?: string }
// Response:     { url: string } or { error: string }
//
// After successful payment, Stripe redirects to /checkout/success?session_id={CHECKOUT_SESSION_ID}
// The webhook (api/stripe-webhook.ts) handles updating the user's tier in Supabase.

export const config = { runtime: "edge" };

// Map of valid price IDs to tier info (prevents arbitrary price injection)
const VALID_PRICES: Record<string, { tier: string; interval: string }> = {
  "price_1TDnMEIU846dhWU8Dm8fiVAD": { tier: "starter", interval: "monthly" },
  "price_1TDnMDIU846dhWU8QpfWlWUr": { tier: "individual", interval: "monthly" },
  "price_1TDnMEIU846dhWU8S4zKG6io": { tier: "individual", interval: "annual" },
  "price_1TDnMGIU846dhWU812XEZqHH": { tier: "team_5", interval: "monthly" },
  "price_1TDnMDIU846dhWU8FG5rm9W9": { tier: "team_5", interval: "annual" },
  "price_1TDnMEIU846dhWU8042hddzU": { tier: "team_10", interval: "monthly" },
  "price_1TDnMDIU846dhWU8qznOqHc3": { tier: "team_10", interval: "annual" },
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { priceId, userId, email } = await req.json();

    if (!priceId || !VALID_PRICES[priceId]) {
      return new Response(JSON.stringify({ error: "Invalid price" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tierInfo = VALID_PRICES[priceId];

    // Build the origin for success/cancel URLs
    const origin = req.headers.get("origin") || "https://app.plausibleba.com";

    // Create Checkout Session via Stripe REST API (no SDK needed in Edge)
    const params = new URLSearchParams();
    params.append("mode", "subscription");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("success_url", `${origin}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${origin}?checkout=cancelled`);
    params.append("allow_promotion_codes", "true");

    // Attach metadata for webhook to update Supabase profile
    params.append("metadata[userId]", userId || "");
    params.append("metadata[tier]", tierInfo.tier);
    params.append("metadata[interval]", tierInfo.interval);

    // Pre-fill email if available
    if (email) {
      params.append("customer_email", email);
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (!response.ok) {
      console.error("Stripe error:", session);
      return new Response(JSON.stringify({ error: session.error?.message || "Stripe error" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
