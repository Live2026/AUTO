"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CalendarClock, Check, MessageCircle, UserX, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppointmentDialog } from "@/components/admin/appointment-dialog";
import { Forbidden, PageHeader, allowed, useStaff } from "@/components/admin/shell";
import { Loading, Tabs } from "@/components/admin/ui";
import { Button, EmptyState, buttonClass, cn } from "@/components/ui";
import { listAppointments, setAppointmentStatus, staffById } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { APPOINTMENT_KIND_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import type { Appointment } from "@/lib/types";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/** Rendez-vous, visites, essais, inspections (§18, A11). */
export default function AppointmentsPage() {
  const user = useStaff();
  const now = useNow();
  const list = useLiveQuery(() => listAppointments(), []);
  const [tab, setTab] = useState<"todo" | "upcoming" | "past">("todo");
  const [planning, setPlanning] = useState<Appointment | null>(null);
  if (!allowed(user, ["appointments.write", "crm.read_all"])) return <Forbidden />;
  if (!list || !now) return <Loading />;
  const mine = list.filter((a) => can(user.roleId, "crm.read_all") || a.request?.assignedTo === user.id || a.staffId === user.id);
  const groups = {
    todo: mine.filter((a) => a.status === "requested"),
    upcoming: mine.filter((a) => a.status === "confirmed" && a.startsAt && Date.parse(a.startsAt) >= now - 3_600_000),
    past: mine.filter((a) => ["done", "cancelled", "no_show"].includes(a.status) || (a.status === "confirmed" && a.startsAt && Date.parse(a.startsAt) < now - 3_600_000)),
  };
  const rows = groups[tab];
  const canEdit = can(user.roleId, "appointments.write") || can(user.roleId, "crm.write_all");

  return (
    <>
      <PageHeader title="Rendez-vous & essais" description="Visites, essais et inspections demandés par les clients. Un essai confirmé bloque le véhicule sur le créneau." />
      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} items={[["todo", "À planifier", groups.todo.length], ["upcoming", "À venir", groups.upcoming.length], ["past", "Passés / clos", groups.past.length]]} />
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Aucun rendez-vous" description={tab === "todo" ? "Toutes les demandes de rendez-vous sont planifiées." : undefined} />
      ) : (
        <div className="card divide-y divide-line">
          {rows.map((a) => {
            const phone = a.contact?.whatsappE164 ?? a.contact?.phoneE164 ?? "";
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className={cn("grid size-10 place-items-center rounded-xl", a.kind === "test_drive" ? "bg-amber-100 text-amber-700" : "bg-gold-soft text-gold-deep")}>
                  <CalendarClock className="size-5" />
                </span>
                <div className="min-w-56 flex-1">
                  <p className="font-semibold">
                    {APPOINTMENT_KIND_LABELS[a.kind]} — {a.contact?.fullName}
                    {a.request && <Link href={`/admin/crm/${a.request.id}`} className="ml-2 font-mono text-xs text-muted hover:underline">{a.request.reference}</Link>}
                  </p>
                  <p className="text-muted">
                    {a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model} ${a.vehicle.year} · ` : ""}
                    {a.startsAt ? <strong className="text-ink">{formatDateTime(a.startsAt)}</strong> : `Souhait : ${a.preferredSlot ?? "indifférent"}`}
                    {a.staffId ? ` · ${staffById(a.staffId)?.fullName}` : ""}
                  </p>
                  {a.status !== "requested" && a.status !== "confirmed" && <p className="text-xs text-muted">{a.status === "done" ? "Effectué" : a.status === "no_show" ? "Client absent" : "Annulé"}</p>}
                </div>
                <a className={buttonClass("whatsapp", "sm")} target="_blank" rel="noopener noreferrer" href={buildWhatsAppLink(phone, `Bonjour ${a.contact?.fullName ?? ""}, BRYAN MULTISERVICES au sujet de votre rendez-vous${a.startsAt ? ` du ${formatDateTime(a.startsAt)}` : ""}.`)}>
                  <MessageCircle className="size-4" />
                </a>
                {canEdit && a.status === "requested" && <Button size="sm" onClick={() => setPlanning(a)}>Planifier</Button>}
                {canEdit && a.status === "confirmed" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setPlanning(a)}>Déplacer</Button>
                    <Button size="sm" variant="outline" onClick={() => setAppointmentStatus(a.id, "done", user.id)}><Check className="size-4" /> Effectué</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAppointmentStatus(a.id, "no_show", user.id)} title="Client absent"><UserX className="size-4" /></Button>
                  </>
                )}
                {canEdit && ["requested", "confirmed"].includes(a.status) && (
                  <Button size="sm" variant="ghost" className="text-muted" onClick={() => confirm("Annuler ce rendez-vous ?") && setAppointmentStatus(a.id, "cancelled", user.id)} title="Annuler"><X className="size-4" /></Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {planning && <AppointmentDialog key={planning.id} appointment={planning} onClose={() => setPlanning(null)} />}
    </>
  );
}
