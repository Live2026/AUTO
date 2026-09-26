"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CalendarDays, CalendarHeart, Car, Inbox, KeyRound, Plus, UserPlus } from "lucide-react";
import { Avatar, useStaff } from "@/components/admin/shell";
import { HorizontalBars, StackedColumns, type DayBucket, type SeriesKey } from "@/components/admin/charts";
import { Loading, Panel, StatCard, StatusBadge, TypeBadge } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui";
import { getSettings, listBookings, listEvents, listQuotes, listRequests, mockDb } from "@/lib/db/mock-backend";
import { formatDateLong, formatDateTime, formatRelative, formatXAF } from "@/lib/format";
import { CHANNEL_LABELS, PIPELINE, REQUEST_STATUS_LABELS, ROLE_LABELS } from "@/lib/labels";
import { useNow } from "@/lib/hooks";
import { BOOKING_KIND_COLORS, BOOKING_KIND_LABELS, BOOKING_STATUS_LABELS } from "@/lib/labels";
import { computeQuoteTotals } from "@/lib/rules/quote";
import { isBlocking } from "@/lib/rules/rental";
import { can } from "@/lib/permissions";

const DAY = 86_400_000;

export default function DashboardPage() {
  const user = useStaff();
  const now = useNow();
  const router = useRouter();
  const data = useLiveQuery(async () => {
    const [requests, bookings, quotes, events, vehicles, appointments, settings] = await Promise.all([
      listRequests(),
      listBookings(),
      listQuotes(),
      listEvents(),
      mockDb.vehicles.toArray(),
      mockDb.appointments.toArray(),
      getSettings(),
    ]);
    return { requests, bookings, quotes, events, vehicles, appointments, settings };
  }, []);

  if (!data || !now) return <Loading />;
  const { requests, bookings, quotes, events, vehicles, appointments, settings } = data;
  const mine = can(user.roleId, "crm.read_all") ? requests : requests.filter((r) => r.assignedTo === user.id);
  const since30 = now - 30 * DAY;
  const open = (r: (typeof requests)[number]) => !["completed", "cancelled", "lost"].includes(r.status);

  // Automobile
  const stock = vehicles.filter((v) => v.isForSale && v.status === "available").length;
  const saleReqs = requests.filter((r) => ["sale", "test_drive", "appointment", "trade_in"].includes(r.type) && open(r)).length;
  const upcomingAppointments = appointments.filter((a) => a.status !== "cancelled" && a.status !== "done").length;
  const soldRecent = vehicles.filter((v) => v.status === "sold" && v.soldAt && new Date(v.soldAt).getTime() > since30);
  const saleRevenue = soldRecent.reduce((s, v) => s + (v.salePrice ?? 0), 0);

  // Location
  const rentFleet = vehicles.filter((v) => v.isForRent && v.status === "available");
  const busyNow = new Set(
    bookings.filter((b) => isBlocking(b, now) && new Date(b.start).getTime() <= now && new Date(b.blockedEnd).getTime() > now).map((b) => b.vehicleId),
  );
  const rentalsInProgress = bookings.filter((b) => b.kind === "rental" && b.status === "in_progress").length;
  const reservations = bookings.filter((b) => b.kind === "rental" && ["hold", "confirmed"].includes(b.status) && new Date(b.start).getTime() > now).length;
  const rentalRevenue = bookings
    .filter((b) => b.kind === "rental" && ["confirmed", "in_progress", "completed"].includes(b.status))
    .reduce((s, b) => {
      const v = vehicles.find((x) => x.id === b.vehicleId);
      const days = Math.max(1, Math.ceil((new Date(b.end).getTime() - new Date(b.start).getTime()) / DAY));
      return s + days * (v?.rental?.dailyRate ?? 0);
    }, 0);

  // Événementiel
  const eventNew = requests.filter((r) => r.type === "event" && ["new", "to_contact"].includes(r.status)).length;
  const quotesPending = quotes.filter((q) => q.status === "sent" || q.status === "change_requested").length;
  const eventsConfirmed = events.filter((e) => e.request && ["confirmed", "completed"].includes(e.request.status)).length;
  const eventsUpcoming = events.filter((e) => e.eventDate && new Date(e.eventDate).getTime() > now && e.request && open(e.request)).length;
  const eventRevenue = quotes.filter((q) => q.status === "accepted").reduce((s, q) => s + computeQuoteTotals(q).totalTtc, 0);

  // CRM
  const newProspects = requests.filter((r) => new Date(r.createdAt).getTime() > now - 7 * DAY).length;
  const toHandle = mine.filter((r) => r.status === "new" || r.status === "to_contact");
  const waiting = requests.filter((r) => r.status === "waiting_client" || r.status === "offer_sent").length;
  const closed = requests.filter((r) => ["confirmed", "completed", "lost", "cancelled"].includes(r.status));
  const won = closed.filter((r) => r.status === "confirmed" || r.status === "completed").length;
  const conversion = closed.length ? Math.round((won / closed.length) * 100) : 0;
  const slaMs = settings.slaNewRequestMinutes * 60_000;

  // Graphique : demandes reçues sur 14 jours, par pôle
  const poleOf = (t: string): SeriesKey => (["sale", "test_drive", "appointment", "trade_in"].includes(t) ? "sale" : t === "rental" ? "rental" : t === "event" ? "event" : "other");
  const days: DayBucket[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now - (13 - i) * DAY);
    const key = d.toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" });
    return { date: key, label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Brazzaville" }), values: { sale: 0, rental: 0, event: 0, other: 0 } };
  });
  for (const r of mine) {
    const key = new Date(r.createdAt).toLocaleDateString("fr-CA", { timeZone: "Africa/Brazzaville" });
    const b = days.find((d) => d.date === key);
    if (b) b.values[poleOf(r.type)]++;
  }
  const pipelineRows = PIPELINE.filter((st) => st !== "completed").map((st) => ({ key: st, label: REQUEST_STATUS_LABELS[st], value: mine.filter((r) => r.status === st).length }));

  const agenda = [
    ...bookings
      .filter((b) => b.status !== "cancelled" && b.status !== "completed" && new Date(b.end).getTime() > now && new Date(b.start).getTime() < now + 7 * DAY)
      .map((b) => {
        const v = vehicles.find((x) => x.id === b.vehicleId);
        return { id: b.id, at: b.start, title: `${BOOKING_KIND_LABELS[b.kind]} — ${v?.brand} ${v?.model}`, sub: BOOKING_STATUS_LABELS[b.status], color: BOOKING_KIND_COLORS[b.kind] };
      }),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <>
      {/* En-tête : qui est connecté (nom, rôle) */}
      <section className="mb-6 overflow-hidden rounded-3xl bg-ink text-white">
        <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6 [background:radial-gradient(60%_120%_at_100%_0%,rgba(201,162,39,0.25),transparent_70%)]">
          <Avatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/60">Bonjour,</p>
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{user.fullName}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className={user.roleId === "admin" ? "rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-ink" : "rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold"}>
                {ROLE_LABELS[user.roleId]}
              </span>
              <span className="text-white/60 first-letter:uppercase">{formatDateLong(new Date(now).toISOString())}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/crm?status=a-traiter" className={buttonClass("gold", "sm")}>
              <Inbox className="size-4" /> {toHandle.length} à traiter
            </Link>
            {can(user.roleId, "vehicles.write") && (
              <Link href="/admin/vehicules/nouveau" className={buttonClass("outline", "sm", "border-white/20 bg-white/5 text-white hover:border-white/50")}>
                <Plus className="size-4" /> Véhicule
              </Link>
            )}
            <Link href="/admin/calendrier" className={buttonClass("outline", "sm", "border-white/20 bg-white/5 text-white hover:border-white/50")}>
              <CalendarDays className="size-4" /> Calendrier
            </Link>
            {can(user.roleId, "users.manage") && (
              <Link href="/admin/utilisateurs" className={buttonClass("outline", "sm", "border-white/20 bg-white/5 text-white hover:border-white/50")}>
                <UserPlus className="size-4" /> Utilisateurs
              </Link>
            )}
          </div>
        </div>
      </section>

      {toHandle.length > 0 && (
        <Link href="/admin/crm?status=a-traiter" className="mb-6 flex items-center gap-3 rounded-2xl bg-ink p-4 text-white">
          <Inbox className="size-6 text-gold" />
          <p className="flex-1 text-sm"><strong>{toHandle.length} demande{toHandle.length > 1 ? "s" : ""}</strong> à traiter{can(user.roleId, "crm.read_all") ? "" : " (qui vous sont affectées)"}</p>
          <ArrowRight className="size-5" />
        </Link>
      )}

      <div className="space-y-6">
        <PoleRow title="Automobile" icon={<Car className="size-4 text-gold" />}>
          <StatCard label="Véhicules en stock" value={stock} accent="bg-[#b08a14]" />
          <StatCard label="Demandes d'achat ouvertes" value={saleReqs} />
          <StatCard label="Rendez-vous / essais" value={upcomingAppointments} />
          <StatCard label="Ventes (30 j)" value={soldRecent.length} />
          <StatCard label="CA ventes (30 j)" value={formatXAF(saleRevenue)} tone="text-[#7a5f0c]" />
        </PoleRow>
        <PoleRow title="Location" icon={<KeyRound className="size-4 text-rent" />}>
          <StatCard accent="bg-[#0b7fa3]" label="Disponibles maintenant" value={`${rentFleet.filter((v) => !busyNow.has(v.id)).length} / ${rentFleet.length}`} />
          <StatCard label="Locations en cours" value={rentalsInProgress} />
          <StatCard label="Réservations à venir" value={reservations} />
          <StatCard label="CA location (réservé)" value={formatXAF(rentalRevenue)} tone="text-rent" />
        </PoleRow>
        <PoleRow title="Événementiel" icon={<CalendarHeart className="size-4 text-event" />}>
          <StatCard label="Nouvelles demandes" value={eventNew} accent="bg-[#be185d]" />
          <StatCard label="Devis en attente" value={quotesPending} />
          <StatCard label="Événements confirmés" value={eventsConfirmed} />
          <StatCard label="Événements à venir" value={eventsUpcoming} />
          <StatCard label="CA devis acceptés" value={formatXAF(eventRevenue)} tone="text-event" />
        </PoleRow>
        <PoleRow title="CRM" icon={<Inbox className="size-4" />}>
          <StatCard label="Nouveaux prospects (7 j)" value={newProspects} accent="bg-ink" />
          <StatCard label="À traiter" value={toHandle.length} tone={toHandle.length ? "text-rose-600" : "text-ink"} />
          <StatCard label="En attente client" value={waiting} />
          <StatCard label="Taux de conversion" value={`${conversion} %`} hint={`${won} gagnées / ${closed.length} clôturées`} />
        </PoleRow>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title="Demandes reçues — 14 derniers jours">
          <StackedColumns data={days} title={`${days.reduce((s, d) => s + Object.values(d.values).reduce((a, b) => a + b, 0), 0)} demandes sur la période, par pôle`} />
        </Panel>
        <Panel title="Pipeline commercial (demandes ouvertes)">
          <HorizontalBars rows={pipelineRows} onSelect={() => router.push("/admin/crm")} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="À traiter maintenant" action={<Link href="/admin/crm" className="text-sm font-semibold text-muted hover:text-ink">Tout voir</Link>}>
          <ul className="divide-y divide-line">
            {toHandle.length === 0 && <li className="p-6 text-center text-sm text-muted">Rien en attente 🎉</li>}
            {toHandle.slice(0, 8).map((r) => {
              const late = r.status === "new" && now - new Date(r.createdAt).getTime() > slaMs;
              return (
                <li key={r.id}>
                  <Link href={`/admin/crm/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono font-bold">{r.reference}</span>
                        <TypeBadge type={r.type} />
                        {late && <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertTriangle className="size-3.5" />SLA dépassé</span>}
                      </p>
                      <p className="truncate text-sm text-muted">{r.contact?.fullName}{r.vehicle ? ` · ${r.vehicle.brand} ${r.vehicle.model}` : ""}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={r.status} />
                      <p className="mt-1 text-xs text-muted">{formatRelative(r.createdAt, now)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Planning des 7 prochains jours" action={<Link href="/admin/calendrier" className="text-sm font-semibold text-muted hover:text-ink">Calendrier</Link>}>
          <ul className="divide-y divide-line">
            {agenda.length === 0 && <li className="p-6 text-center text-sm text-muted">Aucune occupation prévue</li>}
            {agenda.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`h-9 w-1.5 rounded-full ${a.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <p className="text-xs text-muted">{formatDateTime(a.at)} · {a.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Boîte de réception — dernières demandes reçues" className="mt-6" action={<Link href="/admin/crm" className="text-sm font-semibold text-muted hover:text-ink">Toutes les demandes</Link>}>
        <ul className="divide-y divide-line">
          {mine.slice(0, 6).map((r) => (
            <li key={r.id}>
              <Link href={`/admin/crm/${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-paper">
                <span className={r.status === "new" ? "size-2.5 rounded-full bg-rose-500" : "size-2.5 rounded-full bg-line"} aria-label={r.status === "new" ? "Non traitée" : undefined} />
                <span className="font-mono text-sm font-bold">{r.reference}</span>
                <TypeBadge type={r.type} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  <strong>{r.contact?.fullName}</strong>
                  <span className="text-muted"> · {r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : r.subject ?? r.message ?? ""}</span>
                </span>
                <span className="text-xs text-muted">{CHANNEL_LABELS[r.channel]} · {formatRelative(r.createdAt, now)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

function PoleRow({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-bold">{icon}{title}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{children}</div>
    </div>
  );
}
