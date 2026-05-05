import { Chrome } from "@/components/Chrome";
import { SettingsForm } from "@/components/SettingsForm";
import { readSettings, publicSettings } from "@/lib/settings";
import { PROVIDER_ORDER, PROVIDERS } from "@/lib/providers";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const s = await readSettings();
  const providers = PROVIDER_ORDER.map((p) => ({
    id: p,
    label: PROVIDERS[p].label,
    defaultModel: PROVIDERS[p].defaultModel,
    models: PROVIDERS[p].models,
  }));
  return (
    <Chrome active="settings">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Settings</div>
      <h1 className="display text-[44px] leading-[1.05] mt-2">Bring your own keys</h1>
      <p className="text-[15px] text-muted mt-3 max-w-[56ch]">
        Keys are stored once in D1 and used to call providers from the edge on your behalf. Leave a field blank to remove the key.
      </p>
      <SettingsForm providers={providers} initial={publicSettings(s)} />
    </Chrome>
  );
}
