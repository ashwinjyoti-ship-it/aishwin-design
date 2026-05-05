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

export function SettingsForm({ providers, initial }: Props) {
  const [defaultProvider, setDefaultProvider] = useState(initial.defaultProvider);
  const [defaultModel, setDefaultModel] = useState(initial.defaultModel);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [keysSet, setKeysSet] = useState<Record<string, boolean>>(initial.keysSet || {});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const activeModels = providers.find((p) => p.id === defaultProvider)?.models ?? [];

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
    const j = await res.json();
    if (res.ok) {
      setKeys({});
      setKeysSet(j.settings.keysSet);
      setSavedAt(Date.now());
    }
    setSaving(false);
  }

  return (
    <div className="mt-10 grid grid-cols-12 gap-10">
      <section className="col-span-12 md:col-span-7">
        <div className="text-[11px] uppercase tracking-[0.14em] text-muted mb-4">Provider keys</div>
        <ul className="border-t rule">
          {providers.map((p) => (
            <li key={p.id} className="border-b rule py-5 grid grid-cols-12 gap-4 items-center">
              <div className="col-span-4">
                <div className="display text-[18px] text-ink">{p.label}</div>
                <div className="text-[12px] text-muted mt-0.5">{p.defaultModel}</div>
              </div>
              <div className="col-span-6">
                <input
                  type="password"
                  className="field"
                  placeholder={keysSet[p.id] ? "•••••••••• key set — type to replace" : "Paste API key"}
                  value={keys[p.id] === "__clear__" ? "" : keys[p.id] ?? ""}
                  onChange={(e) => setKeys({ ...keys, [p.id]: e.target.value })}
                />
              </div>
              <div className="col-span-2 text-right">
                {keysSet[p.id] && (
                  <button
                    onClick={() => { setKeys({ ...keys, [p.id]: "__clear__" }); setKeysSet({ ...keysSet, [p.id]: false }); }}
                    className="text-[12px] text-muted hover:text-ink"
                  >Remove</button>
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
              {activeModels.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <button onClick={save} className="btn" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            {savedAt && <span className="text-[12px] text-muted">saved</span>}
          </div>
        </div>
      </section>
    </div>
  );
}
