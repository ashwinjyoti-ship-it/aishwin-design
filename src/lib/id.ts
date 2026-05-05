export function id(prefix = ""): string {
  const a = crypto.getRandomValues(new Uint8Array(9));
  const s = Array.from(a, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 14);
  return prefix ? `${prefix}_${s}` : s;
}
