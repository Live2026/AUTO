"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Bot, ChevronDown, Download, Globe, LogIn, LogOut, Minus, Pencil, Plus, Search, ShieldAlert, UserRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar, Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, StatCard } from "@/components/admin/ui";
import { Button, EmptyState, cn } from "@/components/ui";
import { mockDb, recordAuditExport } from "@/lib/db/mock-backend";
import { formatDateLong } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { ROLE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import type { AuditAction, AuditLog, StaffUser } from "@/lib/types";

/** Libellés des modules (tables) pour des phrases lisibles. */
export const MODULE_LABELS: Record<string, string> = {
  auth: "Connexions",
  requests: "Demandes",
  request_notes: "Notes",
  contacts: "Contacts",
  appointments: "Rendez-vous",
  vehicle_bookings: "Réservations",
  driver_assignments: "Chauffeurs",
  drivers: "Chauffeurs",
  quotes: "Devis",
  vehicles: "Véhicules",
  categories: "Catégories",
  services: "Prestations",
  packages: "Packages",
  eventTypes: "Types d'événements",
  recommendations: "Recommandations",
  realisations: "Réalisations",
  events: "Dossiers événement",
  promotions: "Promotions",
  banners: "Bannières",
  media_assets: "Médiathèque",
  staff_profiles: "Utilisateurs",
  role_permissions: "Rôles & droits",
  business_settings: "Paramètres",
  audit_logs: "Journal",
};

const ACTIONS: Record<AuditAction, { label: string; icon: typeof Plus; tone: string }> = {
  insert: { label: "Création", icon: Plus, tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  update: { label: "Modification", icon: Pencil, tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  delete: { label: "Suppression", icon: Minus, tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  login: { label: "Connexion", icon: LogIn, tone: "bg-violet-50 text-violet-700 ring-violet-200" },
  logout: { label: "Déconnexion", icon: LogOut, tone: "bg-zinc-100 text-zinc-700 ring-zinc-200" },
  login_failed: { label: "Échec de connexion", icon: ShieldAlert, tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  export: { label: "Export", icon: Download, tone: "bg-zinc-100 text-zinc-700 ring-zinc-200" },
};

const PERIODS = [
  ["1", "Aujourd'hui"],
  ["7", "7 derniers jours"],
  ["30", "30 derniers jours"],
  ["", "Tout l'historique"],
] as const;

type Period = (typeof PERIODS)[number][0];

function actorLabel(a: AuditLog, staff: StaffUser[]): string {
  if (a.actorId === "client") return "Client (en ligne)";
  if (a.actorId === "system") return "Système (automatique)";
  if (!a.actorId) return a.action === "login_failed" ? "Inconnu" : "Visiteur du site";
  return staff.find((u) => u.id === a.actorId)?.fullName ?? "Utilisateur supprimé";
}

function ActorBadge({ a, staff }: { a: AuditLog; staff: StaffUser[] }) {
  const user = staff.find((u) => u.id === a.actorId);
  if (user) return <Avatar user={user} />;
  const Icon = a.actorId === "system" ? Bot : a.actorId === "client" ? Globe : UserRound;
  return <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper text-muted ring-1 ring-line"><Icon className="size-4" /></span>;
}

function dayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Brazzaville" }).format(new Date(iso));
}

function time(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Brazzaville" }).format(new Date(iso));
}

function toCsv(rows: AuditLog[], staff: StaffUser[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [["Date", "Heure", "Auteur", "Rôle", "Action", "Module", "Description", "Détail des changements", "Info"].map(esc).join(";")];
  for (const a of rows) {
    const u = staff.find((x) => x.id === a.actorId);
    lines.push(
      [
        dayKey(a.occurredAt),
        time(a.occurredAt),
        actorLabel(a, staff),
        u ? ROLE_LABELS[u.roleId] : "",
        ACTIONS[a.action]?.label ?? a.action,
        MODULE_LABELS[a.tableName] ?? a.tableName,
        a.summary,
        (a.changes ?? []).map((c) => `${c.field} : ${c.before ?? "—"} → ${c.after ?? "—"}`).join(" | "),
        a.detail ?? "",
      ].map((v) => esc(String(v))).join(";"),
    );
  }
  return "﻿" + lines.join("\r\n");
}

/** Journal d'activité (R13) : qui a fait quoi, quand, et ce qui a changé. Lecture seule. */
export function ActivityLog() {
  const me = useStaff();
  const now = useNow();
  const params = useSearchParams();
  const [actor, setActor] = useState(params.get("qui") ?? "");
  const [moduleName, setModuleName] = useState(params.get("module") ?? "");
  const [action, setAction] = useState<"" | AuditAction>("");
  const [period, setPeriod] = useState<Period>("30");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const data = useLiveQuery(async () => ({ audit: await mockDb.audit.orderBy("occurredAt").reverse().toArray(), staff: await mockDb.staff.toArray() }), []);

  if (!can(me.roleId, "audit.read")) return <Forbidden />;
  if (!data || !now) return <Loading />;
  const { audit, staff } = data;

  const since = period ? now - Number(period) * 86_400_000 : 0;
  const today = dayKey(new Date(now).toISOString());
  const list = audit
    .filter((a) => (period === "1" ? dayKey(a.occurredAt) === today : !since || new Date(a.occurredAt).getTime() >= since))
    .filter((a) => !actor || (actor === "_client" ? a.actorId === "client" : actor === "_system" ? a.actorId === "system" : actor === "_anon" ? !a.actorId : a.actorId === actor || (a.tableName === "staff_profiles" && a.recordId === actor)))
    .filter((a) => !moduleName || a.tableName === moduleName)
    .filter((a) => !action || a.action === action)
    .filter((a) => !q || `${a.summary} ${a.detail ?? ""} ${actorLabel(a, staff)} ${(a.changes ?? []).map((c) => `${c.field} ${c.before} ${c.after}`).join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  const week = audit.filter((a) => new Date(a.occurredAt).getTime() >= now - 7 * 86_400_000);
  const todayRows = audit.filter((a) => dayKey(a.occurredAt) === today);
  const modules = Array.from(new Set(audit.map((a) => a.tableName))).sort((a, b) => (MODULE_LABELS[a] ?? a).localeCompare(MODULE_LABELS[b] ?? b));
  const filtered = !!(actor || moduleName || action || q || period !== "30");

  const shown = list.slice(0, limit);
  const groups: [string, AuditLog[]][] = [];
  for (const a of shown) {
    const k = dayKey(a.occurredAt);
    const g = groups.at(-1);
    if (g && g[0] === k) g[1].push(a);
    else groups.push([k, [a]]);
  }

  const exportCsv = async () => {
    const blob = new Blob([toCsv(list, staff)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `journal-activite-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    await recordAuditExport(me.id, list.length);
  };

  return (
    <>
      <PageHeader
        title="Journal d'activité"
        description="Qui a fait quoi, et quand : connexions, créations, modifications, suppressions. Le journal ne peut être ni modifié ni effacé, même par un super administrateur."
        actions={<Button variant="outline" onClick={() => void exportCsv()} disabled={list.length === 0}><Download className="size-4" /> Exporter (CSV)</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Actions aujourd'hui" value={todayRows.filter((a) => !["login", "logout", "login_failed"].includes(a.action)).length} accent="bg-sky-600" />
        <StatCard label="Connexions (7 j)" value={week.filter((a) => a.action === "login").length} hint={`${new Set(week.filter((a) => a.action === "login").map((a) => a.actorId)).size} personne(s)`} accent="bg-violet-600" />
        <StatCard label="Échecs de connexion (7 j)" value={week.filter((a) => a.action === "login_failed").length} tone={week.some((a) => a.action === "login_failed") ? "text-amber-700" : "text-ink"} accent="bg-amber-500" />
        <StatCard label="Modifications d'accès (30 j)" value={audit.filter((a) => ["staff_profiles", "role_permissions"].includes(a.tableName) && new Date(a.occurredAt).getTime() >= now - 30 * 86_400_000).length} hint="utilisateurs, rôles, droits" accent="bg-gold" />
      </div>

      <div className="card mb-5 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <label className="relative">
          <span className="sr-only">Rechercher dans le journal</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input className="input h-10 py-1.5 pl-9" placeholder="Rechercher (référence, nom, valeur…)" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Select label="Personne" value={actor} onChange={setActor}>
          <option value="">Tout le monde</option>
          <optgroup label="Équipe">
            {staff.map((u) => <option key={u.id} value={u.id}>{u.fullName}{u.isActive ? "" : " (désactivé)"}</option>)}
          </optgroup>
          <optgroup label="Autres">
            <option value="_client">Clients (en ligne)</option>
            <option value="_system">Système (automatique)</option>
            <option value="_anon">Visiteurs / inconnus</option>
          </optgroup>
        </Select>
        <Select label="Module" value={moduleName} onChange={setModuleName}>
          <option value="">Tous les modules</option>
          {modules.map((m) => <option key={m} value={m}>{MODULE_LABELS[m] ?? m}</option>)}
        </Select>
        <Select label="Type d'action" value={action} onChange={(v) => setAction(v as AuditAction | "")}>
          <option value="">Toutes les actions</option>
          {(Object.keys(ACTIONS) as AuditAction[]).map((k) => <option key={k} value={k}>{ACTIONS[k].label}</option>)}
        </Select>
        <Select label="Période" value={period} onChange={(v) => setPeriod(v as Period)}>
          {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm">
        <p className="text-muted"><strong className="text-ink">{list.length}</strong> action(s){filtered ? " correspondant aux filtres" : " sur 30 jours"}</p>
        {filtered && (
          <button type="button" className="font-semibold text-muted hover:text-ink" onClick={() => { setActor(""); setModuleName(""); setAction(""); setQ(""); setPeriod("30"); }}>
            Effacer les filtres
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState title="Aucune action" description="Rien ne correspond à ces filtres." />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, rows]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">{day === today ? "Aujourd'hui" : formatDateLong(`${day}T12:00:00Z`)}</h2>
              <ol className="card divide-y divide-line">
                {rows.map((a) => <Row key={a.id} a={a} staff={staff} />)}
              </ol>
            </section>
          ))}
          {list.length > limit && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setLimit((l) => l + 100)}>Afficher plus ({list.length - limit} restante(s))</Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select className="input h-10 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {children}
      </select>
    </label>
  );
}

function Row({ a, staff }: { a: AuditLog; staff: StaffUser[] }) {
  const [open, setOpen] = useState(false);
  const meta = ACTIONS[a.action] ?? ACTIONS.update;
  const Icon = meta.icon;
  const user = staff.find((u) => u.id === a.actorId);
  const hasDetail = !!a.changes?.length;
  return (
    <li className="p-3 sm:px-4">
      <div className="flex items-start gap-3">
        <ActorBadge a={a} staff={staff} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <strong>{actorLabel(a, staff)}</strong>
            {user && <span className="text-muted"> · {ROLE_LABELS[user.roleId]}</span>}
          </p>
          <p className="mt-0.5 text-sm text-ink/90">{a.summary}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset", meta.tone)}>
              <Icon className="size-3" /> {meta.label}
            </span>
            <span className="rounded-full bg-paper px-2 py-0.5 font-medium text-muted ring-1 ring-line ring-inset">{MODULE_LABELS[a.tableName] ?? a.tableName}</span>
            {a.detail && <span className="text-muted">{a.detail}</span>}
            {hasDetail && (
              <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-0.5 font-semibold text-gold-deep hover:underline" aria-expanded={open}>
                {a.changes!.length} changement(s) <ChevronDown className={cn("size-3.5 transition", open && "rotate-180")} />
              </button>
            )}
          </div>
          {open && hasDetail && (
            <ul className="mt-2.5 space-y-1.5 rounded-xl bg-paper p-3 text-xs ring-1 ring-line">
              {a.changes!.map((c, i) => (
                <li key={i} className="grid gap-1 sm:grid-cols-[180px_1fr]">
                  <span className="font-semibold">{c.field}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {c.before !== undefined && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 line-through decoration-rose-300">{c.before}</span>}
                    {c.before !== undefined && c.after !== undefined && <ArrowRight className="size-3 text-muted" />}
                    {c.after !== undefined && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-800">{c.after}</span>}
                    {c.before === undefined && c.after === undefined && <span className="text-muted">vidé</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <time dateTime={a.occurredAt} className="shrink-0 text-xs font-medium text-muted tabular-nums">{time(a.occurredAt)}</time>
      </div>
    </li>
  );
}
