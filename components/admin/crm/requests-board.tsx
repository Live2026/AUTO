"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Columns3, List, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { listRequests, listStaffSync, staffById, type RequestRow } from "@/lib/db/mock-backend";
import { formatRelative } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import { CHANNEL_LABELS, PIPELINE, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from "@/lib/labels";
import { can } from "@/lib/permissions";
import type { RequestType } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { Button, EmptyState, cn } from "../../ui";
import { PageHeader, useStaff } from "../shell";
import { Loading, StatusBadge, Tabs, TypeBadge } from "../ui";
import { NewRequestDialog } from "./new-request-dialog";

type Group = "tous" | "a-traiter" | "en-cours" | "clotures";
const GROUPS: Record<Group, (r: RequestRow) => boolean> = {
  tous: () => true,
  "a-traiter": (r) => r.status === "new" || r.status === "to_contact",
  "en-cours": (r) => ["contacted", "in_discussion", "offer_sent", "waiting_client", "confirmed"].includes(r.status),
  clotures: (r) => ["completed", "cancelled", "lost"].includes(r.status),
};

/** Re-monte le tableau quand la recherche globale change (?q=). */
export function RequestsBoardRoute() {
  const params = useSearchParams();
  return <RequestsBoard key={`${params.get("q") ?? ""}|${params.get("status") ?? ""}`} />;
}

function RequestsBoard() {
  const user = useStaff();
  const params = useSearchParams();
  const now = useNow();
  const [group, setGroup] = useState<Group>((params.get("status") as Group) ?? "tous");
  const [type, setType] = useState<"" | RequestType>("");
  const [assignee, setAssignee] = useState(can(user.roleId, "crm.read_all") ? "" : user.id);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [creating, setCreating] = useState(false);
  const all = useLiveQuery(() => listRequests(), []);

  // RLS : un commercial ne voit que ses demandes (crm.write_own sans crm.read_all)
  const visible = useMemo(() => (all ?? []).filter((r) => can(user.roleId, "crm.read_all") || r.assignedTo === user.id), [all, user.roleId, user.id]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return visible.filter((r) => {
      if (type && r.type !== type) return false;
      if (assignee === "none" ? !!r.assignedTo : assignee && r.assignedTo !== assignee) return false;
      if (s && !`${r.reference} ${r.contact?.fullName} ${r.contact?.phoneE164} ${r.vehicle?.brand ?? ""} ${r.vehicle?.model ?? ""}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [visible, type, assignee, q]);

  if (!all) return <Loading />;
  const rows = filtered.filter(GROUPS[group]);

  return (
    <>
      <PageHeader
        title="Demandes"
        description="Toutes les demandes des trois pôles, centralisées (§37)."
        actions={
          <>
            <div className="flex rounded-xl bg-white p-1 ring-1 ring-line">
              <button type="button" onClick={() => setView("list")} className={cn("rounded-lg p-2", view === "list" && "bg-ink text-white")} aria-label="Vue liste"><List className="size-4" /></button>
              <button type="button" onClick={() => setView("kanban")} className={cn("rounded-lg p-2", view === "kanban" && "bg-ink text-white")} aria-label="Vue pipeline"><Columns3 className="size-4" /></button>
            </div>
            {(can(user.roleId, "crm.write_own") || can(user.roleId, "crm.write_all")) && (
              <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Nouvelle demande</Button>
            )}
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <Tabs
          value={group}
          onChange={setGroup}
          items={[
            ["tous", "Toutes", filtered.length],
            ["a-traiter", "À traiter", filtered.filter(GROUPS["a-traiter"]).length],
            ["en-cours", "En cours", filtered.filter(GROUPS["en-cours"]).length],
            ["clotures", "Clôturées", filtered.filter(GROUPS.clotures).length],
          ]}
        />
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_200px]">
          <label className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Référence, nom, téléphone, véhicule…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as RequestType | "")}>
            <option value="">Tous les types</option>
            {Object.entries(REQUEST_TYPE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
          {can(user.roleId, "crm.read_all") ? (
            <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Tous les responsables</option>
              <option value="none">Non affectées</option>
              {listStaffSync().map((u) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          ) : (
            <p className="self-center text-sm text-muted">Vos demandes uniquement</p>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Aucune demande" description="Aucune demande ne correspond à ces filtres." />
      ) : view === "list" ? (
        <div className="card overflow-hidden">
          <table className="w-full text-sm max-md:hidden">
            <thead className="border-b border-line bg-paper text-left text-xs text-muted uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Référence</th>
                <th className="px-4 py-2.5 font-semibold">Client</th>
                <th className="px-4 py-2.5 font-semibold">Objet</th>
                <th className="px-4 py-2.5 font-semibold">Statut</th>
                <th className="px-4 py-2.5 font-semibold">Responsable</th>
                <th className="px-4 py-2.5 font-semibold">Reçue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id} className="relative hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/admin/crm/${r.id}`} className="font-mono font-bold after:absolute after:inset-0">{r.reference}</Link>
                    <div className="mt-1"><TypeBadge type={r.type} /></div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.contact?.fullName}</p>
                    <p className="text-xs text-muted">{formatPhone(r.contact?.phoneE164)}</p>
                  </td>
                  <td className="max-w-56 px-4 py-3">
                    <p className="truncate">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model} ${r.vehicle.year}` : r.subject ?? r.message ?? "—"}</p>
                    <p className="text-xs text-muted">{CHANNEL_LABELS[r.channel]}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-muted">{staffById(r.assignedTo)?.fullName ?? <span className="font-semibold text-rose-600">Non affectée</span>}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted">{now ? formatRelative(r.createdAt, now) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/crm/${r.id}`} className="block p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold">{r.reference}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 font-medium">{r.contact?.fullName}</p>
                  <p className="truncate text-sm text-muted">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : r.message ?? REQUEST_TYPE_LABELS[r.type]}</p>
                  <p className="mt-1 flex items-center justify-between text-xs text-muted">
                    <TypeBadge type={r.type} />
                    <span>{now ? formatRelative(r.createdAt, now) : ""}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
          {[...PIPELINE, "lost" as const, "cancelled" as const].map((status) => {
            const col = rows.filter((r) => r.status === status);
            return (
              <div key={status} className="w-72 shrink-0">
                <p className="mb-2 flex items-center justify-between px-1 text-sm font-bold">
                  {REQUEST_STATUS_LABELS[status]} <span className="text-muted">{col.length}</span>
                </p>
                <div className="min-h-24 space-y-2 rounded-2xl bg-black/[0.03] p-2">
                  {col.map((r) => (
                    <Link key={r.id} href={`/admin/crm/${r.id}`} className="block rounded-xl border border-line bg-white p-3 shadow-sm hover:border-ink/30">
                      <p className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold">{r.reference}</span>
                        <TypeBadge type={r.type} />
                      </p>
                      <p className="mt-1.5 text-sm font-semibold">{r.contact?.fullName}</p>
                      <p className="truncate text-xs text-muted">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : r.message}</p>
                      <p className="mt-1.5 text-[11px] text-muted">{staffById(r.assignedTo)?.fullName ?? "Non affectée"}</p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <NewRequestDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
