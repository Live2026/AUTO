"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BookingDialog } from "@/components/admin/ops/booking-dialog";
import { Timeline } from "@/components/admin/ops/timeline";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, Panel } from "@/components/admin/ui";
import { Button } from "@/components/ui";
import { BusinessError, listBookings, mockDb, updateBookingStatus } from "@/lib/db/mock-backend";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { BOOKING_KIND_LABELS, BOOKING_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { isBlocking } from "@/lib/rules/rental";

export default function RentalAdminPage() {
  const user = useStaff();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const data = useLiveQuery(async () => ({ bookings: await listBookings(), vehicles: await mockDb.vehicles.toArray(), requests: await mockDb.requests.toArray() }), []);
  if (!can(user.roleId, "rentals.write")) return <Forbidden />;
  if (!data || !now) return <Loading />;
  const fleet = data.vehicles.filter((v) => v.isForRent);
  const upcoming = data.bookings.filter((b) => ["hold", "confirmed", "in_progress"].includes(b.status) && new Date(b.end).getTime() > now);

  return (
    <>
      <PageHeader
        title="Flotte & réservations"
        description="Options (24 h), confirmations, départs et retours — aucune double réservation possible (R3)."
        actions={<Button onClick={() => setOpen(true)}><CalendarPlus className="size-4" /> Nouvelle occupation</Button>}
      />
      <Timeline days={14} filter="rent" />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title={`Réservations en cours et à venir (${upcoming.length})`}>
          <ul className="divide-y divide-line">
            {upcoming.map((b) => {
              const v = data.vehicles.find((x) => x.id === b.vehicleId);
              const req = data.requests.find((r) => r.id === b.requestId);
              const act = async (s: typeof b.status) => {
                setError(undefined);
                try {
                  await updateBookingStatus(b.id, s, user.id);
                } catch (e) {
                  setError(e instanceof BusinessError ? e.message : String(e));
                }
              };
              return (
                <li key={b.id} className="space-y-1.5 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{v?.brand} {v?.model}</span>
                    <span className="rounded-full bg-paper px-2 py-0.5 text-xs">{BOOKING_KIND_LABELS[b.kind]}</span>
                    <span className={b.status === "hold" ? "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800" : "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"}>{BOOKING_STATUS_LABELS[b.status]}</span>
                    {req && <Link href={`/admin/crm/${req.id}`} className="ml-auto font-mono text-xs font-bold hover:underline">{req.reference}</Link>}
                  </div>
                  <p className="text-muted">{formatDateTime(b.start)} → {formatDateTime(b.end)}{b.status === "hold" && b.holdExpiresAt ? ` · option jusqu'au ${formatDateTime(b.holdExpiresAt)}` : ""}</p>
                  <div className="flex gap-1.5">
                    {b.status === "hold" && <Button size="sm" onClick={() => act("confirmed")}>Confirmer</Button>}
                    {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => act("in_progress")}>Départ</Button>}
                    {b.status === "in_progress" && <Button size="sm" variant="outline" onClick={() => act("completed")}>Retour</Button>}
                    {b.status !== "in_progress" && <Button size="sm" variant="ghost" onClick={() => act("cancelled")}>Annuler</Button>}
                  </div>
                </li>
              );
            })}
          </ul>
          {error && <p className="px-4 pb-4 text-sm font-medium text-rose-600">{error}</p>}
        </Panel>
        <Panel title={`Flotte location (${fleet.length})`}>
          <ul className="divide-y divide-line">
            {fleet.map((v) => {
              const busy = data.bookings.find((b) => b.vehicleId === v.id && isBlocking(b, now) && new Date(b.start).getTime() <= now && new Date(b.blockedEnd).getTime() > now);
              return (
                <li key={v.id} className="flex items-center gap-3 p-4 text-sm">
                  <span className={busy ? "size-2.5 rounded-full bg-amber-500" : "size-2.5 rounded-full bg-emerald-500"} />
                  <Link href={`/admin/vehicules/${v.id}`} className="flex-1 font-semibold hover:underline">{v.brand} {v.model} <span className="font-normal text-muted">{v.reference}</span></Link>
                  <span className="text-muted">{busy ? BOOKING_KIND_LABELS[busy.kind] : "Disponible"}</span>
                  <span className="w-28 text-right font-semibold">{formatXAF(v.rental?.dailyRate)}/j</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
      {open && <BookingDialog open onClose={() => setOpen(false)} />}
    </>
  );
}
