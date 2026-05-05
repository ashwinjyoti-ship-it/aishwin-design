import { db } from "./env";

export interface ProviderKeys {
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
  defaultProvider: "moonshot",
  defaultModel: "kimi-k2-0711-preview",
  keys: {},
};

export async function readSettings(): Promise<AppSettings> {
  const row = await db().prepare("SELECT value FROM settings WHERE key = ?").bind("app").first<{ value: string }>();
  if (!row?.value) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(row.value) };
  } catch {
    return DEFAULTS;
  }
}

export async function writeSettings(next: AppSettings): Promise<void> {
  await db()
    .prepare("INSERT INTO settings (key, value) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()")
    .bind(JSON.stringify(next))
    .run();
}

export function publicSettings(s: AppSettings) {
  return {
    defaultProvider: s.defaultProvider,
    defaultModel: s.defaultModel,
    keysSet: {
      anthropic: !!s.keys.anthropic,
      gemini: !!s.keys.gemini,
      moonshot: !!s.keys.moonshot,
      openrouter: !!s.keys.openrouter,
    },
  };
}
