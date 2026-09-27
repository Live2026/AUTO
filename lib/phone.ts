/**
 * Normalise un numéro en E.164 (+242XXXXXXXXX). Retourne null si invalide.
 * Règle identique à la fonction SQL public.normalize_phone (R2).
 */
export function normalizePhone(input: string | null | undefined): string | null {
  let d = (input ?? "").replace(/[^0-9+]/g, "");
  if (d === "") return null;
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.length === 9) d = `242${d}`;
  if (!/^[0-9]{8,15}$/.test(d)) return null;
  return `+${d}`;
}

/** +242061234567 → « +242 06 123 45 67 » */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "—";
  const m = e164.match(/^\+242(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (m) return `+242 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return e164;
}
