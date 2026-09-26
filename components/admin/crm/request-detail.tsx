"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, CalendarPlus, Copy, ExternalLink, FilePlus2, MessageCircle, Phone, Send, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BusinessError,
  addNote,
  assignDriver,
  createQuote,
  getRequestDetail,
  listDrivers,
  mockDb,
  staffById,
  updateBookingStatus,
  updateRequest,
} from "@/lib/db/mock-backend";
import { formatDate, formatDateTime, formatNumber, formatXAF } from "@/lib/format";
import {
  APPOINTMENT_KIND_LABELS,
  BOOKING_KIND_LABELS,
  BOOKING_STATUS_LABELS,
  CHANNEL_LABELS,
  NOTE_KIND_LABELS,
  PIPELINE,
  REQUEST_STATUS_LABELS,
} from "@/lib/labels";
import { settings, staffUsers, services as catalogServices, eventTypes } from "@/lib/mock/catalog";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import { estimateRental } from "@/lib/rules/rental";
import { computeQuoteTotals } from "@/lib/rules/quote";
import type { NoteKind, RequestStatus } from "@/lib/types";
import { buildTelLink, buildWhatsAppLink } from "@/lib/whatsapp";
import { Button, EmptyState, Field, buttonClass, cn } from "../../ui";
import { Modal } from "../../ui/modal";
import { BookingDialog } from "../ops/booking-dialog";
import { PageHeader, useStaff } from "../shell";
import { Loading, Panel, QuoteStatusBadge, StatusBadge, TypeBadge } from "../ui";

