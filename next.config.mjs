import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

// Binds Cloudflare Workers bindings (D1, R2, KV) to the Next.js dev server so
// getRequestContext() works during `next dev`. Has no effect in production.
if (process.env.NODE_ENV === "development") {
  await setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
};

export default nextConfig;
