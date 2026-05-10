import { db, env } from "./env";

export interface ProviderKeys {
  openai?: string; // chat (gpt-5.5 etc.) + image generation (gpt-image-1)
  anthropic?: string;
  gemini?: string;
  moonshot?: string;
  openrouter?: string;
}

export interface AppSettings {
  defaultProvider: string;
  defaultModel: string;
  keys: ProviderKeys;
}

const DEFAULTS: AppSettings = {
  defaultProvider: "openai",
  defaultModel: "gpt-5.5",
  keys: {},
};

export async function readSettings(): Promise<AppSettings> {
  // Keys injected via Cloudflare encrypted env vars take effect when no key is
  // stored in D1 yet (or as a baseline that any UI-saved key overrides).
  const envKeys: ProviderKeys = {};
  const e = env();
  if (e.OPENAI_API_KEY) envKeys.openai = e.OPENAI_API_KEY;
  if (e.ANTHROPIC_API_KEY) envKeys.anthropic = e.ANTHROPIC_API_KEY;
  if (e.GEMINI_API_KEY) envKeys.gemini = e.GEMINI_API_KEY;

  const row = await db().prepare("SELECT value FROM settings WHERE key = ?").bind("app").first<{ value: string }>();
  if (!row?.value) return { ...DEFAULTS, keys: { ...envKeys } };
  try {
    const stored = JSON.parse(row.value) as AppSettings;
    // Merge: env keys are the baseline; any key saved via the UI takes precedence
    return { ...DEFAULTS, ...stored, keys: { ...envKeys, ...(stored.keys ?? {}) } };
  } catch {
    return { ...DEFAULTS, keys: { ...envKeys } };
  }
}

export async function writeSettings(next: AppSettings): Promise<void> {
  await db()
    .prepare(
      "INSERT INTO settings (key, value) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()",
    )
    .bind(JSON.stringify(next))
    .run();
}

export function publicSettings(s: AppSettings) {
  return {
    defaultProvider: s.defaultProvider,
    defaultModel: s.defaultModel,
    keysSet: {
      openai: !!s.keys.openai,
      anthropic: !!s.keys.anthropic,
      gemini: !!s.keys.gemini,
      moonshot: !!s.keys.moonshot,
      openrouter: !!s.keys.openrouter,
    },
  };
}
