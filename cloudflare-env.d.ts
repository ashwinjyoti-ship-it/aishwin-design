import "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ARTIFACTS: R2Bucket;
    CACHE: KVNamespace;
    APP_PASSWORD: string;
    SESSION_SECRET: string;
    APP_NAME: string;
    // Optional provider API keys — set as encrypted secrets in the Cloudflare dashboard.
    // These act as a baseline: any key saved via the Settings UI takes precedence.
    OPENAI_API_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    GEMINI_API_KEY?: string;
  }
}