"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { KeyRound, Mail, MessageCircle, Pencil, Phone, Power, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar, Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, StatCard, Tabs } from "@/components/admin/ui";
import { AddUserWizard } from "@/components/admin/users/add-user-wizard";
import { RolesMatrix } from "@/components/admin/users/roles-matrix";
import { Button, EmptyState, Field, buttonClass, cn } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { BusinessError, mockDb, saveStaff, sendPasswordReset, staffById } from "@/lib/db/mock-backend";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { ROLE_INFO, ROLE_LABELS } from "@/lib/labels";
import { ALL_PERMISSIONS, can } from "@/lib/permissions";
import { formatPhone, normalizePhone } from "@/lib/phone";
import type { RoleId, StaffUser } from "@/lib/types";
import { buildTelLink, buildWhatsAppLink } from "@/lib/whatsapp";

const ROLE_ORDER: RoleId[] = ["admin", "manager_auto", "manager_rental", "manager_events", "sales", "accountant", "driver"];

/** Gestion des utilisateurs internes (§42) — réservée à la permission users.manage. */
export default function UsersPage() {
  const me = useStaff();
  const now = useNow();
  const [tab, setTab] = useState<"equipe" | "roles">("equipe");
  const [adding, setAdding] = useState(false);
  const [role, setRole] = useState<"" | RoleId>("");
  const [status, setStatus] = useState<"actifs" | "desactives" | "tous">("actifs");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<StaffUser | null>(null);
  const data = useLiveQuery(async () => ({
    staff: await mockDb.staff.toArray(),
    requests: await mockDb.requests.toArray(),
    audit: await mockDb.audit.orderBy("occurredAt").reverse().limit(500).toArray(),
  }), []);
  if (!can(me.roleId, "users.manage")) return <Forbidden />;
  if (!data || !now) return <Loading />;

  const { staff, requests, audit } = data;
  const active = staff.filter((u) => u.isActive);
  const list = staff
    .filter((u) => (status === "actifs" ? u.isActive : status === "desactives" ? !u.isActive : true))
    .filter((u) => !role || u.roleId === role)
    .filter((u) => !q || `${u.fullName} ${u.email} ${u.phone} ${u.jobTitle ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => ROLE_ORDER.indexOf(a.roleId) - ROLE_ORDER.indexOf(b.roleId) || a.fullName.localeCompare(b.fullName));
  const openRequests = (id: string) => requests.filter((r) => r.assignedTo === id && !["completed", "cancelled", "lost"].includes(r.status) && !r.archivedAt).length;

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="L'équipe qui a accès à l'espace de gestion : ajoutez les responsables automobile, location, événementiel, les commerciaux…"
        actions={<Button variant="gold" onClick={() => setAdding(true)}><UserPlus className="size-4" /> Ajouter un utilisateur</Button>}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Utilisateurs actifs" value={active.length} hint={`${staff.length - active.length} désactivé(s)`} />
        <StatCard label="Responsables de pôle" value={active.filter((u) => u.roleId.startsWith("manager_")).length} />
        <StatCard label="Commerciaux" value={active.filter((u) => u.roleId === "sales").length} />
        <StatCard label="Super administrateurs" value={active.filter((u) => u.roleId === "admin").length} tone="text-gold-deep" />
      </div>

      <div className="mb-4">
        <Tabs value={tab} onChange={setTab} items={[["equipe", "Équipe", staff.length], ["roles", "Rôles & permissions"]]} />
      </div>

      {tab === "roles" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ROLE_ORDER.map((r) => (
              <div key={r} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", ROLE_INFO[r].tone)}>{ROLE_LABELS[r]}</span>
                  <span className="text-xs text-muted">{active.filter((u) => u.roleId === r).length} utilisateur(s)</span>
                </div>
                <p className="mt-2 text-sm text-muted">{ROLE_INFO[r].summary}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => { setRole(r); setAdding(true); }}><UserPlus className="size-4" /> Ajouter un {ROLE_LABELS[r].toLowerCase()}</Button>
              </div>
            ))}
          </div>
          <RolesMatrix />
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input className="input pl-9" placeholder="Nom, e-mail, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un utilisateur" />
            </label>
            <select className="input w-auto" value={role} onChange={(e) => setRole(e.target.value as RoleId | "")} aria-label="Filtrer par rôle">
              <option value="">Tous les rôles</option>
              {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filtrer par statut">
              <option value="actifs">Actifs</option>
              <option value="desactives">Désactivés</option>
              <option value="tous">Tous</option>
            </select>
          </div>
          {list.length === 0 ? (
            <EmptyState title="Aucun utilisateur" description="Ajoutez votre premier collaborateur." action={<Button onClick={() => setAdding(true)}><UserPlus className="size-4" /> Ajouter</Button>} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {list.map((u) => (
                <button key={u.id} type="button" onClick={() => setSelected(u)} className={cn("card p-4 text-left transition hover:border-ink/30 hover:shadow-lg hover:shadow-black/5", !u.isActive && "opacity-70")}>
                  <div className="flex items-start gap-3">
                    <Avatar user={u} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{u.fullName}{u.id === me.id && <span className="ml-1.5 text-xs font-normal text-muted">(vous)</span>}</p>
                      <p className="truncate text-xs text-muted">{u.jobTitle ?? u.email}</p>
                      <span className={cn("mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold", ROLE_INFO[u.roleId].tone)}>{ROLE_LABELS[u.roleId]}</span>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-paper p-2.5">
                      <p className="text-muted">Demandes en cours</p>
                      <p className="text-base font-bold">{openRequests(u.id)}</p>
                    </div>
                    <div className="rounded-xl bg-paper p-2.5">
                      <p className="text-muted">Dernière connexion</p>
                      <p className="font-semibold">{u.lastLoginAt ? formatRelative(u.lastLoginAt, now) : "jamais"}</p>
                    </div>
                  </div>
                  <p className={cn("mt-3 flex items-center gap-1.5 text-xs font-semibold", u.isActive ? "text-emerald-700" : "text-muted")}>
                    <span className={cn("size-1.5 rounded-full", u.isActive ? "bg-emerald-500" : "bg-zinc-400")} />
                    {u.isActive ? "Accès actif" : "Accès désactivé"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {adding && <AddUserWizard open onClose={() => { setAdding(false); setRole(""); }} initialRole={role || undefined} />}
      {selected && (
        <UserDetail
          key={selected.id}
          user={staff.find((u) => u.id === selected.id) ?? selected}
          activity={audit.filter((a) => a.actorId === selected.id).slice(0, 8)}
          openRequests={openRequests(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function UserDetail({ user, activity, openRequests, onClose }: { user: StaffUser; activity: { id?: number; occurredAt: string; summary: string }[]; openRequests: number; onClose: () => void }) {
  const me = useStaff();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(user);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMsg({ ok: true, text: ok });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BusinessError ? e.message : String(e) });
    }
  };
  const self = user.id === me.id;

  return (
    <Modal open onClose={onClose} title="Fiche utilisateur" wide>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{user.fullName}</p>
            <p className="text-sm text-muted">{user.jobTitle ?? ROLE_INFO[user.roleId].summary}</p>
          </div>
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", ROLE_INFO[user.roleId].tone)}>{ROLE_LABELS[user.roleId]}</span>
        </div>

        {!editing ? (
          <>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p className="flex items-center gap-2"><Mail className="size-4 text-muted" />{user.email}</p>
              <p className="flex items-center gap-2"><Phone className="size-4 text-muted" />{formatPhone(user.phone)}</p>
              <p className="text-muted">Ajouté le {user.createdAt ? formatDate(user.createdAt) : "—"}{user.invitedBy ? ` par ${staffById(user.invitedBy)?.fullName ?? "—"}` : ""}</p>
              <p className="text-muted">Dernière connexion : {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "jamais"}</p>
              <p className="text-muted">Demandes en cours : <strong className="text-ink">{openRequests}</strong></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" /> Modifier</Button>
              {user.phone && <a className={buttonClass("whatsapp", "sm")} target="_blank" rel="noopener noreferrer" href={buildWhatsAppLink(user.phone)}><MessageCircle className="size-4" /> WhatsApp</a>}
              {user.phone && <a className={buttonClass("outline", "sm")} href={buildTelLink(user.phone)}><Phone className="size-4" /> Appeler</a>}
              <Button size="sm" variant="outline" onClick={() => run(async () => sendPasswordReset(user.id, me.id), `Lien de réinitialisation envoyé à ${user.email} (démo).`)}><KeyRound className="size-4" /> Réinitialiser le mot de passe</Button>
              {!self && (
                <Button
                  size="sm"
                  variant={user.isActive ? "danger" : "outline"}
                  onClick={() => {
                    if (user.isActive && !confirm(`Désactiver l'accès de ${user.fullName} ? Il/elle ne pourra plus se connecter. Ses demandes restent affectées.`)) return;
                    void run(() => saveStaff({ ...user, isActive: !user.isActive }, me.id), user.isActive ? "Accès désactivé." : "Accès réactivé.");
                  }}
                >
                  <Power className="size-4" /> {user.isActive ? "Désactiver l'accès" : "Réactiver l'accès"}
                </Button>
              )}
            </div>
            {msg && <p className={cn("text-sm font-medium", msg.ok ? "text-emerald-700" : "text-rose-600")}>{msg.text}</p>}
            {openRequests > 0 && !user.isActive && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Pensez à réaffecter ses {openRequests} demande(s) en cours depuis le CRM.</p>}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-bold">Droits (rôle {ROLE_LABELS[user.roleId]})</p>
                <ul className="space-y-1 text-sm">
                  {ALL_PERMISSIONS.filter(([p]) => can(user.roleId, p)).map(([p, label]) => (
                    <li key={p} className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" />{label}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold">Activité récente</p>
                <ul className="space-y-1.5 text-xs text-muted">
                  {activity.length === 0 && <li>Aucune action enregistrée.</li>}
                  {activity.map((a) => <li key={a.id}>{formatDateTime(a.occurredAt)} — <span className="text-ink">{a.summary}</span></li>)}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (form.phone && !normalizePhone(form.phone)) return setMsg({ ok: false, text: "Numéro de téléphone invalide." });
              await run(() => saveStaff({ ...form, phone: normalizePhone(form.phone) ?? "" }, me.id), "Utilisateur enregistré ✓");
              setEditing(false);
            }}
          >
            <Field label="Nom complet"><input className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></Field>
            <Field label="Fonction"><input className="input" value={form.jobTitle ?? ""} onChange={(e) => setForm({ ...form, jobTitle: e.target.value || undefined })} /></Field>
            <Field label="E-mail"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
            <Field label="Téléphone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Rôle" className="sm:col-span-2" hint={self ? "Vous ne pouvez pas modifier votre propre rôle." : ROLE_INFO[form.roleId].summary}>
              <select className="input" value={form.roleId} disabled={self} onChange={(e) => setForm({ ...form, roleId: e.target.value as RoleId })}>
                {ROLE_ORDER.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
            {msg && !msg.ok && <p className="text-sm font-medium text-rose-600 sm:col-span-2">{msg.text}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Enregistrer</Button>
              <Button variant="ghost" onClick={() => { setForm(user); setEditing(false); }}>Annuler</Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
