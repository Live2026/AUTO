"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading } from "@/components/admin/ui";
import { Button, Field } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { listDriverAssignments, listDrivers, saveDriver } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { DRIVER_STATUS_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";
import type { Driver, DriverStatus } from "@/lib/types";

export default function DriversPage() {
  const user = useStaff();
  const now = useNow();
  const drivers = useLiveQuery(() => listDrivers(), []);
  const assignments = useLiveQuery(() => listDriverAssignments(), []);
  const [editing, setEditing] = useState<Driver | null>(null);
  if (!can(user.roleId, "drivers.write")) return <Forbidden />;
  if (!drivers || !assignments || !now) return <Loading />;
  return (
    <>
      <PageHeader
        title="Chauffeurs"
        description="Statut, disponibilité et missions. « Affecté » est déduit des missions en cours (R4)."
        actions={<Button onClick={() => setEditing({ id: crypto.randomUUID(), fullName: "", phone: "", status: "available" })}><Plus className="size-4" /> Ajouter</Button>}
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {drivers.map((d) => {
          const mine = assignments.filter((a) => a.driverId === d.id && a.status !== "cancelled" && new Date(a.end).getTime() > now).sort((a, b) => a.start.localeCompare(b.start));
          const current = mine.find((a) => new Date(a.start).getTime() <= now);
          const label = d.status !== "available" ? DRIVER_STATUS_LABELS[d.status] : current ? "Affecté" : "Disponible";
          const tone = d.status !== "available" ? "bg-zinc-100 text-zinc-600" : current ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
          return (
            <button key={d.id} type="button" onClick={() => setEditing(d)} className="card p-4 text-left transition hover:border-ink/30">
              <div className="flex items-center justify-between">
                <p className="font-bold">{d.fullName}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{label}</span>
              </div>
              <p className="text-sm text-muted">{formatPhone(d.phone)} · Permis {d.licenseNumber ?? "—"}</p>
              <p className="mt-3 text-xs font-semibold text-muted">Prochaines missions</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {mine.length === 0 && <li className="text-muted">Aucune</li>}
                {mine.slice(0, 3).map((a) => (
                  <li key={a.id}>{formatDateTime(a.start)} → {formatDateTime(a.end)}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Chauffeur">
        {editing && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              await saveDriver(editing, user.id);
              setEditing(null);
            }}
          >
            <Field label="Nom complet"><input className="input" value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} required /></Field>
            <Field label="Téléphone"><input className="input" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} required /></Field>
            <Field label="N° de permis"><input className="input" value={editing.licenseNumber ?? ""} onChange={(e) => setEditing({ ...editing, licenseNumber: e.target.value })} /></Field>
            <Field label="Statut">
              <select className="input" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as DriverStatus })}>
                {Object.entries(DRIVER_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>
    </>
  );
}
