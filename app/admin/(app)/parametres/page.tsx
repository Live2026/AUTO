"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { RotateCcw, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Forbidden, PageHeader, allowed, useStaff } from "@/components/admin/shell";
import { Loading, Panel, Tabs } from "@/components/admin/ui";
import { Button, Field, cn } from "@/components/ui";
import { BusinessError, getSettings, listAudit, mockDb, resetDemo, saveSettings, staffById } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { REQUEST_TYPE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import type { BusinessSettings, Pole, RequestType } from "@/lib/types";

type Tab = "entreprise" | "regles" | "whatsapp" | "audit";
const POLES: ["default" | Pole, string][] = [["default", "Général"], ["sale", "Vente"], ["rental", "Location"], ["event", "Événementiel"]];

export default function SettingsPage() {
  const user = useStaff();
  const [tab, setTab] = useState<Tab>(can(user.roleId, "settings.write") ? "entreprise" : "audit");
  const settings = useLiveQuery(() => getSettings(), []);
  if (!allowed(user, ["settings.write", "users.manage", "audit.read"])) return <Forbidden />;
  if (!settings) return <Loading />;
  const tabs: [Tab, string][] = [
    ...(can(user.roleId, "settings.write") ? ([["entreprise", "Entreprise & canaux"], ["regles", "Règles métier"], ["whatsapp", "Messages WhatsApp"]] as [Tab, string][]) : []),
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
      {can(user.roleId, "users.manage") && (
        <Link href="/admin/utilisateurs" className="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-white p-4 text-sm hover:border-ink/30">
          <Users className="size-5 text-gold-deep" />
          <span className="flex-1"><strong>Utilisateurs, rôles et permissions</strong> — ajouter un responsable automobile, location, événementiel, un commercial…</span>
          <span className="font-semibold">Ouvrir →</span>
        </Link>
      )}
      {tabs.length > 0 && (
        <div className="mb-5">
          <Tabs value={tab} onChange={setTab} items={tabs} />
        </div>
      )}
      {tab === "entreprise" && <CompanyForm key={JSON.stringify(settings.company)} initial={settings} />}
      {tab === "regles" && <RulesForm initial={settings} />}
      {tab === "whatsapp" && <TemplatesForm initial={settings} />}
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
