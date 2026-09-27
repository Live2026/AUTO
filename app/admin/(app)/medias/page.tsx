"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Copy, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { UploadButton } from "@/components/admin/media";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading } from "@/components/admin/ui";
import { Button, EmptyState, Field, cn } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { deleteMedia, mockDb, updateMedia } from "@/lib/db/mock-backend";
import { formatDateTime, formatNumber } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { MediaAsset } from "@/lib/types";

const TAGS = ["véhicules", "location", "événements", "réalisations", "bannières", "logos"];

/** Médiathèque centralisée (§49). */
export default function MediaPage() {
  const user = useStaff();
  const media = useLiveQuery(() => mockDb.media.orderBy("createdAt").reverse().toArray(), []);
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  if (!can(user.roleId, "media.write")) return <Forbidden />;
  if (!media) return <Loading />;
  const list = media.filter((m) => (!tag || m.tags.includes(tag)) && (!q || `${m.name} ${m.alt}`.toLowerCase().includes(q.toLowerCase())));
  const total = media.reduce((s, m) => s + m.sizeBytes, 0);

  return (
    <>
      <PageHeader
        title="Médiathèque"
        description={`${media.length} média(s) · ${formatNumber(Math.round(total / 1024))} Ko — images compressées automatiquement (WebP, 1600 px).`}
        actions={<UploadButton tags={tag ? [tag] : []} onUploaded={() => undefined} label="Téléverser des images" />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Nom, texte alternatif…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        {["", ...TAGS].map((t) => (
          <button key={t || "all"} type="button" onClick={() => setTag(t)} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", tag === t ? "bg-ink text-white" : "border border-line bg-white")}>
            {t || "Tous"}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState title="Aucun média" description="Téléversez les photos des véhicules, des événements, vos logos et bannières. Elles seront réutilisables partout." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((m) => (
            <button key={m.id} type="button" onClick={() => setEditing(m)} className="card group overflow-hidden text-left">
              <div className="aspect-[4/3] overflow-hidden bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element -- média local */}
                <img src={m.url} alt={m.alt} className="size-full object-cover transition group-hover:scale-105" />
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="truncate text-xs text-muted">{m.width}×{m.height} · {formatNumber(Math.round(m.sizeBytes / 1024))} Ko</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Média">
        {editing && (
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- média local */}
            <img src={editing.url} alt={editing.alt} className="max-h-72 w-full rounded-xl object-contain bg-paper" />
            <Field label="Nom"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
            <Field label="Texte alternatif (accessibilité, SEO)"><input className="input" value={editing.alt} onChange={(e) => setEditing({ ...editing, alt: e.target.value })} /></Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">Étiquettes</p>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map((t) => {
                  const on = editing.tags.includes(t);
                  return (
                    <button key={t} type="button" onClick={() => setEditing({ ...editing, tags: on ? editing.tags.filter((x) => x !== t) : [...editing.tags, t] })} className={cn("rounded-full px-3 py-1 text-xs font-semibold", on ? "bg-gold text-ink" : "border border-line")}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-muted">Ajouté le {formatDateTime(editing.createdAt)}</p>
            <div className="flex flex-wrap justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="ghost" className="text-rose-600" onClick={async () => { if (confirm("Supprimer ce média ?")) { await deleteMedia(editing.id, user.id); setEditing(null); } }}>
                  <Trash2 className="size-4" /> Supprimer
                </Button>
                <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(editing.url)}><Copy className="size-4" /> Copier</Button>
              </div>
              <Button onClick={async () => { await updateMedia(editing, user.id); setEditing(null); }}>Enregistrer</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
