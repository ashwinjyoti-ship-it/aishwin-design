import { env } from "./env";

const TTL = 60 * 60 * 24 * 7; // 7 days

export async function kvGet(key: string): Promise<string | null> {
  return env().CACHE.get(key);
}

export async function kvPut(key: string, value: string): Promise<void> {
  await env().CACHE.put(key, value, { expirationTtl: TTL });
}

export async function kvDelete(key: string): Promise<void> {
  await env().CACHE.delete(key);
}
