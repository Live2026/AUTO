"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteContent, mockDb, saveContent } from "@/lib/db/mock-backend";
import type { VehicleCategory } from "@/lib/types";
import { Button, Field } from "../ui";
import { Modal } from "../ui/modal";
import { slugify } from "./vehicle-form";
import { useStaff } from "./shell";
import { Loading } from "./ui";

/** Catégories de véhicules (§14) — vente et/ou location. */
export function CategoriesManager() {
  const user = useStaff();
  const data = useLiveQuery(async () => ({ cats: (await mockDb.categories.toArray()).sort((a, b) => a.sortOrder - b.sortOrder), vehicles: await mockDb.vehicles.toArray() }), []);
  const [editing, setEditing] = useState<VehicleCategory | null>(null);
  const [error, setError] = useState<string>();
  if (!data) return <Loading />;
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing({ id: crypto.randomUUID(), slug: "", name: "", forSale: true, forRent: true, sortOrder: data.cats.length + 1 })}>
          <Plus className="size-4" /> Nouvelle catégorie
        </Button>
      </div>
      <div className="card divide-y divide-line">
        {data.cats.map((c) => {
          const count = data.vehicles.filter((v) => v.categoryId === c.id).length;
          return (
            <div key={c.id} className="flex items-center gap-3 p-4 text-sm">
              <span className="w-8 text-muted">{c.sortOrder}</span>
              <span className="flex-1">
                <span className="font-semibold">{c.name}</span> <span className="text-muted">/{c.slug}</span>
              </span>
              <span className="text-xs text-muted">{[c.forSale && "Vente", c.forRent && "Location"].filter(Boolean).join(" · ")}</span>
              <span className="w-24 text-right text-xs text-muted">{count} véhicule(s)</span>
              <button type="button" className="rounded-lg p-2 hover:bg-black/5" onClick={() => setEditing(c)} aria-label={`Modifier ${c.name}`}><Pencil className="size-4" /></button>
              <button
                type="button"
                className="rounded-lg p-2 text-muted hover:bg-black/5 hover:text-rose-600 disabled:opacity-30"
                disabled={count > 0}
                title={count > 0 ? "Catégorie utilisée : réaffectez d'abord les véhicules" : "Supprimer"}
                onClick={() => confirm(`Supprimer la catégorie ${c.name} ?`) && deleteContent("categories", c.id, user.id, c.name)}
                aria-label={`Supprimer ${c.name}`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Catégorie">
        {editing && (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const slug = editing.slug || slugify(editing.name);
              if (data.cats.some((c) => c.slug === slug && c.id !== editing.id)) return setError("Cette URL est déjà utilisée.");
              await saveContent("categories", { ...editing, slug }, user.id, editing.name);
              setEditing(null);
              setError(undefined);
            }}
          >
            <Field label="Nom"><input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></Field>
            <Field label="URL" hint={`/vehicules?category=${editing.slug || slugify(editing.name)}`}><input className="input" value={editing.slug} placeholder={slugify(editing.name)} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} /></Field>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={editing.forSale} onChange={(e) => setEditing({ ...editing, forSale: e.target.checked })} /> Vente</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={editing.forRent} onChange={(e) => setEditing({ ...editing, forRent: e.target.checked })} /> Location</label>
            </div>
            <Field label="Ordre d'affichage"><input className="input" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></Field>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>
    </>
  );
}
