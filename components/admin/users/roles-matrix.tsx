"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { mockDb, saveRole } from "@/lib/db/mock-backend";
import { ROLE_LABELS } from "@/lib/labels";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import type { RoleDef, RoleId } from "@/lib/types";
import { useStaff } from "../shell";
import { Loading, Panel } from "../ui";

export function RolesMatrix() {
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

