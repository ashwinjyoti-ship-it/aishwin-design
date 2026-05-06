import "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    ARTIFACTS: R2Bucket;
    CACHE: KVNamespace;
    APP_PASSWORD: string;
    SESSION_SECRET: string;
    APP_NAME: string;
  }
}