"use client";

import { useState } from "react";

export default function LoginPage() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      const params = new URLSearchParams(location.search);
      location.href = params.get("next") || "/";
    } else {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setErr(j.error || "Wrong password");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh grid place-items-center px-6">
      <div className="w-full max-w-[360px]">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted mb-3">Aishwin Design</div>
        <h1 className="display text-[34px] leading-[1.05] mb-10">A small studio for designing with agents.</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Password</label>
            <input
              className="field"
              type="password"
              autoFocus
              value={pw}
              onChange={(e) => setPw(e.target.value)}
            />
          </div>
          {err && <div className="text-[13px] text-red-700">{err}</div>}
          <button type="submit" className="btn w-full" disabled={busy}>
            {busy ? "Opening…" : "Enter"}
          </button>
        </form>
        <p className="text-[12px] text-muted mt-8 leading-relaxed">
          Set <span className="font-mono">APP_PASSWORD</span> as a Cloudflare secret. There are no accounts &mdash; one shared key.
        </p>
      </div>
    </div>
  );
}