export function RequestDetailView({ id }: { id: string }) {
  const user = useStaff();
  const router = useRouter();
  const data = useLiveQuery(() => getRequestDetail(id).then((d) => d ?? null), [id]);
  const drivers = useLiveQuery(() => listDrivers(), []);
  const [noteKind, setNoteKind] = useState<NoteKind>("note");
  const [note, setNote] = useState("");
  const [lostOpen, setLostOpen] = useState(false);
  const [lostReason, setLostReason] = useState(settings.lostReasons[0]);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [driverFor, setDriverFor] = useState<{ bookingId?: string; eventId?: string; start: string; end: string }>();
  const [driverId, setDriverId] = useState("");
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState<string>();

  if (data === undefined) return <Loading />;
  if (data === null) return <EmptyState title="Demande introuvable" />;

  const r = data;
  const visible = can(user.roleId, "crm.read_all") || r.assignedTo === user.id;
  if (!visible) return <EmptyState title="Accès non autorisé" description="Cette demande n'est pas affectée à votre compte." />;
  const canEdit = can(user.roleId, "crm.write_all") || (can(user.roleId, "crm.write_own") && r.assignedTo === user.id);
  const contact = r.contact;
  const wa = contact?.whatsappE164 ?? contact?.phoneE164 ?? "";
  const eventType = eventTypes.find((e) => e.id === r.event?.eventTypeId);
  const estimate = r.vehicle?.rental && r.startAt && r.endAt ? estimateRental(r.vehicle.rental, r.startAt, r.endAt, !!r.withDriver) : null;

  const setStatus = async (status: RequestStatus) => {
    setError(undefined);
    if (status === "lost") return setLostOpen(true);
    try {
      await updateRequest(r.id, { status }, user.id);
    } catch (e) {
      setError(e instanceof BusinessError ? e.message : String(e));
    }
  };

  const timeline = [
    ...r.history.map((h) => ({
      at: h.changedAt,
      kind: "history" as const,
      text:
        h.fromStatus === undefined
          ? `Demande reçue (${CHANNEL_LABELS[r.channel]})${h.toAssignee ? ` — affectée à ${staffById(h.toAssignee)?.fullName}` : ""}`
          : h.fromStatus !== h.toStatus
            ? `Statut : ${REQUEST_STATUS_LABELS[h.fromStatus]} → ${REQUEST_STATUS_LABELS[h.toStatus!]}`
            : `Affectation : ${staffById(h.fromAssignee)?.fullName ?? "personne"} → ${staffById(h.toAssignee)?.fullName ?? "personne"}`,
      by: staffById(h.changedBy)?.fullName,
    })),
    ...r.notes.map((n) => ({ at: n.createdAt, kind: n.kind, text: n.body, by: staffById(n.authorId)?.fullName })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <>
      <Link href="/admin/crm" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Demandes</Link>
      <PageHeader
        title={r.reference}
        description={`Reçue le ${formatDateTime(r.createdAt)} · ${CHANNEL_LABELS[r.channel]}${r.sourcePage ? ` · ${r.sourcePage}` : ""}`}
        actions={
          <>
            <a href={buildTelLink(contact?.phoneE164 ?? "")} className={buttonClass("outline", "sm")} onClick={() => canEdit && addNote(r.id, "call", "Appel sortant", user.id)}>
              <Phone className="size-4" /> Appeler
            </a>
            <a
              href={buildWhatsAppLink(wa, `Bonjour ${contact?.fullName ?? ""}, BRYAN MULTISERVICES au sujet de votre demande ${r.reference}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("whatsapp", "sm")}
              onClick={() => canEdit && addNote(r.id, "whatsapp", "Message WhatsApp envoyé", user.id)}
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
          </>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <TypeBadge type={r.type} />
        <StatusBadge status={r.status} />
        {r.lostReason && <span className="text-sm text-rose-600">Motif : {r.lostReason}</span>}
      </div>

      {/* Pipeline (R6) */}
      <div className="card mb-6 p-4">
        <div className="scrollbar-none flex gap-1 overflow-x-auto">
          {PIPELINE.map((s, i) => {
            const idx = PIPELINE.indexOf(r.status);
            return (
              <button
                key={s}
                type="button"
                disabled={!canEdit}
                onClick={() => setStatus(s)}
                className={cn(
                  "flex-1 shrink-0 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition",
                  r.status === s ? "bg-ink text-white" : idx >= 0 && i < idx ? "bg-emerald-50 text-emerald-700" : "bg-paper text-muted hover:text-ink",
                  !canEdit && "cursor-not-allowed",
                )}
              >
                {REQUEST_STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setStatus("lost")}>Marquer perdue</Button>
            <Button size="sm" variant="ghost" onClick={() => setStatus("cancelled")}>Annuler</Button>
            {can(user.roleId, "crm.write_all") && (
              <label className="ml-auto flex items-center gap-2 text-sm">
                <UserRoundPlus className="size-4 text-muted" />
                <select
                  className="input h-9 py-1"
                  value={r.assignedTo ?? ""}
                  onChange={(e) => updateRequest(r.id, { assignedTo: e.target.value || undefined }, user.id)}
                  aria-label="Responsable"
                >
                  <option value="">Non affectée</option>
                  {staffUsers.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="Objet de la demande">
            <div className="space-y-4 p-4 text-sm">
              {r.subject && <p className="font-semibold">{r.subject}</p>}
              {r.message && <p className="rounded-xl bg-paper p-3 whitespace-pre-line">{r.message}</p>}
              {r.vehicle && (
                <p>
                  Véhicule : <Link href={`/admin/vehicules/${r.vehicle.id}`} className="font-semibold underline">{r.vehicle.brand} {r.vehicle.model} {r.vehicle.year}</Link> ({r.vehicle.reference})
                  {r.type === "sale" && r.vehicle.salePrice ? ` — ${formatXAF(r.vehicle.salePrice)}` : ""}
                </p>
              )}
              {r.type === "rental" && (
                <dl className="grid grid-cols-2 gap-3">
                  <Info label="Départ" value={formatDateTime(r.startAt)} />
                  <Info label="Retour" value={formatDateTime(r.endAt)} />
                  <Info label="Lieu" value={r.pickupCity ?? "—"} />
                  <Info label="Chauffeur" value={r.withDriver ? "Avec" : "Sans"} />
                  {estimate && <Info label="Estimation" value={`${formatXAF(estimate.total)} (${estimate.days} j)`} />}
                </dl>
              )}
              {r.event && (
                <dl className="grid grid-cols-2 gap-3">
                  <Info label="Type" value={eventType?.name ?? "—"} />
                  <Info label="Date" value={r.event.eventDate ? formatDate(r.event.eventDate) : "À définir"} />
                  <Info label="Lieu" value={[r.event.city, r.event.venue].filter(Boolean).join(" — ") || "—"} />
                  <Info label="Invités" value={r.event.guestsCount ? formatNumber(r.event.guestsCount) : "—"} />
                  <Info label="Budget" value={r.event.budgetMin || r.event.budgetMax ? `${formatXAF(r.event.budgetMin)} – ${r.event.budgetMax ? formatXAF(r.event.budgetMax) : "…"}` : "Non précisé"} />
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Prestations souhaitées</dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {r.event.serviceIds.length === 0 && "—"}
                      {r.event.serviceIds.map((sid) => (
                        <span key={sid} className="rounded-full bg-event-soft px-2.5 py-1 text-xs font-semibold text-event">{catalogServices.find((s) => s.id === sid)?.name}</span>
                      ))}
                    </dd>
                  </div>
                </dl>
              )}
              {r.type === "trade_in" && (
                <dl className="grid grid-cols-2 gap-3">
                  {Object.entries(r.details).map(([k, v]) => (
                    <Info key={k} label={k} value={String(v)} />
                  ))}
                </dl>
              )}
              {r.appointments.map((a) => (
                <AppointmentRow key={a.id} appointmentId={a.id} canEdit={canEdit} />
              ))}
            </div>
          </Panel>

          {(r.type === "rental" || r.type === "event" || r.type === "test_drive") && (
            <Panel
              title="Véhicules & chauffeurs"
              action={
                (can(user.roleId, "rentals.write") || can(user.roleId, "events.write")) && (
                  <Button size="sm" variant="outline" onClick={() => setBookingOpen(true)}><CalendarPlus className="size-4" /> Option / réservation</Button>
                )
              }
            >
              <ul className="divide-y divide-line">
                {r.bookings.length === 0 && <li className="p-4 text-sm text-muted">Aucune occupation liée. Posez une option pour bloquer le véhicule (R3).</li>}
                {r.bookings.map((b) => (
                  <BookingRow key={b.id} bookingId={b.id} onAssignDriver={() => setDriverFor({ bookingId: b.id, eventId: b.eventId, start: b.start, end: b.end })} />
                ))}
              </ul>
            </Panel>
          )}

          <Panel
            title="Devis"
            action={
              can(user.roleId, "quotes.write") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const qid = await createQuote(r.id, user.id);
                    router.push(`/admin/devis/${qid}`);
                  }}
                >
                  <FilePlus2 className="size-4" /> Créer un devis
                </Button>
              )
            }
          >
            <ul className="divide-y divide-line">
              {r.quotes.length === 0 && <li className="p-4 text-sm text-muted">Aucun devis.</li>}
              {r.quotes.map((q) => {
                const url = typeof location !== "undefined" ? `${location.origin}/devis/${q.publicToken}` : "";
                return (
                  <li key={q.id} className="flex flex-wrap items-center gap-3 p-4">
                    <Link href={`/admin/devis/${q.id}`} className="font-mono font-bold hover:underline">{q.reference}</Link>
                    <QuoteStatusBadge status={q.status} />
                    <span className="text-sm text-muted">v{q.currentVersion} · {formatXAF(computeQuoteTotals(q).totalTtc)}</span>
                    {q.currentVersion > 0 && (
                      <span className="ml-auto flex gap-1.5">
                        <button
                          type="button"
                          className={buttonClass("ghost", "sm")}
                          onClick={() => {
                            void navigator.clipboard?.writeText(url);
                            setCopied(q.id);
                          }}
                        >
                          <Copy className="size-4" /> {copied === q.id ? "Copié" : "Lien"}
                        </button>
                        <a
                          className={buttonClass("whatsapp", "sm")}
                          target="_blank"
                          rel="noopener noreferrer"
                          href={buildWhatsAppLink(wa, `Bonjour ${contact?.fullName ?? ""}, voici votre devis ${q.reference} : ${url}`)}
                        >
                          <Send className="size-4" /> Envoyer
                        </a>
                      </span>
                    )}
                    {q.changeRequestMessage && <p className="w-full rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Modification demandée : {q.changeRequestMessage}</p>}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Contact">
            <div className="space-y-2 p-4 text-sm">
              <p className="text-base font-bold">{contact?.fullName}</p>
              <p>📞 {formatPhone(contact?.phoneE164)}</p>
              {contact?.whatsappE164 && contact.whatsappE164 !== contact.phoneE164 && <p>💬 {formatPhone(contact.whatsappE164)}</p>}
              {contact?.email && <p>✉️ {contact.email}</p>}
              <p className="text-xs text-muted">Consentement : {contact?.consentAt ? formatDateTime(contact.consentAt) : "—"}</p>
              {r.otherRequests.length > 0 && (
                <div className="border-t border-line pt-3">
                  <p className="mb-1.5 text-xs font-semibold text-muted">Autres demandes de ce contact</p>
                  {r.otherRequests.map((o) => (
                    <Link key={o.id} href={`/admin/crm/${o.id}`} className="flex items-center justify-between py-1 hover:underline">
                      <span className="font-mono">{o.reference}</span>
                      <StatusBadge status={o.status} />
                    </Link>
                  ))}
                </div>
              )}
              <p className="pt-2 text-xs text-muted">Responsable : <strong className="text-ink">{staffById(r.assignedTo)?.fullName ?? "non affectée"}</strong></p>
              {r.trackingToken && (
                <a href={`/suivi/${r.trackingToken}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold underline">
                  Page de suivi client <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Historique & notes">
            {canEdit && (
              <form
                className="space-y-2 border-b border-line p-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!note.trim()) return;
                  await addNote(r.id, noteKind, note, user.id);
                  setNote("");
                }}
              >
                <div className="flex gap-2">
                  <select className="input h-10 w-36 py-1" value={noteKind} onChange={(e) => setNoteKind(e.target.value as NoteKind)} aria-label="Type de note">
                    {(["note", "call", "whatsapp", "email", "meeting"] as NoteKind[]).map((k) => (
                      <option key={k} value={k}>{NOTE_KIND_LABELS[k]}</option>
                    ))}
                  </select>
                  <input className="input h-10" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note…" />
                </div>
                <Button type="submit" size="sm" disabled={!note.trim()}>Ajouter</Button>
              </form>
            )}
            <ol className="max-h-[520px] space-y-4 overflow-y-auto p-4">
              {timeline.map((t, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", t.kind === "history" ? "bg-ink" : t.kind === "system" ? "bg-gold" : "bg-sky-500")} />
                  <div>
                    <p className="text-xs text-muted">
                      {formatDateTime(t.at)}
                      {t.kind !== "history" && ` · ${NOTE_KIND_LABELS[t.kind]}`}
                      {t.by && ` · ${t.by}`}
                    </p>
                    <p className="whitespace-pre-line">{t.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>

      <Modal open={lostOpen} onClose={() => setLostOpen(false)} title="Marquer comme perdue">
        <Field label="Motif (obligatoire)">
          <select className="input" value={lostReason} onChange={(e) => setLostReason(e.target.value)}>
            {settings.lostReasons.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </Field>
        <Button
          className="mt-4 w-full"
          variant="danger"
          onClick={async () => {
            await updateRequest(r.id, { status: "lost", lostReason }, user.id);
            setLostOpen(false);
          }}
        >
          Confirmer
        </Button>
      </Modal>

      {bookingOpen && (
        <BookingDialog
          open
          onClose={() => setBookingOpen(false)}
          defaults={{
            vehicleId: r.vehicleId,
            kind: r.type === "event" ? "event" : r.type === "test_drive" ? "test_drive" : "rental",
            start: r.startAt ?? (r.event?.eventDate ? new Date(`${r.event.eventDate}T09:00`).toISOString() : undefined),
            end: r.endAt ?? (r.event?.eventDate ? new Date(`${r.event.eventDate}T23:00`).toISOString() : undefined),
            requestId: r.id,
            eventId: r.event?.id,
          }}
        />
      )}

      <Modal open={!!driverFor} onClose={() => setDriverFor(undefined)} title="Affecter un chauffeur">
        <Field label="Chauffeur" hint="Un chauffeur ne peut pas être affecté à deux missions simultanées (R4).">
          <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Choisir…</option>
            {drivers?.map((d) => (
              <option key={d.id} value={d.id} disabled={d.status !== "available"}>{d.fullName}{d.status !== "available" ? " (indisponible)" : ""}</option>
            ))}
          </select>
        </Field>
        {error && <p className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
        <Button
          className="mt-4 w-full"
          disabled={!driverId}
          onClick={async () => {
            setError(undefined);
            try {
              await assignDriver({ driverId, ...driverFor! }, user.id);
              setDriverFor(undefined);
            } catch (e) {
              setError(e instanceof BusinessError ? e.message : String(e));
            }
          }}
        >
          Affecter
        </Button>
      </Modal>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted capitalize">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function BookingRow({ bookingId, onAssignDriver }: { bookingId: string; onAssignDriver: () => void }) {
  const user = useStaff();
  const data = useLiveQuery(async () => {
    const b = await mockDb.bookings.get(bookingId);
    if (!b) return null;
    const [v, assignments, drivers] = await Promise.all([
      mockDb.vehicles.get(b.vehicleId),
      mockDb.driverAssignments.where("bookingId").equals(bookingId).toArray(),
      mockDb.drivers.toArray(),
    ]);
    return { b, v, drivers: assignments.map((a) => drivers.find((d) => d.id === a.driverId)?.fullName).filter(Boolean) };
  }, [bookingId]);
  const [error, setError] = useState<string>();
  if (!data) return null;
  const { b, v } = data;
  const setStatus = async (s: typeof b.status) => {
    setError(undefined);
    try {
      await updateBookingStatus(b.id, s, user.id);
    } catch (e) {
      setError(e instanceof BusinessError ? e.message : String(e));
    }
  };
  return (
    <li className="space-y-2 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{v?.brand} {v?.model}</span>
        <span className="rounded-full bg-paper px-2 py-0.5 text-xs">{BOOKING_KIND_LABELS[b.kind]}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", b.status === "hold" ? "bg-amber-100 text-amber-800" : b.status === "cancelled" ? "bg-zinc-100 text-zinc-500" : "bg-emerald-100 text-emerald-800")}>
          {BOOKING_STATUS_LABELS[b.status]}
        </span>
      </div>
      <p className="text-muted">
        {formatDateTime(b.start)} → {formatDateTime(b.end)}
        {b.status === "hold" && b.holdExpiresAt && ` · expire ${formatDateTime(b.holdExpiresAt)}`}
      </p>
      {data.drivers.length > 0 && <p>Chauffeur : <strong>{data.drivers.join(", ")}</strong></p>}
      <div className="flex flex-wrap gap-1.5">
        {b.status === "hold" && <Button size="sm" onClick={() => setStatus("confirmed")}>Confirmer</Button>}
        {b.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => setStatus("in_progress")}>Démarrer</Button>}
        {b.status === "in_progress" && <Button size="sm" variant="outline" onClick={() => setStatus("completed")}>Terminer</Button>}
        {["hold", "confirmed"].includes(b.status) && <Button size="sm" variant="ghost" onClick={() => setStatus("cancelled")}>Annuler</Button>}
        {can(user.roleId, "drivers.write") && ["hold", "confirmed", "in_progress"].includes(b.status) && (
          <Button size="sm" variant="ghost" onClick={onAssignDriver}>+ Chauffeur</Button>
        )}
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </li>
  );
}

function AppointmentRow({ appointmentId, canEdit }: { appointmentId: string; canEdit: boolean }) {
  const a = useLiveQuery(() => mockDb.appointments.get(appointmentId), [appointmentId]);
  const [when, setWhen] = useState("");
  if (!a) return null;
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="font-semibold">{APPOINTMENT_KIND_LABELS[a.kind]} — {a.status === "requested" ? "à planifier" : a.status === "confirmed" ? "confirmé" : a.status}</p>
      {a.preferredSlot && <p className="text-muted">Préférence client : {a.preferredSlot}</p>}
      {a.startsAt && <p>Prévu le <strong>{formatDateTime(a.startsAt)}</strong></p>}
      {canEdit && a.status === "requested" && (
        <div className="mt-2 flex gap-2">
          <input type="datetime-local" className="input h-9 py-1" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Date du rendez-vous" />
          <Button
            size="sm"
            disabled={!when}
            onClick={() => {
              const start = new Date(when);
              void mockDb.appointments.put({ ...a, status: "confirmed", startsAt: start.toISOString(), endsAt: new Date(start.getTime() + 3_600_000).toISOString() });
            }}
          >
            Confirmer
          </Button>
        </div>
      )}
    </div>
  );
}
