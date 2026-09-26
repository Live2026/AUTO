"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Check, ImagePlus, Search } from "lucide-react";
import { useState } from "react";
import { addMedia, mockDb } from "@/lib/db/mock-backend";
import type { MediaAsset } from "@/lib/types";
import { Button, cn } from "../ui";
import { Modal } from "../ui/modal";
import { useStaff } from "./shell";

/** Compression navigateur avant envoi (US4.3) : WebP, 1600 px max — économise la data mobile. */
export async function compressImage(file: File, max = 1600): Promise<{ url: string; width: number; height: number; size: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/webp", 0.8);
  return { url, width: canvas.width, height: canvas.height, size: Math.round((url.length * 3) / 4) };
}

/** Envoie des fichiers dans la médiathèque et retourne les médias créés. */
export async function uploadToLibrary(files: File[], actorId: string, tags: string[] = [], alt = ""): Promise<MediaAsset[]> {
  const out: MediaAsset[] = [];
  for (const f of files.filter((x) => x.type.startsWith("image/"))) {
    const img = await compressImage(f);
    out.push(
      await addMedia(
        { name: f.name.replace(/\.[^.]+$/, ""), url: img.url, mimeType: "image/webp", width: img.width, height: img.height, sizeBytes: img.size, alt: alt || f.name.replace(/\.[^.]+$/, ""), tags },
        actorId,
      ),
    );
  }
  return out;
}

export function UploadButton({ onUploaded, tags, alt, label = "Téléverser", multiple = true }: { onUploaded: (m: MediaAsset[]) => void; tags?: string[]; alt?: string; label?: string; multiple?: boolean }) {
  const user = useStaff();
  const [busy, setBusy] = useState(false);
  return (
    <label className={cn("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-sm font-semibold hover:border-ink/40", busy && "opacity-60")}>
      <ImagePlus className="size-4" /> {busy ? "Envoi…" : label}
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!files.length) return;
          setBusy(true);
          try {
            onUploaded(await uploadToLibrary(files, user.id, tags, alt));
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}

/** Sélecteur de médias (depuis la médiathèque ou nouvel envoi). */
export function MediaPicker({ open, onClose, onPick, multiple = true, tags }: { open: boolean; onClose: () => void; onPick: (m: MediaAsset[]) => void; multiple?: boolean; tags?: string[] }) {
  const media = useLiveQuery(() => mockDb.media.orderBy("createdAt").reverse().toArray(), []);
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const list = (media ?? []).filter((m) => !q || `${m.name} ${m.alt} ${m.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal open={open} onClose={onClose} title="Médiathèque" wide>
      <div className="mb-3 flex flex-wrap gap-2">
        <label className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input className="input h-9 py-1 pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <UploadButton tags={tags} onUploaded={(m) => setSelected((s) => (multiple ? [...s, ...m.map((x) => x.id)] : [m[0]?.id].filter(Boolean) as string[]))} />
      </div>
      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">La médiathèque est vide : téléversez vos premières images.</p>
      ) : (
        <div className="grid max-h-[55vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {list.map((m) => {
            const on = selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected((s) => (on ? s.filter((x) => x !== m.id) : multiple ? [...s, m.id] : [m.id]))}
                className={cn("relative aspect-square overflow-hidden rounded-xl ring-2 transition", on ? "ring-gold" : "ring-transparent")}
                aria-pressed={on}
                aria-label={m.alt}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- média local (data URL en démo) */}
                <img src={m.url} alt={m.alt} className="size-full object-cover" />
                {on && <span className="absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full bg-gold text-ink"><Check className="size-4" /></span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button
          disabled={selected.length === 0}
          onClick={() => {
            onPick((media ?? []).filter((m) => selected.includes(m.id)));
            setSelected([]);
            onClose();
          }}
        >
          Choisir ({selected.length})
        </Button>
      </div>
    </Modal>
  );
}
