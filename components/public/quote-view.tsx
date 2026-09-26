"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, MessageSquareWarning, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { BusinessError, ensureSeeded, getPublicQuote, respondToQuote, trackEvent } from "@/lib/db/mock-backend";
import { formatDate, formatDateTime, formatNumber, formatXAF } from "@/lib/format";
import type { BusinessSettings } from "@/lib/types";
import { formatPhone } from "@/lib/phone";
import { Button, EmptyState, Field, Spinner } from "../ui";
import { CallButton, WhatsAppButton } from "./contact-links";

/** Devis sans compte (§34, R7) : consulter, accepter, demander une modification, contacter. */
export function QuoteView({ token, settings, whatsappNumber, phoneNumber }: { token: string; settings: BusinessSettings; whatsappNumber: string; phoneNumber: string }) {
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"none" | "accept" | "change">("none");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ensureSeeded().then(() => {
      setReady(true);
      void trackEvent("quote_view");
    });
  }, []);
  const view = useLiveQuery(() => (ready ? getPublicQuote(token).then((v) => v ?? null) : undefined), [token, ready]);

  if (view === undefined) return <div className="grid h-64 place-items-center"><Spinner className="size-6" /></div>;
  if (view === null) return <EmptyState title="Devis introuvable" description="Ce lien n'est pas valide ou le devis n'a pas encore été envoyé." />;

  const q = view.quote;
  const open = (view.status === "sent" || view.status === "change_requested") && !view.expired;

  const respond = async (action: "accept" | "request_change") => {
    setError(undefined);
    if (action === "accept" && (!name.trim() || !agree)) return setError("Indiquez votre nom et cochez la case d'acceptation.");
    setBusy(true);
    try {
      await respondToQuote(token, action, name, message);
      if (action === "accept") void trackEvent("quote_accept");
      setMode("none");
    } catch (e) {
      setError(e instanceof BusinessError ? e.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {view.status === "accepted" && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="size-6 shrink-0" />
          <p className="text-sm"><strong>Devis accepté</strong> par {view.acceptedByName} le {formatDateTime(view.acceptedAt)}. Votre conseiller vous contacte pour la suite.</p>
        </div>
      )}
      {view.status === "change_requested" && (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800">
          <MessageSquareWarning className="size-6 shrink-0" />
          <p className="text-sm">Votre demande de modification a été transmise. Une nouvelle version vous sera envoyée.</p>
        </div>
      )}
      {view.status === "draft" && (
        <p className="rounded-2xl bg-sky-50 p-4 text-sm text-sky-800">Une nouvelle version de ce devis est en préparation. Vous recevrez le lien mis à jour.</p>
      )}
      {view.expired && view.status !== "accepted" && (
        <p className="rounded-2xl bg-zinc-100 p-4 text-sm">Ce devis a expiré le {formatDate(q.validUntil)}. Contactez-nous pour une nouvelle proposition.</p>
      )}

      <article className="card overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-4 bg-ink p-6 text-white">
          <div>
            <p className="text-lg font-extrabold">{settings.company.name}</p>
            <p className="text-xs text-white/60">{settings.company.address}, {settings.company.city}</p>
            <p className="text-xs text-white/60">{formatPhone(settings.contactPhones.default)} · {settings.company.email}</p>
          </div>
          <div className="text-right">
            <p className="eyebrow text-gold">Devis</p>
            <p className="font-mono text-xl font-bold">{q.reference}</p>
            <p className="text-xs text-white/60">Version {q.version} · valable jusqu&apos;au {formatDate(q.validUntil)}</p>
          </div>
        </header>
        <div className="p-6">
          <p className="text-sm text-muted">Client</p>
          <p className="font-semibold">{view.clientName}</p>
          {view.requestReference && <p className="text-xs text-muted">Demande {view.requestReference}</p>}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted uppercase">
                  <th className="py-2 font-semibold">Prestation</th>
                  <th className="py-2 text-right font-semibold">Qté</th>
                  <th className="py-2 text-right font-semibold">Prix unitaire</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {q.items.map((i, idx) => (
                  <tr key={idx} className="border-b border-line/70">
                    <td className="py-3 pr-3">
                      {i.label}
                      {i.discount > 0 && <span className="block text-xs text-emerald-700">Remise : –{formatXAF(i.discount)}</span>}
                    </td>
                    <td className="py-3 text-right">{formatNumber(i.quantity)}</td>
                    <td className="py-3 text-right whitespace-nowrap">{formatXAF(i.unitPrice)}</td>
                    <td className="py-3 text-right font-semibold whitespace-nowrap">{formatXAF(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
            <Row label="Sous-total" value={formatXAF(q.subtotal)} />
            {q.discount > 0 && <Row label="Remise" value={`–${formatXAF(q.discount)}`} />}
            {q.fees > 0 && <Row label="Frais" value={formatXAF(q.fees)} />}
            <Row label="Total HT" value={formatXAF(q.totalHt)} />
            {q.taxRate > 0 && <Row label={`Taxes (${q.taxRate} %)`} value={formatXAF(q.taxAmount)} />}
            <div className="flex justify-between border-t border-ink pt-2 text-base font-extrabold">
              <dt>Total {q.taxRate > 0 ? "TTC" : ""}</dt>
              <dd>{formatXAF(q.totalTtc)}</dd>
            </div>
          </dl>
          {q.clientNote && <p className="mt-6 rounded-xl bg-paper p-4 text-sm text-zinc-700">{q.clientNote}</p>}
        </div>
      </article>

      <div className="no-print space-y-3">
        {open && mode === "none" && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="gold" size="lg" onClick={() => setMode("accept")}>Accepter le devis</Button>
            <Button variant="outline" size="lg" onClick={() => setMode("change")}>Demander une modification</Button>
          </div>
        )}
        {mode === "accept" && (
          <div className="card space-y-4 p-5">
            <Field label="Votre nom complet">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 accent-ink" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              J&apos;accepte le devis {q.reference} (version {q.version}) d&apos;un montant de {formatXAF(q.totalTtc)}.
            </label>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button variant="gold" onClick={() => respond("accept")} disabled={busy}>{busy && <Spinner />} Confirmer l&apos;acceptation</Button>
              <Button variant="ghost" onClick={() => setMode("none")}>Annuler</Button>
            </div>
          </div>
        )}
        {mode === "change" && (
          <div className="card space-y-4 p-5">
            <Field label="Quelle modification souhaitez-vous ?">
              <textarea className="input min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. ajouter un minibus, retirer la décoration…" />
            </Field>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={() => respond("request_change")} disabled={busy || !message.trim()}>{busy && <Spinner />} Envoyer</Button>
              <Button variant="ghost" onClick={() => setMode("none")}>Annuler</Button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <WhatsAppButton number={whatsappNumber} message={`Bonjour, j'ai une question sur le devis ${q.reference}.`} label="WhatsApp" pole="event" />
          <CallButton number={phoneNumber} pole="event" />
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> PDF</Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
