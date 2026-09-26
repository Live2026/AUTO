"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus, QrCode, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, Tabs } from "@/components/admin/ui";
import { VehicleVisual } from "@/components/public/vehicle-visual";
import { Badge, LinkButton } from "@/components/ui";
import { listAdminVehicles } from "@/lib/db/mock-backend";
import { formatKm, formatXAF } from "@/lib/format";
import { VEHICLE_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import type { VehicleStatus } from "@/lib/types";

const TONE: Record<VehicleStatus, string> = {
  draft: "bg-zinc-100 text-zinc-600 ring-zinc-200",
  available: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  reserved: "bg-amber-100 text-amber-800 ring-amber-200",
  sold: "bg-ink text-white ring-ink",
  withdrawn: "bg-zinc-100 text-zinc-500 ring-zinc-200",
};

export default function AdminVehiclesPage() {
  const user = useStaff();
  const vehicles = useLiveQuery(() => listAdminVehicles(), []);
  const [tab, setTab] = useState<"all" | "sale" | "rent" | "events" | "draft">("all");
  const [q, setQ] = useState("");
  if (!can(user.roleId, "vehicles.write")) return <Forbidden />;
  if (!vehicles) return <Loading />;
  const s = q.toLowerCase();
  const list = vehicles.filter((v) => {
    if (tab === "sale" && !v.isForSale) return false;
    if (tab === "rent" && !v.isForRent) return false;
    if (tab === "events" && !v.isForEvents) return false;
    if (tab === "draft" && v.status !== "draft") return false;
    return !s || `${v.brand} ${v.model} ${v.reference}`.toLowerCase().includes(s);
  });
  return (
    <>
      <PageHeader
        title="Véhicules"
        description="Un seul enregistrement par véhicule : stock vente, flotte location et flotte événementielle (§44)."
        actions={<LinkButton href="/admin/vehicules/nouveau"><Plus className="size-4" /> Ajouter un véhicule</LinkButton>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            ["all", "Tous", vehicles.length],
            ["sale", "Stock vente", vehicles.filter((v) => v.isForSale).length],
            ["rent", "Flotte location", vehicles.filter((v) => v.isForRent).length],
            ["events", "Événementiel", vehicles.filter((v) => v.isForEvents).length],
            ["draft", "Brouillons", vehicles.filter((v) => v.status === "draft").length],
          ]}
        />
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((v) => (
          <Link key={v.id} href={`/admin/vehicules/${v.id}`} className="card flex gap-3 overflow-hidden p-3 transition hover:border-ink/30">
            <div className="aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl">
              <VehicleVisual bodyType={v.bodyType} colorHex={v.colorHex} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-bold">{v.brand} {v.model} {v.year}</p>
                <Badge className={TONE[v.status]}>{VEHICLE_STATUS_LABELS[v.status]}</Badge>
              </div>
              <p className="text-xs text-muted">{v.reference} · {formatKm(v.mileageKm)}</p>
              <p className="mt-1 text-sm font-semibold">{v.isForSale ? (v.salePrice ? formatXAF(v.salePrice) : "Prix sur demande") : v.rental ? `${formatXAF(v.rental.dailyRate)} / j` : "—"}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {v.isForSale && <span className="rounded bg-gold-soft px-1.5 py-0.5 text-[10px] font-bold text-[#7a5f0c]">VENTE</span>}
                {v.isForRent && <span className="rounded bg-rent-soft px-1.5 py-0.5 text-[10px] font-bold text-rent">LOCATION</span>}
                {v.isForEvents && <span className="rounded bg-event-soft px-1.5 py-0.5 text-[10px] font-bold text-event">ÉVÉNEMENT</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted"><QrCode className="size-4" /> Le QR code de chaque véhicule est disponible dans sa fiche.</p>
    </>
  );
}
