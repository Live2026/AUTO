import type { RequestType } from "../types";

/** R1 — préfixe de référence par type de demande. */
export function requestPrefix(type: RequestType): "SALE" | "RENT" | "EVENT" | "REQ" {
  switch (type) {
    case "sale":
      return "SALE";
    case "rental":
      return "RENT";
    case "event":
      return "EVENT";
    default:
      return "REQ";
  }
}

/** R1 — PREFIXE-AAAA-NNNNN */
export function formatReference(prefix: string, year: number, n: number): string {
  return `${prefix}-${year}-${String(n).padStart(5, "0")}`;
}

export function businessYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "Africa/Brazzaville" }).format(date),
  );
}
