import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname } from "path";
import type { ViteDevServer } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Dev-only Stripe Checkout handler ────────────────────────────────────────
// In production, this is handled by the Vercel Edge Function at api/checkout.ts.
// In dev, Vite's configureServer provides the same endpoint locally.

const VALID_PRICES: Record<string, { tier: string; interval: string }> = {
  "price_1TDnMEIU846dhWU8Dm8fiVAD": { tier: "starter", interval: "monthly" },
  "price_1TDnMDIU846dhWU8QpfWlWUr": { tier: "individual", interval: "monthly" },
  "price_1TDnMEIU846dhWU8S4zKG6io": { tier: "individual", interval: "annual" },
  "price_1TDnMGIU846dhWU812XEZqHH": { tier: "team_5", interval: "monthly" },
  "price_1TDnMDIU846dhWU8FG5rm9W9": { tier: "team_5", interval: "annual" },
  "price_1TDnMEIU846dhWU8042hddzU": { tier: "team_10", interval: "monthly" },
  "price_1TDnMDIU846dhWU8qznOqHc3": { tier: "team_10", interval: "annual" },
};

function stripeCheckoutPlugin(env: Record<string, string>) {
  return {
    name: "stripe-checkout-dev",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/api/checkout", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const stripeKey = env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "STRIPE_SECRET_KEY not set in .env.local" }));
          return;
        }

        let body = "";
        for await (const chunk of req) body += chunk;
        const { priceId, userId, email } = JSON.parse(body);

        if (!priceId || !VALID_PRICES[priceId]) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid price" }));
          return;
        }

        const tierInfo = VALID_PRICES[priceId];
        const origin = `http://localhost:5173`;

        const params = new URLSearchParams();
        params.append("mode", "subscription");
        params.append("line_items[0][price]", priceId);
        params.append("line_items[0][quantity]", "1");
        params.append("success_url", `${origin}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
        params.append("cancel_url", `${origin}?checkout=cancelled`);
        params.append("allow_promotion_codes", "true");
        params.append("metadata[userId]", userId || "");
        params.append("metadata[tier]", tierInfo.tier);
        params.append("metadata[interval]", tierInfo.interval);
        if (email) params.append("customer_email", email);

        try {
          const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
          });

          const session = await response.json();
          res.setHeader("Content-Type", "application/json");

          if (!response.ok) {
            res.statusCode = response.status;
            res.end(JSON.stringify({ error: session.error?.message || "Stripe error" }));
            return;
          }

          res.statusCode = 200;
          res.end(JSON.stringify({ url: session.url }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Failed to reach Stripe" }));
        }
      });
    },
  };
}

// ─── Vite Config ─────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  // Load ALL env vars from .env.local (including non-VITE_ prefixed ones)
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react(), stripeCheckoutPlugin(env)],
    server: {
      port: 5173,
      proxy: {
        "/api/anthropic": {
          target: "https://api.anthropic.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/anthropic/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              // Inject API key and version
              proxyReq.setHeader("x-api-key", env.ANTHROPIC_API_KEY ?? "");
              proxyReq.setHeader("anthropic-version", "2023-06-01");
              // Strip browser headers that trigger CORS rejection
              proxyReq.removeHeader("origin");
              proxyReq.removeHeader("referer");
            });
          },
        },
        "/v1": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
        "/health": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
  };
});
