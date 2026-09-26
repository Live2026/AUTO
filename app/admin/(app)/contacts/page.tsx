"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Search, ShieldOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading } from "@/components/admin/ui";
import { Button } from "@/components/ui";
import { anonymizeContact, listContacts, mockDb } from "@/lib/db/mock-backend";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { formatPhone } from "@/lib/phone";

export default function ContactsPage() {
  const user = useStaff();
  const [q, setQ] = useState("");
  const contacts = useLiveQuery(() => listContacts(), []);
  const requests = useLiveQuery(() => mockDb.requests.toArray(), []);
  if (!can(user.roleId, "crm.read_all") && !can(user.roleId, "crm.write_own")) return <Forbidden />;
  if (!contacts || !requests) return <Loading />;
  const mineOnly = !can(user.roleId, "crm.read_all");
  const s = q.trim().toLowerCase();
  const list = contacts.filter((c) => {
    if (mineOnly && !requests.some((r) => r.contactId === c.id && r.assignedTo === user.id)) return false;
    return !s || `${c.fullName} ${c.phoneE164} ${c.email ?? ""}`.toLowerCase().includes(s);
  });

  const exportCsv = () => {
    const rows = [["Nom", "Téléphone", "WhatsApp", "E-mail", "Demandes", "Créé le"], ...list.map((c) => [c.fullName, c.phoneE164, c.whatsappE164 ?? "", c.email ?? "", String(c.requestCount), c.createdAt.slice(0, 10)])];
    const csv = rows.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "contacts-bryan.csv";
    a.click();
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        description="Clients sans compte : une fiche par numéro de téléphone (R2)."
        actions={can(user.roleId, "crm.read_all") && <Button variant="outline" onClick={exportCsv}>Exporter CSV</Button>}
      />
      <label className="relative mb-4 block">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input className="input pl-9" placeholder="Nom, téléphone, e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <div className="card divide-y divide-line">
        {list.map((c) => {
          const reqs = requests.filter((r) => r.contactId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{c.fullName}</p>
                <p className="text-sm text-muted">{formatPhone(c.phoneE164)}{c.email ? ` · ${c.email}` : ""}</p>
                <p className="text-xs text-muted">Client depuis le {formatDate(c.createdAt)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {reqs.map((r) => (
                  <Link key={r.id} href={`/admin/crm/${r.id}`} className="rounded-full bg-paper px-2.5 py-1 font-mono text-xs font-semibold hover:bg-line">{r.reference}</Link>
                ))}
              </div>
              {can(user.roleId, "crm.write_all") && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted"
                  title="Droit à l'effacement (loi 29-2019)"
                  onClick={() => confirm(`Anonymiser définitivement ${c.fullName} ?`) && anonymizeContact(c.id, user.id)}
                >
                  <ShieldOff className="size-4" /> Anonymiser
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
