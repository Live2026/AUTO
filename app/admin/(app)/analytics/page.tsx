"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, Panel, StatCard, Tabs } from "@/components/admin/ui";
import { listAnalytics, listBookings, listQuotes, listRequests, mockDb } from "@/lib/db/mock-backend";
import { formatNumber } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { AnalyticsEvent } from "@/lib/types";
import { cn } from "@/components/ui";

type Range = "7" | "30";

/** Analytics & entonnoirs commerciaux (§50–51). */
export default function AnalyticsPage() {
  const user = useStaff();
  const [range, setRange] = useState<Range>("30");
  const data = useLiveQuery(async () => {
    const [events, requests, bookings, quotes, vehicles] = await Promise.all([listAnalytics(Number(range)), listRequests(), listBookings(), listQuotes(), mockDb.vehicles.toArray()]);
    return { events, requests, bookings, quotes, vehicles };
  }, [range]);
  if (!can(user.roleId, "analytics.read")) return <Forbidden />;
  if (!data) return <Loading />;

  const { events } = data;
  const count = (name: AnalyticsEvent["eventName"], pred?: (e: AnalyticsEvent) => boolean) => events.filter((e) => e.eventName === name && (!pred || pred(e))).length;
  const pole = (p: string) => (e: AnalyticsEvent) => (e.props as { pole?: string; type?: string } | undefined)?.pole === p || (e.props as { type?: string } | undefined)?.type === p;
  const visitors = new Set(events.map((e) => e.sessionId)).size;
  const since = Date.parse(events.reduce((min, e) => (e.occurredAt < min ? e.occurredAt : min), new Date().toISOString()));
  const reqs = data.requests.filter((r) => Date.parse(r.createdAt) >= since);

  const funnels = [
    {
      title: "Vente automobile",
      tone: "bg-gold",
      steps: [
        ["Visiteurs", visitors],
        ["Fiches véhicules consultées", count("vehicle_view")],
        ["Contacts (WhatsApp + appel)", count("whatsapp_click", pole("sale")) + count("call_click", pole("sale"))],
        ["Demandes", reqs.filter((r) => ["sale", "test_drive", "appointment"].includes(r.type)).length + count("form_submit", pole("sale"))],
        ["Rendez-vous / essais", reqs.filter((r) => ["test_drive", "appointment"].includes(r.type)).length],
        ["Ventes", data.vehicles.filter((v) => v.status === "sold").length],
      ] as [string, number][],
    },
    {
      title: "Location",
      tone: "bg-rent",
      steps: [
        ["Visiteurs", visitors],
        ["Fiches location consultées", count("rental_view")],
        ["Recherches par dates", count("search", pole("rental"))],
        ["Demandes", reqs.filter((r) => r.type === "rental").length + count("form_submit", pole("rental"))],
        ["Réservations confirmées", data.bookings.filter((b) => b.kind === "rental" && ["confirmed", "in_progress", "completed"].includes(b.status)).length],
      ] as [string, number][],
    },
    {
      title: "Événementiel",
      tone: "bg-event",
      steps: [
        ["Visiteurs", visitors],
        ["Pages événementiel", count("event_type_view")],
        ["Assistant commencé", count("form_start", pole("event"))],
        ["Demandes de devis", reqs.filter((r) => r.type === "event").length + count("form_submit", pole("event"))],
        ["Devis envoyés", data.quotes.filter((q) => q.currentVersion > 0).length],
        ["Devis acceptés", data.quotes.filter((q) => q.status === "accepted").length],
      ] as [string, number][],
    },
  ];

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Mesures issues du site (table analytics_events) et du CRM."
        actions={<Tabs value={range} onChange={setRange} items={[["7", "7 jours"], ["30", "30 jours"]]} />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label="Visiteurs" value={formatNumber(visitors)} />
        <StatCard label="Pages vues" value={formatNumber(count("page_view"))} />
        <StatCard label="Véhicules consultés" value={formatNumber(count("vehicle_view"))} />
        <StatCard label="Clics WhatsApp" value={formatNumber(count("whatsapp_click"))} tone="text-whatsapp" />
        <StatCard label="Appels" value={formatNumber(count("call_click"))} />
        <StatCard label="Formulaires envoyés" value={formatNumber(count("form_submit"))} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        {funnels.map((f) => (
          <Panel key={f.title} title={`Entonnoir — ${f.title}`}>
            <ol className="space-y-3 p-4">
              {f.steps.map(([label, value], i) => {
                const top = f.steps[0][1] || 1;
                const prev = i > 0 ? f.steps[i - 1][1] : value;
                return (
                  <li key={label}>
                    <div className="flex justify-between text-sm">
                      <span>{label}</span>
                      <span className="font-bold">
                        {formatNumber(value)}
                        {i > 0 && prev > 0 && <span className="ml-2 text-xs font-normal text-muted">{Math.round((value / prev) * 100)} %</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-paper">
                      <div className={cn("h-full rounded-full", f.tone)} style={{ width: `${Math.max(2, (value / top) * 100)}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Démo : trafic simulé sur 30 jours + vos propres actions sur le site (enregistrées dans ce navigateur).</p>
    </>
  );
}
