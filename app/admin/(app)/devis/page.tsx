"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { Forbidden, PageHeader, allowed, useStaff } from "@/components/admin/shell";
import { Loading, QuoteStatusBadge, StatCard } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui";
import { listQuotes } from "@/lib/db/mock-backend";
import { formatDate, formatXAF } from "@/lib/format";
import { computeQuoteTotals } from "@/lib/rules/quote";

export default function QuotesPage() {
  const user = useStaff();
  const quotes = useLiveQuery(() => listQuotes(), []);
  if (!allowed(user, ["quotes.read", "quotes.write"])) return <Forbidden />;
  if (!quotes) return <Loading />;
  const sum = (s: string[]) => quotes.filter((q) => s.includes(q.status)).reduce((a, q) => a + computeQuoteTotals(q).totalTtc, 0);
  return (
    <>
      <PageHeader title="Devis" description="Création depuis une demande (fiche CRM → « Créer un devis »). Versions figées à l'envoi (R7)." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Brouillons" value={quotes.filter((q) => q.status === "draft").length} />
        <StatCard label="En attente client" value={formatXAF(sum(["sent", "change_requested"]))} />
        <StatCard label="Acceptés" value={formatXAF(sum(["accepted"]))} tone="text-emerald-700" />
        <StatCard label="Taux d'acceptation" value={`${quotes.filter((q) => q.currentVersion > 0).length ? Math.round((quotes.filter((q) => q.status === "accepted").length / quotes.filter((q) => q.currentVersion > 0).length) * 100) : 0} %`} />
      </div>
      {quotes.length === 0 ? (
        <EmptyState title="Aucun devis" description="Ouvrez une demande dans le CRM et cliquez sur « Créer un devis »." />
      ) : (
        <div className="card divide-y divide-line">
          {quotes.map((q) => (
            <Link key={q.id} href={`/admin/devis/${q.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-paper">
              <span className="font-mono font-bold">{q.reference}</span>
              <QuoteStatusBadge status={q.status} />
              <span className="text-sm text-muted">{q.contact?.fullName} · {q.request?.reference}</span>
              <span className="ml-auto text-right">
                <span className="block font-bold">{formatXAF(computeQuoteTotals(q).totalTtc)}</span>
                <span className="block text-xs text-muted">v{q.currentVersion}{q.validUntil ? ` · valide → ${formatDate(q.validUntil)}` : ""}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
