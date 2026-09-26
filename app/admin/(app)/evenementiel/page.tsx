"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarDays, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, Panel, StatusBadge, Tabs } from "@/components/admin/ui";
import { DynamicIcon } from "@/components/public/dynamic-icon";
import { listEvents, listServices, staffById, toggleService } from "@/lib/db/mock-backend";
import { formatDate, formatNumber, formatXAF } from "@/lib/format";
import { eventTypes, packages, realisations, recommendations, serviceCategories } from "@/lib/mock/catalog";
import { can } from "@/lib/permissions";
import { cn } from "@/components/ui";

export default function EventsAdminPage() {
  const user = useStaff();
  const [tab, setTab] = useState<"dossiers" | "services" | "packages" | "realisations">("dossiers");
  const events = useLiveQuery(() => listEvents(), []);
  const services = useLiveQuery(() => listServices(), []);
  if (!can(user.roleId, "events.write")) return <Forbidden />;
  if (!events || !services) return <Loading />;

  return (
    <>
      <PageHeader title="Événementiel" description="Dossiers événements, catalogue de prestations, packages et réalisations." />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            ["dossiers", "Dossiers", events.length],
            ["services", "Prestations", services.length],
            ["packages", "Packages", packages.length],
            ["realisations", "Réalisations", realisations.length],
          ]}
        />
      </div>

      {tab === "dossiers" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const type = eventTypes.find((t) => t.id === e.eventTypeId);
            return (
              <Link key={e.id} href={`/admin/crm/${e.requestId}`} className="card p-4 transition hover:border-event/40">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-event-soft text-event"><DynamicIcon name={type?.icon ?? "Sparkles"} className="size-5" /></span>
                  {e.request && <StatusBadge status={e.request.status} />}
                </div>
                <p className="mt-3 font-bold">{e.title ?? type?.name}</p>
                <p className="font-mono text-xs text-muted">{e.request?.reference} · {e.contact?.fullName}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />{e.eventDate ? formatDate(e.eventDate) : "Date à définir"}</span>
                  {e.city && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{e.city}</span>}
                  {e.guestsCount && <span className="inline-flex items-center gap-1"><Users className="size-4" />{formatNumber(e.guestsCount)}</span>}
                </div>
                <p className="mt-2 text-xs text-muted">{e.serviceIds.length} prestation(s) · Responsable : {staffById(e.request?.assignedTo)?.fullName ?? "—"}</p>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "services" && (
        <div className="space-y-6">
          <p className="text-sm text-muted">Les prestations désactivées disparaissent du site et de l&apos;assistant « Créer mon événement » (§30).</p>
          {serviceCategories.map((c) => (
            <Panel key={c.id} title={c.name}>
              <ul className="divide-y divide-line">
                {services.filter((s) => s.categoryId === c.id).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 p-4">
                    <DynamicIcon name={s.icon} className="size-5 text-event" />
                    <div className="flex-1">
                      <p className={cn("font-semibold", !s.isActive && "text-muted line-through")}>{s.name}</p>
                      <p className="text-xs text-muted">{s.basePrice ? `${formatXAF(s.basePrice)} / ${s.unit}` : "Sur devis"}{s.priceVisible ? "" : " · prix masqué"}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={s.isActive}
                      aria-label={`${s.isActive ? "Désactiver" : "Activer"} ${s.name}`}
                      onClick={() => toggleService(s.id, user.id)}
                      className={cn("relative h-6 w-11 rounded-full transition", s.isActive ? "bg-emerald-500" : "bg-zinc-300")}
                    >
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition", s.isActive ? "left-5.5" : "left-0.5")} />
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {tab === "packages" && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            {packages.map((p) => (
              <div key={p.id} className="card p-4">
                <p className="font-bold">{p.name}</p>
                <p className="text-sm text-muted">{p.description}</p>
                <ul className="mt-3 space-y-0.5 text-sm">
                  {p.items.map((i) => (
                    <li key={i.serviceId}>{i.quantity} × {services.find((s) => s.id === i.serviceId)?.name}</li>
                  ))}
                </ul>
                <p className="mt-3 font-extrabold">{p.price ? formatXAF(p.price) : "Sur devis"}</p>
              </div>
            ))}
          </div>
          <Panel title="Recommandations par type d'événement (cross-selling, R9)">
            <ul className="divide-y divide-line">
              {eventTypes.map((t) => {
                const recs = recommendations.filter((r) => r.eventTypeId === t.id);
                return (
                  <li key={t.id} className="flex flex-wrap items-center gap-2 p-4 text-sm">
                    <span className="w-32 font-semibold">{t.name}</span>
                    {recs.length === 0 && <span className="text-muted">—</span>}
                    {recs.map((r, i) => (
                      <span key={i} className="rounded-full bg-event-soft px-2.5 py-1 text-xs font-semibold text-event">
                        {r.serviceId ? services.find((s) => s.id === r.serviceId)?.name : `Pack ${packages.find((p) => p.id === r.packageId)?.name}`}
                      </span>
                    ))}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      )}

      {tab === "realisations" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {realisations.map((r) => (
            <Link key={r.id} href={`/realisations/${r.slug}`} target="_blank" className="card overflow-hidden">
              <div className="h-24" style={{ background: `linear-gradient(135deg, ${r.palette[0]}, ${r.palette[1]})` }} />
              <div className="p-4">
                <p className="font-bold">{r.title}</p>
                <p className="text-sm text-muted">{eventTypes.find((t) => t.id === r.eventTypeId)?.name} · {r.city} · {formatDate(r.eventDate)}</p>
                <p className="mt-2 text-xs font-semibold text-emerald-700">Publiée</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
