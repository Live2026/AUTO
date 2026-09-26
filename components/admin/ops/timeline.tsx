"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { listBookings, listDriverAssignments, listDrivers, mockDb } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { BOOKING_KIND_COLORS, BOOKING_KIND_LABELS, BOOKING_STATUS_LABELS } from "@/lib/labels";
import { Button, cn } from "../../ui";
import { Loading, Tabs } from "../ui";

const DAY = 86_400_000;

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Calendrier central (§43) : occupations véhicules et affectations chauffeurs sur une frise. */
export function Timeline({ days = 14, filter }: { days?: number; filter?: "rent" | "events" }) {
  const now = useNow();
  const [offset, setOffset] = useState(-2);
  const [mode, setMode] = useState<"vehicles" | "drivers">("vehicles");
  const data = useLiveQuery(async () => {
    const [bookings, vehicles, drivers, assignments, appointments, requests] = await Promise.all([
      listBookings(),
      mockDb.vehicles.toArray(),
      listDrivers(),
      listDriverAssignments(),
      mockDb.appointments.toArray(),
      mockDb.requests.toArray(),
    ]);
    return { bookings, vehicles, drivers, assignments, appointments, requests };
  }, []);
  if (!data || !now) return <Loading />;

  const from = startOfDay(now) + offset * DAY;
  const to = from + days * DAY;
  const pct = (t: number) => ((Math.min(Math.max(t, from), to) - from) / (to - from)) * 100;
  const dayCols = Array.from({ length: days }, (_, i) => from + i * DAY);
  const todayLeft = pct(now);

  const vehicles = data.vehicles
    .filter((v) => v.status !== "sold" && v.status !== "withdrawn")
    .filter((v) => (filter === "rent" ? v.isForRent : filter === "events" ? v.isForEvents : v.isForRent || v.isForEvents || data.bookings.some((b) => b.vehicleId === v.id)));

  const rows =
    mode === "vehicles"
      ? vehicles.map((v) => ({
          id: v.id,
          label: `${v.brand} ${v.model}`,
          sub: v.reference,
          href: `/admin/vehicules/${v.id}`,
          bars: data.bookings
            .filter((b) => b.vehicleId === v.id && b.status !== "cancelled")
            .map((b) => ({
              id: b.id,
              start: new Date(b.start).getTime(),
              end: new Date(b.end).getTime(),
              buffer: new Date(b.blockedEnd).getTime(),
              color: BOOKING_KIND_COLORS[b.kind],
              hold: b.status === "hold",
              done: b.status === "completed",
              title: `${BOOKING_KIND_LABELS[b.kind]} · ${BOOKING_STATUS_LABELS[b.status]} · ${formatDateTime(b.start)} → ${formatDateTime(b.end)}`,
              ref: data.requests.find((r) => r.id === b.requestId)?.reference,
              href: b.requestId ? `/admin/crm/${b.requestId}` : undefined,
            })),
        }))
      : data.drivers.map((d) => ({
          id: d.id,
          label: d.fullName,
          sub: d.status === "available" ? "Disponible" : d.status === "on_leave" ? "En congé" : "Inactif",
          href: "/admin/chauffeurs",
          bars: data.assignments
            .filter((a) => a.driverId === d.id && a.status !== "cancelled")
            .map((a) => {
              const b = data.bookings.find((x) => x.id === a.bookingId);
              return {
                id: a.id,
                start: new Date(a.start).getTime(),
                end: new Date(a.end).getTime(),
                buffer: new Date(a.end).getTime(),
                color: b ? BOOKING_KIND_COLORS[b.kind] : "bg-rose-500",
                hold: a.status === "hold",
                done: a.status === "completed",
                title: `Mission · ${formatDateTime(a.start)} → ${formatDateTime(a.end)}`,
                ref: data.requests.find((r) => r.id === b?.requestId)?.reference,
                href: b?.requestId ? `/admin/crm/${b.requestId}` : undefined,
              };
            }),
        }));

  const appointments = data.appointments.filter((a) => a.startsAt && a.status === "confirmed" && new Date(a.startsAt).getTime() >= from && new Date(a.startsAt).getTime() < to);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={mode} onChange={setMode} items={[["vehicles", "Véhicules"], ["drivers", "Chauffeurs"]]} />
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o - 7)} aria-label="Semaine précédente"><ChevronLeft className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setOffset(-2)}>Aujourd&apos;hui</Button>
          <Button variant="outline" size="sm" onClick={() => setOffset((o) => o + 7)} aria-label="Semaine suivante"><ChevronRight className="size-4" /></Button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[180px_1fr] border-b border-line bg-paper text-xs">
            <div className="px-3 py-2 font-semibold text-muted">{mode === "vehicles" ? "Véhicule" : "Chauffeur"}</div>
            <div className="relative grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
              {dayCols.map((d) => {
                const date = new Date(d);
                const weekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <div key={d} className={cn("border-l border-line px-1 py-2 text-center", weekend && "bg-black/[0.03]", startOfDay(now) === d && "font-bold text-ink")}>
                    <span className="block text-[10px] text-muted uppercase">{date.toLocaleDateString("fr-FR", { weekday: "short" })}</span>
                    {date.getDate()}
                  </div>
                );
              })}
            </div>
          </div>
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[180px_1fr] border-b border-line last:border-0">
              <Link href={row.href} className="truncate px-3 py-2.5 text-sm hover:bg-paper">
                <span className="block truncate font-semibold">{row.label}</span>
                <span className="block text-xs text-muted">{row.sub}</span>
              </Link>
              <div className="relative h-14">
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
                  {dayCols.map((d) => (
                    <div key={d} className={cn("border-l border-line", (new Date(d).getDay() === 0 || new Date(d).getDay() === 6) && "bg-black/[0.02]")} />
                  ))}
                </div>
                <div className="absolute inset-y-0 w-0.5 bg-rose-500" style={{ left: `${todayLeft}%` }} />
                {row.bars
                  .filter((b) => b.buffer > from && b.start < to)
                  .map((b) => {
                    const left = pct(b.start);
                    const width = Math.max(pct(b.end) - left, 0.8);
                    const bufferWidth = pct(b.buffer) - pct(b.end);
                    const Comp = b.href ? Link : "div";
                    return (
                      <Comp
                        key={b.id}
                        href={b.href ?? ""}
                        title={b.title}
                        className="absolute top-2.5 flex h-9"
                        style={{ left: `${left}%`, width: `${width + bufferWidth}%` }}
                      >
                        <span
                          className={cn("flex h-full items-center overflow-hidden rounded-lg px-2 text-[11px] font-semibold whitespace-nowrap text-white shadow-sm", b.color, b.hold && "bg-[repeating-linear-gradient(45deg,rgba(255,255,255,.25)_0_6px,transparent_6px_12px)] opacity-80 ring-2 ring-amber-400", b.done && "opacity-50")}
                          style={{ width: `${(width / (width + bufferWidth)) * 100}%` }}
                        >
                          {b.ref ?? b.title.split(" · ")[0]}
                        </span>
                        {bufferWidth > 0 && <span className="h-full flex-1 rounded-r-lg bg-zinc-300/60" title="Tampon après location" />}
                      </Comp>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {Object.entries(BOOKING_KIND_LABELS).map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={cn("size-3 rounded", BOOKING_KIND_COLORS[k as keyof typeof BOOKING_KIND_COLORS])} />{l}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded ring-2 ring-amber-400" />Option (non confirmée)</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-zinc-300" />Tampon</span>
      </div>
      {appointments.length > 0 && (
        <div className="card p-4">
          <p className="mb-2 text-sm font-bold">Rendez-vous & essais confirmés</p>
          <ul className="space-y-1 text-sm">
            {appointments.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/crm/${a.requestId}`} className="hover:underline">{formatDateTime(a.startsAt)} — {data.requests.find((r) => r.id === a.requestId)?.reference}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
