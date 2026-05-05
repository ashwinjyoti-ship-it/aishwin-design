import { env } from "./env";

const BUCKET_ARTIFACTS = "artifacts";
const BUCKET_IMAGES = "images";

export function r2Key(kind: "artifact" | "image", id: string): string {
  return kind === "artifact" ? `${BUCKET_ARTIFACTS}/${id}.html` : `${BUCKET_IMAGES}/${id}.png`;
}

export async function r2Put(key: string, body: string | Uint8Array, contentType: string): Promise<void> {
  await env().ARTIFACTS.put(key, body, { httpMetadata: { contentType } });
}

export async function r2Get(key: string): Promise<R2ObjectBody | null> {
  return env().ARTIFACTS.get(key);
}

export async function r2Delete(key: string): Promise<void> {
  await env().ARTIFACTS.delete(key);
}
