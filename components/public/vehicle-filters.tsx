"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FUEL_LABELS, GEARBOX_LABELS } from "@/lib/labels";
import type { VehicleCategory } from "@/lib/types";
import { Button, cn } from "../ui";

const TABS = [
  ["tous", "Tous"],
  ["nouveautes", "Nouveautés"],
  ["promotions", "Promotions"],
  ["baisses", "Baisses de prix"],
] as const;

const PRICE_STEPS = [5_000_000, 10_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000];

/** Filtres dans l'URL : partageables et indexables (US2.1). */
export function VehicleFilters({ categories, brands, total }: { categories: VehicleCategory[]; brands: string[]; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const set = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "tab" && value === "tous") next.delete("tab");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const tab = params.get("tab") ?? "tous";
  const activeCount = ["category", "brand", "fuel", "gearbox", "maxPrice", "minYear", "q"].filter((k) => params.get(k)).length;

  const selects = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <select className="input" value={params.get("category") ?? ""} onChange={(e) => set("category", e.target.value)} aria-label="Catégorie">
        <option value="">Toutes catégories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>{c.name}</option>
        ))}
      </select>
      <select className="input" value={params.get("brand") ?? ""} onChange={(e) => set("brand", e.target.value)} aria-label="Marque">
        <option value="">Toutes marques</option>
        {brands.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>
      <select className="input" value={params.get("maxPrice") ?? ""} onChange={(e) => set("maxPrice", e.target.value)} aria-label="Budget maximum">
        <option value="">Budget max.</option>
        {PRICE_STEPS.map((p) => (
          <option key={p} value={p}>≤ {new Intl.NumberFormat("fr-FR").format(p)} FCFA</option>
        ))}
      </select>
      <select className="input" value={params.get("fuel") ?? ""} onChange={(e) => set("fuel", e.target.value)} aria-label="Carburant">
        <option value="">Carburant</option>
        {Object.entries(FUEL_LABELS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      <select className="input" value={params.get("gearbox") ?? ""} onChange={(e) => set("gearbox", e.target.value)} aria-label="Boîte de vitesses">
        <option value="">Boîte</option>
        {Object.entries(GEARBOX_LABELS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      <select className="input" value={params.get("sort") ?? ""} onChange={(e) => set("sort", e.target.value)} aria-label="Trier">
        <option value="">Plus récents</option>
        <option value="prix-asc">Prix croissant</option>
        <option value="prix-desc">Prix décroissant</option>
        <option value="km">Kilométrage</option>
      </select>
    </div>
  );

  return (
    <div className={cn("space-y-4 transition", pending && "opacity-70")}>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => set("tab", key)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
              tab === key ? "bg-ink text-white" : "border border-line bg-white hover:border-ink/40",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="input"
          type="search"
          placeholder="Marque, modèle, référence…"
          defaultValue={params.get("q") ?? ""}
          onKeyDown={(e) => e.key === "Enter" && set("q", (e.target as HTMLInputElement).value)}
          onBlur={(e) => e.target.value !== (params.get("q") ?? "") && set("q", e.target.value)}
          aria-label="Rechercher"
        />
        <Button variant="outline" className="lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <SlidersHorizontal className="size-4" />
          Filtres{activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-gold text-[11px] text-ink">{activeCount}</span>}
        </Button>
      </div>
      <div className={cn(open ? "block" : "hidden", "lg:block")}>{selects}</div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted">
          <strong className="text-ink">{total}</strong> véhicule{total > 1 ? "s" : ""}
        </p>
        {activeCount > 0 && (
          <button type="button" onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))} className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
            <X className="size-4" /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
