"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { ensureSeeded, getRequestTracking } from "@/lib/db/mock-backend";
import { formatDateTime } from "@/lib/format";
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from "@/lib/labels";
import type { RequestStatus } from "@/lib/types";
import { EmptyState, LinkButton, Spinner, cn } from "../ui";

const STEPS: { status: RequestStatus[]; label: string; next: string }[] = [
  { status: ["new", "to_contact"], label: "Demande reçue", next: "Un conseiller va vous contacter très prochainement." },
  { status: ["contacted", "in_discussion"], label: "En cours d'échange", next: "Votre conseiller affine votre besoin avec vous." },
  { status: ["offer_sent", "waiting_client"], label: "Offre / devis envoyé", next: "Consultez votre devis et donnez-nous votre réponse." },
  { status: ["confirmed"], label: "Confirmée", next: "Tout est validé : nous préparons la suite." },
  { status: ["completed"], label: "Réalisée", next: "Merci pour votre confiance !" },
];

/** Suivi sans compte (§10) — accès par jeton aléatoire, jamais par la seule référence. */
export function TrackingView({ token }: { token: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void ensureSeeded().then(() => setReady(true));
  }, []);
  const data = useLiveQuery(() => (ready ? getRequestTracking(token).then((d) => d ?? null) : undefined), [token, ready]);

  if (data === undefined) return <div className="grid h-48 place-items-center"><Spinner className="size-6" /></div>;
  if (data === null) return <EmptyState title="Lien de suivi invalide" description="Vérifiez le lien reçu ou contactez-nous avec votre référence." />;

  const closed = data.status === "cancelled" || data.status === "lost";
  const current = STEPS.findIndex((s) => s.status.includes(data.status));

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <p className="text-sm text-muted">{REQUEST_TYPE_LABELS[data.type]} · envoyée le {formatDateTime(data.createdAt)}</p>
        <p className="mt-1 font-mono text-2xl font-bold">{data.reference}</p>
        {data.vehicle && <p className="mt-1 text-sm">{data.vehicle.brand} {data.vehicle.model} {data.vehicle.year}</p>}
        <p className="mt-3 inline-flex rounded-full bg-paper px-3 py-1 text-sm font-semibold">{REQUEST_STATUS_LABELS[data.status]}</p>
      </div>
      {closed ? (
        <p className="card p-5 text-sm">Cette demande est clôturée. Pour toute nouvelle demande, contactez-nous.</p>
      ) : (
        <ol className="card space-y-0 p-5">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className={cn("grid size-7 place-items-center rounded-full text-xs font-bold", i <= current ? "bg-emerald-600 text-white" : "bg-line text-muted")}>
                  {i < current ? <Check className="size-4" /> : i + 1}
                </span>
                {i < STEPS.length - 1 && <span className={cn("my-1 w-0.5 flex-1", i < current ? "bg-emerald-600" : "bg-line")} />}
              </div>
              <div className="pb-5">
                <p className={cn("font-semibold", i > current && "text-muted")}>{s.label}</p>
                {i === current && <p className="text-sm text-muted">Prochaine étape : {s.next}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
      {data.quoteToken && (
        <LinkButton href={`/devis/${data.quoteToken}`} variant="gold" size="lg" className="w-full"><FileText className="size-5" /> Voir mon devis</LinkButton>
      )}
    </div>
  );
}
