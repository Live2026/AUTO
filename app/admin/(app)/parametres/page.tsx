"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, RotateCcw, UserPlus } from "lucide-react";
import { useState } from "react";
import { Avatar, Forbidden, PageHeader, allowed, useStaff } from "@/components/admin/shell";
import { Loading, Panel, Tabs } from "@/components/admin/ui";
import { Button, Field, cn } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { BusinessError, getSettings, listAudit, mockDb, resetDemo, saveRole, saveSettings, saveStaff, staffById } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { REQUEST_TYPE_LABELS, ROLE_LABELS } from "@/lib/labels";
import { ALL_PERMISSIONS, can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import type { BusinessSettings, Pole, RequestType, RoleDef, RoleId, StaffUser } from "@/lib/types";

type Tab = "entreprise" | "regles" | "whatsapp" | "utilisateurs" | "roles" | "audit";
const POLES: ["default" | Pole, string][] = [["default", "Général"], ["sale", "Vente"], ["rental", "Location"], ["event", "Événementiel"]];

export default function SettingsPage() {
  const user = useStaff();
  const [tab, setTab] = useState<Tab>(can(user.roleId, "settings.write") ? "entreprise" : can(user.roleId, "users.manage") ? "utilisateurs" : "audit");
  const settings = useLiveQuery(() => getSettings(), []);
  if (!allowed(user, ["settings.write", "users.manage", "audit.read"])) return <Forbidden />;
  if (!settings) return <Loading />;
  const tabs: [Tab, string][] = [
    ...(can(user.roleId, "settings.write") ? ([["entreprise", "Entreprise & canaux"], ["regles", "Règles métier"], ["whatsapp", "Messages WhatsApp"]] as [Tab, string][]) : []),
    ...(can(user.roleId, "users.manage") ? ([["utilisateurs", "Utilisateurs"], ["roles", "Rôles & permissions"]] as [Tab, string][]) : []),
    ...(can(user.roleId, "audit.read") ? ([["audit", "Journal d'audit"]] as [Tab, string][]) : []),
  ];
  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Configuration de l'entreprise, des canaux de contact, des règles métier et des accès."
        actions={
          can(user.roleId, "settings.write") && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!confirm("Réinitialiser toutes les données de démonstration de ce navigateur ?")) return;
                await resetDemo();
                location.reload();
              }}
            >
              <RotateCcw className="size-4" /> Réinitialiser la démo
            </Button>
          )
        }
      />
      <div className="mb-5">
        <Tabs value={tab} onChange={setTab} items={tabs} />
      </div>
      {tab === "entreprise" && <CompanyForm key={JSON.stringify(settings.company)} initial={settings} />}
      {tab === "regles" && <RulesForm initial={settings} />}
      {tab === "whatsapp" && <TemplatesForm initial={settings} />}
      {tab === "utilisateurs" && <UsersManager />}
      {tab === "roles" && <RolesMatrix />}
      {tab === "audit" && <AuditLog />}
      {(tab === "entreprise" || tab === "whatsapp") && (
        <p className="mt-4 text-xs text-muted">Mode démo : les numéros et textes du site public restent ceux de la démonstration. Avec Supabase, le site se met à jour à chaque enregistrement.</p>
      )}
    </>
  );
}

function useSaver() {
  const user = useStaff();
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      setMsg({ ok: true, text: "Enregistré ✓" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof BusinessError ? e.message : String(e) });
    }
  };
  return { user, msg, run };
}

function Feedback({ msg }: { msg?: { ok: boolean; text: string } }) {
  if (!msg) return null;
  return <p className={cn("text-sm font-medium", msg.ok ? "text-emerald-700" : "text-rose-600")}>{msg.text}</p>;
}

