import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load ALL env vars from .env.local (including non-VITE_ prefixed ones)
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react()],
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
