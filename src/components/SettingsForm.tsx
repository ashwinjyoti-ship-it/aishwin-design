"use client";

import { useState } from "react";

interface ProviderSpec { id: string; label: string; defaultModel: string; models: string[] }

interface Props {
  providers: ProviderSpec[];
  initial: {
    defaultProvider: string;
    defaultModel: string;
    keysSet: Record<string, boolean>;
  };
}

const IMAGE_PROVIDER = { id: "openai", label: "OpenAI (image generation)", hint: "gpt-image-1 via OpenAI API" };

const MODEL_LABELS: Record<string, string> = {
  "kimi-k2-0711-preview": "Kimi K2 Preview",
  "kimi-k2-turbo-preview": "Kimi K2 Turbo",
  "moonshot-v1-128k": "Moonshot v1 128K",
  "moonshot-v1-32k": "Moonshot v1 32K",
  "claude-opus-4-7": "Claude Opus 4.7",
  "claude-sonnet-4-6": "Claude Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "moonshotai/kimi-k2": "Kimi K2",
  "anthropic/claude-sonnet-4.6": "Claude Sonnet 4.6",
  "anthropic/claude-opus-4.7": "Claude Opus 4.7",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "deepseek/deepseek-chat": "DeepSeek Chat",
};

function modelLabel(id: string) { return MODEL_LABELS[id] ?? id; }

export function SettingsForm({ providers, initial }: Props) {
  const [defaultProvider, setDefaultProvider] = useState(initial.defaultProvider);
  // If the stored model isn't in the current provider's list, fall back to the provider's default.
  const [defaultModel, setDefaultModel] = useState(() => {
    const spec = providers.find((p) => p.id === initial.defaultProvider);
    return spec?.models.includes(initial.defaultModel) ? initial.defaultModel : (spec?.defaultModel ?? initial.defaultModel);
  });
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [keysSet, setKeysSet] = useState<Record<string, boolean>>(initial.keysSet || {});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const activeModels = providers.find((p) => p.id === defaultProvider)?.models ?? [];

  function setKey(pid: string, val: string) { setKeys({ ...keys, [pid]: val }); }
  function removeKey(pid: string) { setKeys({ ...keys, [pid]: "__clear__" }); setKeysSet({ ...keysSet, [pid]: false }); }

  async function save() {
    setSaving(true);
    const payload: Record<string, unknown> = { defaultProvider, defaultModel };
    const keysPatch: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(keys)) {
      if (v === "__clear__") keysPatch[k] = null;
      else if (v.length) keysPatch[k] = v;
    }
    if (Object.keys(keysPatch).length) payload.keys = keysPatch;
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json() as any;
    if (res.ok) { setKeys({}); setKeysSet(j.settings.keysSet); setSavedAt(Date.now()); }
    setSaving(false);
  }

  const allKeys = [...providers.map((p) => ({ id: p.id, label: p.label, hint: p.defaultModel })), IMAGE_PROVIDER];

  return (
    <div className="mt-10 grid grid-cols-12 gap-10">
      <section className="col-span-12 md:col-span-7">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-4">API keys</div>
        <ul className="border-t rule">
          {allKeys.map((p) => (
            <li key={p.id} className="border-b rule py-5 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4">
                <div className="display text-[17px] text-ink flex items-center gap-2">
                  {p.label}
                  {p.id === "openai" && <span className="pill text-[10px]">coming soon</span>}
                </div>
                <div className="text-[12px] text-muted mt-0.5">{p.hint}</div>
                {p.id === "openai" && (
                  <div className="text-[11px] text-muted mt-1 leading-tight">For image generation only</div>
                )}
              </div>
              <div className="col-span-6">
                <input
                  type="password"
                  className="field"
                  placeholder={keysSet[p.id] ? "•••••••••• set — type to replace" : "Paste API key"}
                  value={keys[p.id] === "__clear__" ? "" : (keys[p.id] ?? "")}
                  onChange={(e) => setKey(p.id, e.target.value)}
                />
              </div>
              <div className="col-span-2 text-right">
                {keysSet[p.id] && (
                  <button onClick={() => removeKey(p.id)} className="text-[12px] text-muted hover:text-ink">
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="col-span-12 md:col-span-5 md:pl-8 md:border-l rule">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-4">Defaults</div>
        <div className="space-y-5">
          <div>
            <label className="label">Default provider</label>
            <select className="field" value={defaultProvider} onChange={(e) => {
              setDefaultProvider(e.target.value);
              const next = providers.find((x) => x.id === e.target.value)?.defaultModel;
              if (next) setDefaultModel(next);
            }}>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Default model</label>
            <select className="field" value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)}>
              {activeModels.map((m) => <option key={m} value={m}>{modelLabel(m)}</option>)}
            </select>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button onClick={save} className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            {savedAt && <span className="text-[12px] text-muted">saved</span>}
          </div>
          <div className="pt-4 border-t rule">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-3">Storage</div>
            <div className="text-[13px] text-muted leading-relaxed space-y-1">
              <div>Artifacts → R2 (HTML, with D1 fallback)</div>
              <div>LLM responses → KV cache (7 days)</div>
              <div>Images → R2 + KV cache</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
