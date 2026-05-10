import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { env } from "./env";

const COOKIE = "aishwin_session";
const MAX_AGE = 60 * 60 * 24 * 30;

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function signSession(): Promise<string> {
  const e = env();
  const issued = Date.now().toString();
  const mac = await hmac(e.SESSION_SECRET || e.APP_PASSWORD || "dev", issued);
  return `${issued}.${mac}`;
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [issued, mac] = token.split(".");
  if (!issued || !mac) return false;
  const e = env();
  const expected = await hmac(e.SESSION_SECRET || e.APP_PASSWORD || "dev", issued);
  if (expected !== mac) return false;
  const age = (Date.now() - Number(issued)) / 1000;
  return age >= 0 && age < MAX_AGE;
}

export async function setSessionCookie() {
  const token = await signSession();
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAuthed(req?: NextRequest): Promise<boolean> {
  // Prefer reading directly from the request object (reliable in Cloudflare edge
  // runtime). Fall back to next/headers cookies() for server component contexts.
  const token = req
    ? req.cookies.get(COOKIE)?.value
    : (await cookies()).get(COOKIE)?.value;
  return verifySession(token);
}

export const SESSION_COOKIE = COOKIE;
