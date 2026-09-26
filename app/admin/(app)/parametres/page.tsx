"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Forbidden, PageHeader, allowed, useStaff } from "@/components/admin/shell";
import { Panel, Tabs } from "@/components/admin/ui";
import { Button } from "@/components/ui";
import { listAudit, resetDemo, staffById } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { REQUEST_TYPE_LABELS, ROLE_LABELS } from "@/lib/labels";
import { settings, staffUsers } from "@/lib/mock/catalog";
import { ROLE_PERMISSIONS, can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import type { Permission, RoleId } from "@/lib/types";

const PERMS: [Permission, string][] = [
  ["vehicles.write", "Véhicules"],
  ["vehicles.internal", "Données internes véhicule"],
  ["rentals.write", "Location"],
  ["drivers.write", "Chauffeurs"],
  ["events.write", "Événementiel"],
  ["quotes.write", "Devis (écriture)"],
  ["quotes.read", "Devis (lecture)"],
  ["crm.read_all", "CRM — tout voir"],
  ["crm.write_all", "CRM — tout modifier"],
  ["crm.write_own", "CRM — mes demandes"],
  ["appointments.write", "Rendez-vous"],
  ["marketing.write", "Marketing"],
  ["media.write", "Médiathèque"],
  ["analytics.read", "Analytics"],
  ["finance.read", "Finances"],
  ["settings.write", "Paramètres"],
  ["users.manage", "Utilisateurs"],
  ["audit.read", "Journal d'audit"],
];

export default function SettingsPage() {
  const user = useStaff();
  const [tab, setTab] = useState<"entreprise" | "roles" | "audit">("entreprise");
  const audit = useLiveQuery(() => listAudit(), []);
  const [resetting, setResetting] = useState(false);
  if (!allowed(user, ["settings.write", "users.manage", "audit.read"])) return <Forbidden />;
  return (
    <>
      <PageHeader
        title="Paramètres"
        actions={
          can(user.roleId, "settings.write") && (
            <Button
              variant="outline"
              size="sm"
              disabled={resetting}
              onClick={async () => {
                if (!confirm("Réinitialiser toutes les données de démonstration de ce navigateur ?")) return;
                setResetting(true);
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
        <Tabs value={tab} onChange={setTab} items={[["entreprise", "Entreprise"], ["roles", "Utilisateurs & rôles"], ["audit", "Journal d'audit"]]} />
      </div>

      {tab === "entreprise" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Coordonnées & canaux (R10)">
            <dl className="divide-y divide-line text-sm">
              {(["default", "sale", "rental", "event"] as const).map((k) => (
                <div key={k} className="flex justify-between gap-3 p-3">
                  <dt className="text-muted">{k === "default" ? "Général" : k === "sale" ? "Vente" : k === "rental" ? "Location" : "Événementiel"}</dt>
                  <dd className="text-right">📞 {formatPhone(settings.contactPhones[k])}<br />💬 {formatPhone(settings.whatsappNumbers[k])}</dd>
                </div>
              ))}
              <div className="flex justify-between p-3"><dt className="text-muted">Adresse</dt><dd>{settings.company.address}, {settings.company.city}</dd></div>
              <div className="flex justify-between p-3"><dt className="text-muted">Horaires</dt><dd className="text-right">{settings.company.hours}</dd></div>
            </dl>
          </Panel>
          <Panel title="Règles métier">
            <dl className="divide-y divide-line text-sm">
              {[
                ["Durée d'une option", `${settings.holdDurationHours} h`],
                ["Tampon entre deux locations", `${settings.rentalBufferHours} h`],
                ["Validité d'un devis", `${settings.quoteValidityDays} jours`],
                ["Taxe par défaut sur devis", `${settings.quoteTaxRate} %`],
                ["Alerte demande non traitée", `${settings.slaNewRequestMinutes} min`],
                ["Motifs de perte", settings.lostReasons.join(", ")],
                ["Villes", settings.cities.join(", ")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 p-3"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
              ))}
              {Object.entries(settings.defaultAssignees).map(([type, uid]) => (
                <div key={type} className="flex justify-between gap-3 p-3"><dt className="text-muted">Affectation auto — {REQUEST_TYPE_LABELS[type as keyof typeof REQUEST_TYPE_LABELS]}</dt><dd className="font-semibold">{staffById(uid)?.fullName}</dd></div>
              ))}
            </dl>
          </Panel>
          <Panel title="Modèles de messages WhatsApp" className="lg:col-span-2">
            <dl className="divide-y divide-line text-sm">
              {Object.entries(settings.whatsappTemplates).map(([k, v]) => (
                <div key={k} className="p-3"><dt className="text-xs font-semibold text-muted uppercase">{k}</dt><dd className="mt-1 font-mono text-xs">{v}</dd></div>
              ))}
            </dl>
          </Panel>
          <p className="text-xs text-muted lg:col-span-2">L&apos;édition de ces paramètres écrira dans la table business_settings (Supabase).</p>
        </div>
      )}

      {tab === "roles" && (
        <div className="space-y-6">
          <Panel title="Utilisateurs">
            <ul className="divide-y divide-line">
              {staffUsers.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <span><strong>{u.fullName}</strong> <span className="text-muted">· {u.email}</span></span>
                  <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold">{ROLE_LABELS[u.roleId]}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Matrice des permissions (R12)">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="border-b border-line bg-paper">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Permission</th>
                    {(Object.keys(ROLE_PERMISSIONS) as RoleId[]).map((r) => (
                      <th key={r} className="px-2 py-2 font-semibold">{ROLE_LABELS[r]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {PERMS.map(([p, label]) => (
                    <tr key={p}>
                      <td className="px-3 py-2">{label} <span className="font-mono text-muted">{p}</span></td>
                      {(Object.keys(ROLE_PERMISSIONS) as RoleId[]).map((r) => (
                        <td key={r} className="px-2 py-2 text-center">{can(r, p) && <Check className="mx-auto size-4 text-emerald-600" />}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}

      {tab === "audit" && (
        <Panel title="Journal d'audit (R13)">
          {!can(user.roleId, "audit.read") ? (
            <p className="p-4 text-sm text-muted">Réservé à l&apos;administrateur.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {audit?.length === 0 && <li className="p-4 text-muted">Aucune action enregistrée pour l&apos;instant.</li>}
              {audit?.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-x-3 p-3">
                  <span className="w-32 text-muted">{formatDateTime(a.occurredAt)}</span>
                  <span className="w-40 font-semibold">{staffById(a.actorId)?.fullName ?? (a.actorId === "system" ? "Client (en ligne)" : "Visiteur / système")}</span>
                  <span className="font-mono text-xs text-muted">{a.tableName}.{a.action}</span>
                  <span className="flex-1">{a.summary}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </>
  );
}
