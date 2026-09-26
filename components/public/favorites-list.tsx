"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Heart, Trash2 } from "lucide-react";
import { publicDb } from "@/lib/db/public-db";
import { formatXAF } from "@/lib/format";
import { EmptyState, LinkButton } from "../ui";

export function FavoritesList() {
  const items = useLiveQuery(() => publicDb.favorites.orderBy("addedAt").reverse().toArray(), []);
  if (!items) return null;
  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun favori pour le moment"
        description="Touchez le cœur sur un véhicule pour le retrouver ici. Vos favoris restent sur ce téléphone, sans compte."
        action={<LinkButton href="/vehicules" variant="gold">Voir les véhicules</LinkButton>}
      />
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((f) => (
        <li key={f.id} className="card flex items-center gap-4 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: f.colorHex ?? "#eee" }}>
            <Heart className="size-5 fill-white text-white mix-blend-difference" />
          </span>
          <Link href={f.kind === "rental" ? `/location/${f.slug}` : `/vehicules/${f.slug}`} className="min-w-0 flex-1">
            <p className="truncate font-bold">{f.title}</p>
            <p className="truncate text-sm text-muted">{f.subtitle}{f.price ? ` · ${formatXAF(f.price)}` : ""}</p>
          </Link>
          <button type="button" onClick={() => publicDb.favorites.delete(f.id)} className="rounded-lg p-2 text-muted hover:bg-black/5 hover:text-rose-600" aria-label="Retirer">
            <Trash2 className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MyRequestsList() {
  const items = useLiveQuery(() => publicDb.myRequests.orderBy("createdAt").reverse().toArray(), []);
  const queued = useLiveQuery(() => publicDb.outbox.count(), []);
  if (!items) return null;
  return (
    <div className="space-y-4">
      {!!queued && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{queued} demande(s) en attente d&apos;envoi (hors-ligne).</p>}
      {items.length === 0 ? (
        <EmptyState title="Aucune demande depuis cet appareil" description="Les demandes envoyées depuis ce téléphone apparaissent ici, avec leur lien de suivi." />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.reference} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-mono font-bold">{r.reference}</p>
                <p className="text-sm text-muted">{r.summary} · {new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
              </div>
              <LinkButton href={`/suivi/${r.trackingToken}`} variant="outline" size="sm">Suivre</LinkButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