function CompanyForm({ initial }: { initial: BusinessSettings }) {
  const { user, msg, run } = useSaver();
  const [s, setS] = useState(initial);
  const setCompany = (patch: Partial<BusinessSettings["company"]>) => setS({ ...s, company: { ...s.company, ...patch } });
  return (
    <form className="grid gap-6 lg:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run(() => saveSettings(s, user.id)); }}>
      <Panel title="Entreprise">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Raison sociale" className="sm:col-span-2"><input className="input" value={s.company.name} onChange={(e) => setCompany({ name: e.target.value })} /></Field>
          <Field label="Accroche" className="sm:col-span-2"><input className="input" value={s.company.tagline} onChange={(e) => setCompany({ tagline: e.target.value })} /></Field>
          <Field label="Adresse"><input className="input" value={s.company.address} onChange={(e) => setCompany({ address: e.target.value })} /></Field>
          <Field label="Ville"><input className="input" value={s.company.city} onChange={(e) => setCompany({ city: e.target.value })} /></Field>
          <Field label="E-mail"><input className="input" type="email" value={s.company.email} onChange={(e) => setCompany({ email: e.target.value })} /></Field>
          <Field label="Horaires"><input className="input" value={s.company.hours} onChange={(e) => setCompany({ hours: e.target.value })} /></Field>
          <Field label="Facebook"><input className="input" value={s.socialLinks.facebook ?? ""} onChange={(e) => setS({ ...s, socialLinks: { ...s.socialLinks, facebook: e.target.value } })} /></Field>
          <Field label="Instagram"><input className="input" value={s.socialLinks.instagram ?? ""} onChange={(e) => setS({ ...s, socialLinks: { ...s.socialLinks, instagram: e.target.value } })} /></Field>
        </div>
      </Panel>
      <Panel title="Numéros d'appel et WhatsApp par pôle (§6–7)">
        <div className="space-y-3 p-4">
          {POLES.map(([k, label]) => (
            <div key={k} className="grid grid-cols-[110px_1fr_1fr] items-center gap-2 text-sm">
              <span className="font-medium">{label}</span>
              <input className="input h-10" aria-label={`Téléphone ${label}`} placeholder="Téléphone" value={s.contactPhones[k] ?? ""} onChange={(e) => setS({ ...s, contactPhones: { ...s.contactPhones, [k]: e.target.value || null } })} />
              <input className="input h-10" aria-label={`WhatsApp ${label}`} placeholder="WhatsApp" value={s.whatsappNumbers[k] ?? ""} onChange={(e) => setS({ ...s, whatsappNumbers: { ...s.whatsappNumbers, [k]: e.target.value || null } })} />
            </div>
          ))}
          <p className="text-xs text-muted">Vide = le numéro général est utilisé. Format : +242 06 123 45 67.</p>
        </div>
      </Panel>
      <div className="flex items-center gap-3 lg:col-span-2">
        <Button type="submit">Enregistrer</Button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}

function RulesForm({ initial }: { initial: BusinessSettings }) {
  const { user, msg, run } = useSaver();
  const [s, setS] = useState(initial);
  const staff = useLiveQuery(() => mockDb.staff.toArray(), []) ?? [];
  const num = (k: keyof BusinessSettings, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input className="input" type="number" min={0} value={s[k] as number} onChange={(e) => setS({ ...s, [k]: Number(e.target.value) })} />
    </Field>
  );
  return (
    <form className="grid gap-6 lg:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void run(() => saveSettings(s, user.id)); }}>
      <Panel title="Réservations & devis">
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {num("holdDurationHours", "Durée d'une option (h)", "R3 — libérée automatiquement")}
          {num("rentalBufferHours", "Tampon entre locations (h)", "Nettoyage, contrôle")}
          {num("quoteValidityDays", "Validité d'un devis (jours)")}
          {num("quoteTaxRate", "Taxe par défaut (%)", "À valider (Q20)")}
          {num("slaNewRequestMinutes", "Alerte demande non traitée (min)")}
        </div>
      </Panel>
      <Panel title="Affectation automatique des demandes (R6)">
        <div className="space-y-2 p-4">
          {(["sale", "test_drive", "appointment", "trade_in", "rental", "event", "callback", "other"] as RequestType[]).map((t) => (
            <label key={t} className="grid grid-cols-[130px_1fr] items-center gap-2 text-sm">
              <span>{REQUEST_TYPE_LABELS[t]}</span>
              <select className="input h-10 py-1" value={s.defaultAssignees[t] ?? ""} onChange={(e) => setS({ ...s, defaultAssignees: { ...s.defaultAssignees, [t]: e.target.value || undefined } })}>
                <option value="">Non affectée (file commune)</option>
                {staff.filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </label>
          ))}
        </div>
      </Panel>
      <Panel title="Listes">
        <div className="space-y-3 p-4">
          <Field label="Motifs de perte (un par ligne)"><textarea className="input min-h-28" value={s.lostReasons.join("\n")} onChange={(e) => setS({ ...s, lostReasons: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></Field>
          <Field label="Villes desservies (une par ligne)"><textarea className="input min-h-28" value={s.cities.join("\n")} onChange={(e) => setS({ ...s, cities: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} /></Field>
        </div>
      </Panel>
      <div className="flex items-center gap-3 lg:col-span-2">
        <Button type="submit">Enregistrer</Button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}

function TemplatesForm({ initial }: { initial: BusinessSettings }) {
  const { user, msg, run } = useSaver();
  const [s, setS] = useState(initial);
  const labels: Record<keyof BusinessSettings["whatsappTemplates"], string> = { sale: "Véhicule à vendre", rental: "Location", event: "Événement", request: "Suivi d'une demande" };
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void run(() => saveSettings(s, user.id)); }}>
      <Panel title="Modèles de messages WhatsApp pré-remplis (R10)">
        <div className="space-y-4 p-4">
          {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
            <Field key={k} label={labels[k]}>
              <textarea className="input min-h-20 font-mono text-sm" value={s.whatsappTemplates[k]} onChange={(e) => setS({ ...s, whatsappTemplates: { ...s.whatsappTemplates, [k]: e.target.value } })} />
            </Field>
          ))}
          <p className="text-xs text-muted">Variables : {"{vehicule} {reference} {date_debut} {date_fin} {type_evenement} {url}"}</p>
        </div>
      </Panel>
      <div className="flex items-center gap-3">
        <Button type="submit">Enregistrer</Button>
        <Feedback msg={msg} />
      </div>
    </form>
  );
}

function UsersManager() {
  const me = useStaff();
  const staff = useLiveQuery(() => mockDb.staff.toArray(), []);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [error, setError] = useState<string>();
  if (!staff) return <Loading />;
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEditing({ id: crypto.randomUUID(), fullName: "", email: "", phone: "", roleId: "sales", isActive: true })}><UserPlus className="size-4" /> Inviter un employé</Button>
      </div>
      <div className="card divide-y divide-line">
        {staff.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <Avatar user={u} />
            <div className="min-w-48 flex-1">
              <p className={cn("font-semibold", !u.isActive && "text-muted line-through")}>{u.fullName}{u.id === me.id && <span className="ml-2 text-xs font-normal text-muted">(vous)</span>}</p>
              <p className="text-xs text-muted">{u.email} · {formatPhone(u.phone)}</p>
            </div>
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", u.roleId === "admin" ? "bg-gold text-ink" : "bg-paper")}>{ROLE_LABELS[u.roleId]}</span>
            <span className={cn("text-xs font-semibold", u.isActive ? "text-emerald-700" : "text-muted")}>{u.isActive ? "Actif" : "Désactivé"}</span>
            <button type="button" onClick={() => setEditing(u)} className="rounded-lg p-2 hover:bg-black/5" aria-label={`Modifier ${u.fullName}`}><Pencil className="size-4" /></button>
          </div>
        ))}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing && staff.some((u) => u.id === editing.id) ? "Modifier l'employé" : "Inviter un employé"}>
        {editing && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveStaff(editing, me.id);
                setEditing(null);
                setError(undefined);
              } catch (err) {
                setError(err instanceof BusinessError ? err.message : String(err));
              }
            }}
          >
            <Field label="Nom complet"><input className="input" value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} required /></Field>
            <Field label="E-mail (identifiant de connexion)"><input className="input" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} required /></Field>
            <Field label="Téléphone"><input className="input" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
            <Field label="Rôle">
              <select className="input" value={editing.roleId} onChange={(e) => setEditing({ ...editing, roleId: e.target.value as RoleId })}>
                {(Object.keys(ROLE_LABELS) as RoleId[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={editing.isActive} disabled={editing.id === me.id} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} /> Compte actif</label>
            <p className="text-xs text-muted">En production, l&apos;invitation envoie un e-mail Supabase Auth pour définir le mot de passe. Démo : mot de passe « demo ».</p>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>
    </>
  );
}

