const xaf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 25000000 → « 25 000 000 FCFA » */
export function formatXAF(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `${xaf.format(Math.round(amount)).replace(/ | /g, " ")} FCFA`;
}

export function formatNumber(n: number): string {
  return xaf.format(n).replace(/ | /g, " ");
}

export function formatKm(km: number): string {
  return `${formatNumber(km)} km`;
}

const TZ = "Africa/Brazzaville";

export function formatDate(iso: string | undefined | null, opts: Intl.DateTimeFormatOptions = {}): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
    ...opts,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(iso));
}

export function formatDateLong(iso: string | undefined | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(iso));
}

/** « il y a 5 min », « il y a 3 h », « il y a 2 j » */
export function formatRelative(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
}

export function percentOff(previous: number, current: number): number {
  if (!previous || previous <= current) return 0;
  return Math.round(((previous - current) / previous) * 100);
}
