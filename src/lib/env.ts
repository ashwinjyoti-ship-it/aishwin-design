import { getRequestContext } from "@cloudflare/next-on-pages";

export function env(): CloudflareEnv {
  return getRequestContext().env as unknown as CloudflareEnv;
}

export function db(): D1Database {
  return env().DB;
}