function RolesMatrix() {
  const me = useStaff();
  const roles = useLiveQuery(() => mockDb.roles.toArray(), []);
  const [msg, setMsg] = useState<string>();
  if (!roles) return <Loading />;
  const toggle = async (role: RoleDef, perm: (typeof ALL_PERMISSIONS)[number][0]) => {
    const has = role.permissions.includes(perm);
    await saveRole({ ...role, permissions: has ? role.permissions.filter((p) => p !== perm) : [...role.permissions, perm] }, me.id);
    setMsg(`Permissions du rôle « ${role.label} » mises à jour — effet immédiat.`);
  };
  const order: RoleId[] = ["admin", "manager_auto", "manager_rental", "manager_events", "sales", "accountant", "driver"];
  const sorted = order.map((id) => roles.find((r) => r.id === id)).filter((r): r is RoleDef => !!r);
  return (
    <Panel title="Matrice des permissions (R12) — cliquez pour accorder / retirer">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-xs">
          <thead className="border-b border-line bg-paper">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Permission</th>
              {sorted.map((r) => <th key={r.id} className="px-2 py-2 font-semibold">{ROLE_LABELS[r.id]}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ALL_PERMISSIONS.map(([p, label]) => (
              <tr key={p}>
                <td className="px-3 py-2">{label} <span className="font-mono text-muted">{p}</span></td>
                {sorted.map((r) => {
                  const on = r.id === "admin" || r.permissions.includes(p) || r.permissions.includes("*");
                  return (
                    <td key={r.id} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        className="size-4 accent-ink"
                        checked={on}
                        disabled={r.id === "admin"}
                        onChange={() => toggle(r, p)}
                        aria-label={`${label} — ${ROLE_LABELS[r.id]}`}
                        title={r.id === "admin" ? "Le super administrateur a toujours tous les droits" : undefined}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <p className="border-t border-line p-3 text-sm text-emerald-700">{msg}</p>}
    </Panel>
  );
}

function AuditLog() {
  const audit = useLiveQuery(() => listAudit(300), []);
  const [q, setQ] = useState("");
  if (!audit) return <Loading />;
  const list = audit.filter((a) => !q || `${a.summary} ${a.tableName} ${staffById(a.actorId)?.fullName ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel title="Journal d'audit (R13)" action={<input className="input h-9 w-56 py-1" placeholder="Filtrer…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filtrer le journal" />}>
      <ul className="divide-y divide-line text-sm">
        {list.length === 0 && <li className="p-4 text-muted">Aucune action.</li>}
        {list.map((a) => (
          <li key={a.id} className="flex flex-wrap gap-x-3 p-3">
            <span className="w-32 text-muted">{formatDateTime(a.occurredAt)}</span>
            <span className="w-40 font-semibold">{staffById(a.actorId)?.fullName ?? (a.actorId === "system" ? "Client (en ligne)" : "Visiteur / système")}</span>
            <span className="font-mono text-xs text-muted">{a.tableName}.{a.action}</span>
            <span className="flex-1">{a.summary}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
