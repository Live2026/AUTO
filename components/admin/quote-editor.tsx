"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Copy, ExternalLink, Lock, Plus, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { BusinessError, getQuote, listServices, mockDb, reviseQuote, saveQuote, sendQuote } from "@/lib/db/mock-backend";
import { formatDate, formatDateTime, formatXAF } from "@/lib/format";
import { can } from "@/lib/permissions";
import { computeQuoteTotals, lineTotal } from "@/lib/rules/quote";
import type { Quote, QuoteItem } from "@/lib/types";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button, Field, buttonClass } from "../ui";
import { PageHeader, useStaff } from "./shell";
import { Loading, QuoteStatusBadge } from "./ui";

export function QuoteEditor({ id }: { id: string }) {
  const quote = useLiveQuery(() => getQuote(id).then((q) => q ?? null), [id]);
  if (quote === undefined) return <Loading />;
  if (quote === null) return <p>Devis introuvable.</p>;
  return <Editor key={`${quote.id}-${quote.status}-${quote.currentVersion}`} initial={quote} />;
}

function Editor({ initial }: { initial: Quote }) {
  const user = useStaff();
  const [q, setQ] = useState<Quote>(initial);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const services = useLiveQuery(() => listServices(), []);
  const ctx = useLiveQuery(async () => {
    const request = await mockDb.requests.get(initial.requestId);
    const contact = request ? await mockDb.contacts.get(request.contactId) : undefined;
    return { request, contact };
  }, [initial.requestId]);

  const editable = (q.status === "draft" || q.status === "change_requested") && can(user.roleId, "quotes.write");
  const totals = computeQuoteTotals(q);
  const url = typeof location !== "undefined" ? `${location.origin}/devis/${q.publicToken}` : "";
  const setItem = (itemId: string, patch: Partial<QuoteItem>) => setQ({ ...q, items: q.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
  const addItem = (item?: Partial<QuoteItem>) =>
    setQ({ ...q, items: [...q.items, { id: crypto.randomUUID(), label: "", quantity: 1, unitPrice: 0, discountAmount: 0, sortOrder: q.items.length + 1, ...item }] });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setError(undefined);
    setNotice(undefined);
    try {
      await fn();
      setNotice(ok);
    } catch (e) {
      setError(e instanceof BusinessError ? e.message : String(e));
    }
  };

  return (
    <>
      <Link href="/admin/devis" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Devis</Link>
      <PageHeader
        title={`Devis ${q.reference}`}
        description={`Demande ${ctx?.request?.reference ?? ""} · ${ctx?.contact?.fullName ?? ""} · version ${q.currentVersion}${q.status === "draft" && q.currentVersion > 0 ? ` (révision → v${q.currentVersion + 1})` : ""}`}
        actions={
          <>
            <QuoteStatusBadge status={q.status} />
            {editable && <Button variant="outline" size="sm" onClick={() => run(() => saveQuote(q, user.id), "Brouillon enregistré ✓")}>Enregistrer</Button>}
            {editable && (
              <Button size="sm" variant="gold" onClick={() => run(async () => { await saveQuote(q, user.id); await sendQuote(q.id, user.id); }, "Devis envoyé : version figée, lien client actif ✓")}>
                <Send className="size-4" /> Émettre le devis
              </Button>
            )}
            {!editable && q.status !== "accepted" && can(user.roleId, "quotes.write") && (
              <Button size="sm" variant="outline" onClick={() => run(() => reviseQuote(q.id, user.id), "Devis en révision")}>Réviser (nouvelle version)</Button>
            )}
          </>
        }
      />
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      {notice && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</p>}
      {q.changeRequestMessage && <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800"><strong>Modification demandée par le client :</strong> {q.changeRequestMessage}</p>}
      {!editable && (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-paper px-4 py-3 text-sm"><Lock className="size-4" /> Version figée. {q.status === "accepted" ? `Accepté par ${q.acceptedByName} le ${formatDateTime(q.acceptedAt)}.` : "Cliquez sur « Réviser » pour préparer une nouvelle version."}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line bg-paper text-left text-xs text-muted uppercase">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Prestation</th>
                  <th className="w-20 px-3 py-2.5 text-right font-semibold">Qté</th>
                  <th className="w-36 px-3 py-2.5 text-right font-semibold">Prix unitaire</th>
                  <th className="w-32 px-3 py-2.5 text-right font-semibold">Remise</th>
                  <th className="w-32 px-3 py-2.5 text-right font-semibold">Total</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {q.items.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2"><input className="input h-9 py-1" disabled={!editable} value={i.label} onChange={(e) => setItem(i.id, { label: e.target.value })} /></td>
                    <td className="px-3 py-2"><input className="input h-9 py-1 text-right" type="number" min={0} step="any" disabled={!editable} value={i.quantity} onChange={(e) => setItem(i.id, { quantity: Number(e.target.value) })} /></td>
                    <td className="px-3 py-2"><input className="input h-9 py-1 text-right" type="number" min={0} disabled={!editable} value={i.unitPrice} onChange={(e) => setItem(i.id, { unitPrice: Number(e.target.value) })} /></td>
                    <td className="px-3 py-2"><input className="input h-9 py-1 text-right" type="number" min={0} disabled={!editable} value={i.discountAmount} onChange={(e) => setItem(i.id, { discountAmount: Number(e.target.value) })} /></td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{formatXAF(lineTotal(i))}</td>
                    <td className="px-2">
                      {editable && (
                        <button type="button" onClick={() => setQ({ ...q, items: q.items.filter((x) => x.id !== i.id) })} className="rounded-lg p-1.5 text-muted hover:text-rose-600" aria-label="Supprimer la ligne">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editable && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">
              <Button size="sm" variant="outline" onClick={() => addItem()}><Plus className="size-4" /> Ligne libre</Button>
              <select
                className="input h-9 max-w-64 py-1"
                value=""
                onChange={(e) => {
                  const s = services?.find((x) => x.id === e.target.value);
                  if (s) addItem({ label: s.name, serviceId: s.id, unitPrice: s.basePrice ?? 0 });
                }}
                aria-label="Ajouter une prestation du catalogue"
              >
                <option value="">+ Prestation du catalogue…</option>
                {services?.filter((s) => s.isActive).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.basePrice ? ` — ${formatXAF(s.basePrice)}` : ""}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Remise globale"><input className="input" type="number" min={0} disabled={!editable} value={q.discountAmount} onChange={(e) => setQ({ ...q, discountAmount: Number(e.target.value) })} /></Field>
              <Field label="Frais"><input className="input" type="number" min={0} disabled={!editable} value={q.feesAmount} onChange={(e) => setQ({ ...q, feesAmount: Number(e.target.value) })} /></Field>
              <Field label="Taxe (%)" hint="À valider avec le client (Q20)."><input className="input" type="number" min={0} step="0.01" disabled={!editable} value={q.taxRate} onChange={(e) => setQ({ ...q, taxRate: Number(e.target.value) })} /></Field>
              <Field label="Valable jusqu'au"><input className="input" type="date" disabled={!editable} value={q.validUntil ?? ""} onChange={(e) => setQ({ ...q, validUntil: e.target.value || undefined })} /></Field>
            </div>
            <Field label="Note au client"><textarea className="input min-h-32" disabled={!editable} value={q.clientNote ?? ""} onChange={(e) => setQ({ ...q, clientNote: e.target.value })} /></Field>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card space-y-1.5 p-4 text-sm">
            <Line label="Sous-total" value={formatXAF(totals.subtotal)} />
            <Line label="Remise" value={`–${formatXAF(totals.discount)}`} />
            <Line label="Frais" value={formatXAF(totals.fees)} />
            <Line label="Total HT" value={formatXAF(totals.totalHt)} />
            <Line label={`Taxe (${totals.taxRate} %)`} value={formatXAF(totals.taxAmount)} />
            <div className="flex justify-between border-t border-ink pt-2 text-lg font-extrabold">
              <span>Total TTC</span>
              <span>{formatXAF(totals.totalTtc)}</span>
            </div>
          </div>
          {q.currentVersion > 0 && (
            <div className="card space-y-3 p-4">
              <p className="text-sm font-bold">Lien client sécurisé</p>
              <p className="truncate rounded-lg bg-paper px-3 py-2 font-mono text-xs">{url}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={buttonClass("outline", "sm")} onClick={() => navigator.clipboard?.writeText(url)}><Copy className="size-4" /> Copier</button>
                <a className={buttonClass("whatsapp", "sm")} target="_blank" rel="noopener noreferrer" href={buildWhatsAppLink(ctx?.contact?.whatsappE164 ?? ctx?.contact?.phoneE164 ?? "", `Bonjour ${ctx?.contact?.fullName ?? ""}, voici votre devis ${q.reference} de BRYAN MULTISERVICES : ${url}`)}>
                  <Send className="size-4" /> WhatsApp
                </a>
                <a className={buttonClass("ghost", "sm")} href={`/devis/${q.publicToken}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /> Voir</a>
              </div>
            </div>
          )}
          {q.versions.length > 0 && (
            <div className="card p-4">
              <p className="mb-2 text-sm font-bold">Versions émises</p>
              <ul className="space-y-1.5 text-sm">
                {[...q.versions].reverse().map((v) => (
                  <li key={v.version} className="flex justify-between">
                    <span>v{v.version} · {formatDateTime(v.sentAt)}</span>
                    <span className="font-semibold">{formatXAF(v.snapshot.totalTtc)}</span>
                  </li>
                ))}
              </ul>
              {q.validUntil && <p className="mt-2 text-xs text-muted">Validité : {formatDate(q.validUntil)}</p>}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
