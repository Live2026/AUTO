import type { Availability } from "@/lib/rules/rental";
import { cn } from "../ui";

const MAP: Record<Availability, [string, string]> = {
  available: ["Disponible", "bg-emerald-100 text-emerald-800"],
  on_request: ["Sur demande", "bg-amber-100 text-amber-800"],
  unavailable: ["Indisponible", "bg-zinc-200 text-zinc-600"],
};

/** Affichage public du statut de location (R3) — on n'affiche jamais « demande en cours ». */
export function AvailabilityBadge({ value, className }: { value: Availability; className?: string }) {
  const [label, tone] = MAP[value];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", tone, className)}><span className="size-1.5 rounded-full bg-current" />{label}</span>;
}
