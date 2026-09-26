"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowDown, ArrowUp, CalendarDays, Images, MapPin, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MediaPicker } from "@/components/admin/media";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, Panel, StatusBadge, Tabs } from "@/components/admin/ui";
import { slugify } from "@/components/admin/vehicle-form";
import { DynamicIcon } from "@/components/public/dynamic-icon";
import { Button, Field, cn } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { BusinessError, deleteContent, listEvents, mockDb, saveContent, staffById, updateEventDossier } from "@/lib/db/mock-backend";
import { formatDate, formatNumber, formatXAF } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { EventDossier, EventType, Package, Realisation, Service } from "@/lib/types";

type Tab = "dossiers" | "services" | "packages" | "reco" | "types" | "realisations";
const ICONS = ["Heart", "Cake", "Sparkles", "Briefcase", "Music", "GlassWater", "Bus", "Camera", "Car", "CarFront", "UserRound", "Plane", "Flower2", "Armchair", "Tent", "Speaker", "Lightbulb", "Video", "Users", "ShieldCheck", "ClipboardCheck", "UtensilsCrossed"];

export default function EventsAdminPage() {
  const user = useStaff();
  const [tab, setTab] = useState<Tab>("dossiers");
  const data = useLiveQuery(async () => ({
    events: await listEvents(),
    services: (await mockDb.services.toArray()).sort((a, b) => a.sortOrder - b.sortOrder),
    packages: await mockDb.packages.toArray(),
    recos: await mockDb.recommendations.toArray(),
    types: (await mockDb.eventTypes.toArray()).sort((a, b) => a.sortOrder - b.sortOrder),
    realisations: (await mockDb.realisations.toArray()).sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
    media: await mockDb.media.toArray(),
  }), []);
  const [dossier, setDossier] = useState<EventDossier | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [pack, setPack] = useState<Package | null>(null);
  const [type, setType] = useState<EventType | null>(null);
  const [real, setReal] = useState<Realisation | null>(null);
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState<string>();
  if (!can(user.roleId, "events.write")) return <Forbidden />;
  if (!data) return <Loading />;
  const { events, services, packages, recos, types, realisations } = data;
  const SERVICE_CATS = [["sc-mobilite", "Mobilité"], ["sc-deco", "Décoration & mobilier"], ["sc-technique", "Son, lumière & image"], ["sc-humain", "Personnel & coordination"]] as const;

  const newAction: Partial<Record<Tab, () => void>> = {
    services: () => setService({ id: crypto.randomUUID(), categoryId: "sc-mobilite", slug: "", name: "", description: "", unit: "forfait", priceVisible: true, icon: "Sparkles", sortOrder: services.length + 1, isActive: true }),
    packages: () => setPack({ id: crypto.randomUUID(), slug: "", name: "", description: "", priceVisible: true, items: [], status: "draft" }),
    types: () => setType({ id: crypto.randomUUID(), slug: "", name: "", tagline: "", description: "", icon: "Sparkles", sortOrder: types.length + 1, isActive: true }),
    realisations: () => setReal({ id: crypto.randomUUID(), slug: "", title: "", eventTypeId: types[0]?.id ?? "", city: "Pointe-Noire", eventDate: new Date().toISOString().slice(0, 10), description: "", serviceIds: [], palette: ["#fbe4ef", "#be185d"], images: [], status: "draft" }),
  };

  const save = async <T extends { id: string }>(table: Parameters<typeof saveContent>[0], row: T, label: string, close: () => void) => {
    setError(undefined);
    try {
      await saveContent(table, row, user.id, label);
      close();
    } catch (e) {
      setError(e instanceof BusinessError ? e.message : String(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Événementiel"
        description="Dossiers, catalogue de prestations, packages, recommandations (cross-selling) et réalisations."
        actions={newAction[tab] && <Button onClick={newAction[tab]}><Plus className="size-4" /> Ajouter</Button>}
      />
      <div className="mb-5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            ["dossiers", "Dossiers", events.length],
            ["services", "Prestations", services.length],
            ["packages", "Packages", packages.length],
            ["reco", "Recommandations"],
            ["types", "Types d'événements", types.length],
            ["realisations", "Réalisations", realisations.length],
          ]}
        />
      </div>

      {tab === "dossiers" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {events.map((e) => {
            const t = types.find((x) => x.id === e.eventTypeId);
            return (
              <div key={e.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-event-soft text-event"><DynamicIcon name={t?.icon ?? "Sparkles"} className="size-5" /></span>
                  {e.request && <StatusBadge status={e.request.status} />}
                </div>
                <Link href={`/admin/crm/${e.requestId}`} className="mt-3 block font-bold hover:underline">{e.title ?? t?.name}</Link>
                <p className="font-mono text-xs text-muted">{e.request?.reference} · {e.contact?.fullName}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />{e.eventDate ? formatDate(e.eventDate) : "Date à définir"}</span>
                  {e.city && <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{e.city}</span>}
                  {e.guestsCount ? <span className="inline-flex items-center gap-1"><Users className="size-4" />{formatNumber(e.guestsCount)}</span> : null}
                </div>
                <p className="mt-2 text-xs text-muted">{e.serviceIds.length} prestation(s) · Responsable : {staffById(e.request?.assignedTo)?.fullName ?? "—"}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setDossier(e)}><Pencil className="size-4" /> Modifier le dossier</Button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "services" && (
        <div className="space-y-6">
          <p className="text-sm text-muted">Une prestation désactivée disparaît du site et de l&apos;assistant « Créer mon événement » (§30).</p>
          {SERVICE_CATS.map(([catId, catName]) => (
            <Panel key={catId} title={catName}>
              <ul className="divide-y divide-line">
                {services.filter((s) => s.categoryId === catId).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 p-4">
                    <DynamicIcon name={s.icon} className="size-5 text-event" />
                    <div className="flex-1">
                      <p className={cn("font-semibold", !s.isActive && "text-muted line-through")}>{s.name}</p>
                      <p className="text-xs text-muted">{s.basePrice ? `${formatXAF(s.basePrice)} / ${s.unit}` : "Sur devis"}{s.priceVisible ? "" : " · prix masqué"}</p>
                    </div>
                    <Toggle on={s.isActive} label={s.name} onChange={() => save("services", { ...s, isActive: !s.isActive }, `${s.name} ${s.isActive ? "désactivée" : "activée"}`, () => undefined)} />
                    <button type="button" onClick={() => setService(s)} className="rounded-lg p-2 hover:bg-black/5" aria-label={`Modifier ${s.name}`}><Pencil className="size-4" /></button>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}

      {tab === "packages" && (
        <div className="grid gap-3 md:grid-cols-3">
          {packages.map((p) => (
            <div key={p.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{p.name}</p>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", p.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600")}>{p.status === "published" ? "Publié" : "Brouillon"}</span>
              </div>
              <p className="text-sm text-muted">{p.description}</p>
              <ul className="mt-3 flex-1 space-y-0.5 text-sm">
                {p.items.map((i) => <li key={i.serviceId}>{i.quantity} × {services.find((s) => s.id === i.serviceId)?.name}</li>)}
              </ul>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-extrabold">{p.price ? formatXAF(p.price) : "Sur devis"}</p>
                <div className="flex">
                  <button type="button" onClick={() => setPack(p)} className="rounded-lg p-2 hover:bg-black/5" aria-label="Modifier"><Pencil className="size-4" /></button>
                  <button type="button" onClick={() => confirm(`Supprimer le pack ${p.name} ?`) && deleteContent("packages", p.id, user.id, p.name)} className="rounded-lg p-2 text-muted hover:text-rose-600" aria-label="Supprimer"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "reco" && (
        <Panel title="Recommandations par type d'événement (cross-selling, R9)">
          <ul className="divide-y divide-line">
            {types.map((t) => {
              const list = recos.filter((r) => r.eventTypeId === t.id).sort((a, b) => a.sortOrder - b.sortOrder);
              const move = async (idx: number, dir: -1 | 1) => {
                const a = list[idx];
                const b = list[idx + dir];
                if (!a || !b) return;
                await saveContent("recommendations", { ...a, sortOrder: b.sortOrder }, user.id);
                await saveContent("recommendations", { ...b, sortOrder: a.sortOrder }, user.id);
              };
              return (
                <li key={t.id} className="space-y-2 p-4 text-sm">
                  <p className="font-semibold">{t.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((r, i) => (
                      <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-event-soft py-1 pr-1 pl-2.5 text-xs font-semibold text-event">
                        {r.serviceId ? services.find((s) => s.id === r.serviceId)?.name : `Pack ${packages.find((p) => p.id === r.packageId)?.name}`}
                        <button type="button" onClick={() => move(i, -1)} className="rounded-full p-0.5 hover:bg-white/60" aria-label="Monter"><ArrowUp className="size-3" /></button>
                        <button type="button" onClick={() => move(i, 1)} className="rounded-full p-0.5 hover:bg-white/60" aria-label="Descendre"><ArrowDown className="size-3" /></button>
                        <button type="button" onClick={() => deleteContent("recommendations", r.id, user.id)} className="rounded-full p-0.5 hover:bg-white/60" aria-label="Retirer"><X className="size-3" /></button>
                      </span>
                    ))}
                    <select
                      className="input h-8 w-56 py-0 text-xs"
                      value=""
                      aria-label={`Ajouter une recommandation pour ${t.name}`}
                      onChange={(e) => {
                        const [kind, id] = e.target.value.split(":");
                        if (!id) return;
                        void saveContent("recommendations", { id: crypto.randomUUID(), eventTypeId: t.id, serviceId: kind === "s" ? id : undefined, packageId: kind === "p" ? id : undefined, sortOrder: list.length + 1 }, user.id, t.name);
                      }}
                    >
                      <option value="">+ Ajouter…</option>
                      {services.filter((s) => s.isActive && !list.some((r) => r.serviceId === s.id)).map((s) => <option key={s.id} value={`s:${s.id}`}>{s.name}</option>)}
                      {packages.filter((p) => !list.some((r) => r.packageId === p.id)).map((p) => <option key={p.id} value={`p:${p.id}`}>Pack {p.name}</option>)}
                    </select>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {tab === "types" && (
        <div className="card divide-y divide-line">
          {types.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4 text-sm">
              <DynamicIcon name={t.icon} className="size-5 text-event" />
              <div className="flex-1">
                <p className={cn("font-semibold", !t.isActive && "text-muted line-through")}>{t.name} <span className="font-normal text-muted">/evenementiel/{t.slug}</span></p>
                <p className="text-xs text-muted">{t.tagline}</p>
              </div>
              <Toggle on={t.isActive} label={t.name} onChange={() => save("eventTypes", { ...t, isActive: !t.isActive }, t.name, () => undefined)} />
              <button type="button" onClick={() => setType(t)} className="rounded-lg p-2 hover:bg-black/5" aria-label={`Modifier ${t.name}`}><Pencil className="size-4" /></button>
            </div>
          ))}
        </div>
      )}

      {tab === "realisations" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {realisations.map((r) => (
            <div key={r.id} className="card overflow-hidden">
              <div className="relative h-32" style={{ background: `linear-gradient(135deg, ${r.palette[0]}, ${r.palette[1]})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- média local */}
                {r.images?.[0] && <img src={r.images[0].url} alt={r.images[0].alt} className="size-full object-cover" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{r.title}</p>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", r.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600")}>{r.status === "published" ? "Publiée" : "Brouillon"}</span>
                </div>
                <p className="text-sm text-muted">{types.find((t) => t.id === r.eventTypeId)?.name} · {r.city} · {formatDate(r.eventDate)} · {r.images?.length ?? 0} photo(s)</p>
                <div className="mt-2 flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setReal(r)}><Pencil className="size-4" /> Modifier</Button>
                  <Button size="sm" variant="ghost" className="text-muted" onClick={() => confirm(`Supprimer « ${r.title} » ?`) && deleteContent("realisations", r.id, user.id, r.title)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Dossier événement (§32) --- */}
      <Modal open={!!dossier} onClose={() => setDossier(null)} title="Dossier événement" wide>
        {dossier && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await updateEventDossier(dossier.id, dossier, user.id); setDossier(null); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Intitulé"><input className="input" value={dossier.title ?? ""} onChange={(e) => setDossier({ ...dossier, title: e.target.value })} /></Field>
              <Field label="Type"><select className="input" value={dossier.eventTypeId ?? ""} onChange={(e) => setDossier({ ...dossier, eventTypeId: e.target.value })}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
              <Field label="Date"><input className="input" type="date" value={dossier.eventDate ?? ""} onChange={(e) => setDossier({ ...dossier, eventDate: e.target.value || undefined })} /></Field>
              <Field label="Invités"><input className="input" type="number" min={0} value={dossier.guestsCount ?? ""} onChange={(e) => setDossier({ ...dossier, guestsCount: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Ville"><input className="input" value={dossier.city ?? ""} onChange={(e) => setDossier({ ...dossier, city: e.target.value })} /></Field>
              <Field label="Lieu / salle"><input className="input" value={dossier.venue ?? ""} onChange={(e) => setDossier({ ...dossier, venue: e.target.value })} /></Field>
              <Field label="Budget min. (FCFA)"><input className="input" type="number" min={0} value={dossier.budgetMin ?? ""} onChange={(e) => setDossier({ ...dossier, budgetMin: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Budget max. (FCFA)"><input className="input" type="number" min={0} value={dossier.budgetMax ?? ""} onChange={(e) => setDossier({ ...dossier, budgetMax: e.target.value ? Number(e.target.value) : undefined })} /></Field>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Prestations</p>
              <ServiceChecklist services={services} value={dossier.serviceIds} onChange={(ids) => setDossier({ ...dossier, serviceIds: ids })} />
            </div>
            <Field label="Notes internes"><textarea className="input min-h-20" value={dossier.notes ?? ""} onChange={(e) => setDossier({ ...dossier, notes: e.target.value })} /></Field>
            <Button type="submit" className="w-full">Enregistrer le dossier</Button>
          </form>
        )}
      </Modal>

      {/* --- Prestation --- */}
      <Modal open={!!service} onClose={() => setService(null)} title="Prestation">
        {service && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save("services", { ...service, slug: service.slug || slugify(service.name) }, service.name, () => setService(null)); }}>
            <Field label="Nom"><input className="input" value={service.name} onChange={(e) => setService({ ...service, name: e.target.value })} required /></Field>
            <Field label="Description"><textarea className="input min-h-20" value={service.description} onChange={(e) => setService({ ...service, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Catégorie"><select className="input" value={service.categoryId} onChange={(e) => setService({ ...service, categoryId: e.target.value })}>{SERVICE_CATS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></Field>
              <Field label="Icône"><select className="input" value={service.icon} onChange={(e) => setService({ ...service, icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></Field>
              <Field label="Prix de base (FCFA)"><input className="input" type="number" min={0} value={service.basePrice ?? ""} onChange={(e) => setService({ ...service, basePrice: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Unité"><input className="input" value={service.unit} onChange={(e) => setService({ ...service, unit: e.target.value })} /></Field>
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={service.priceVisible} onChange={(e) => setService({ ...service, priceVisible: e.target.checked })} /> Afficher le prix</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={service.isActive} onChange={(e) => setService({ ...service, isActive: e.target.checked })} /> Proposée</label>
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>

      {/* --- Package --- */}
      <Modal open={!!pack} onClose={() => setPack(null)} title="Package" wide>
        {pack && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save("packages", { ...pack, slug: pack.slug || slugify(pack.name) }, pack.name, () => setPack(null)); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nom"><input className="input" value={pack.name} onChange={(e) => setPack({ ...pack, name: e.target.value })} required /></Field>
              <Field label="Type d'événement"><select className="input" value={pack.eventTypeId ?? ""} onChange={(e) => setPack({ ...pack, eventTypeId: e.target.value || undefined })}><option value="">Tous</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
              <Field label="Prix (FCFA)"><input className="input" type="number" min={0} value={pack.price ?? ""} onChange={(e) => setPack({ ...pack, price: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Statut"><select className="input" value={pack.status} onChange={(e) => setPack({ ...pack, status: e.target.value as Package["status"] })}><option value="draft">Brouillon</option><option value="published">Publié</option><option value="archived">Archivé</option></select></Field>
            </div>
            <Field label="Description"><textarea className="input min-h-16" value={pack.description} onChange={(e) => setPack({ ...pack, description: e.target.value })} /></Field>
            <div>
              <p className="mb-1.5 text-sm font-medium">Contenu du pack</p>
              <div className="space-y-2">
                {pack.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="input h-9 w-20 py-1" type="number" min={1} value={it.quantity} onChange={(e) => setPack({ ...pack, items: pack.items.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)) })} aria-label="Quantité" />
                    <select className="input h-9 py-1" value={it.serviceId} onChange={(e) => setPack({ ...pack, items: pack.items.map((x, j) => (j === i ? { ...x, serviceId: e.target.value } : x)) })} aria-label="Prestation">
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setPack({ ...pack, items: pack.items.filter((_, j) => j !== i) })} className="rounded-lg p-2 text-muted hover:text-rose-600" aria-label="Retirer"><Trash2 className="size-4" /></button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setPack({ ...pack, items: [...pack.items, { serviceId: services[0].id, quantity: 1 }] })}><Plus className="size-4" /> Ajouter une prestation</Button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={pack.priceVisible} onChange={(e) => setPack({ ...pack, priceVisible: e.target.checked })} /> Afficher le prix</label>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>

      {/* --- Type d'événement --- */}
      <Modal open={!!type} onClose={() => setType(null)} title="Type d'événement">
        {type && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save("eventTypes", { ...type, slug: type.slug || slugify(type.name) }, type.name, () => setType(null)); }}>
            <Field label="Nom"><input className="input" value={type.name} onChange={(e) => setType({ ...type, name: e.target.value })} required /></Field>
            <Field label="Accroche"><input className="input" value={type.tagline} onChange={(e) => setType({ ...type, tagline: e.target.value })} /></Field>
            <Field label="Description (page publique)"><textarea className="input min-h-24" value={type.description} onChange={(e) => setType({ ...type, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Icône"><select className="input" value={type.icon} onChange={(e) => setType({ ...type, icon: e.target.value })}>{ICONS.map((i) => <option key={i}>{i}</option>)}</select></Field>
              <Field label="Ordre"><input className="input" type="number" value={type.sortOrder} onChange={(e) => setType({ ...type, sortOrder: Number(e.target.value) })} /></Field>
            </div>
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>

      {/* --- Réalisation (§35) --- */}
      <Modal open={!!real} onClose={() => setReal(null)} title="Réalisation" wide>
        {real && (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save("realisations", { ...real, slug: real.slug || slugify(real.title) }, real.title, () => setReal(null)); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Titre" className="sm:col-span-2"><input className="input" value={real.title} onChange={(e) => setReal({ ...real, title: e.target.value })} required /></Field>
              <Field label="Type"><select className="input" value={real.eventTypeId} onChange={(e) => setReal({ ...real, eventTypeId: e.target.value })}>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
              <Field label="Date"><input className="input" type="date" value={real.eventDate} onChange={(e) => setReal({ ...real, eventDate: e.target.value })} /></Field>
              <Field label="Ville"><input className="input" value={real.city} onChange={(e) => setReal({ ...real, city: e.target.value })} /></Field>
              <Field label="Invités"><input className="input" type="number" min={0} value={real.guests ?? ""} onChange={(e) => setReal({ ...real, guests: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              <Field label="Vidéo (lien YouTube « embed »)" className="sm:col-span-2"><input className="input" value={real.videoUrl ?? ""} placeholder="https://www.youtube.com/embed/…" onChange={(e) => setReal({ ...real, videoUrl: e.target.value || undefined })} /></Field>
            </div>
            <Field label="Description"><textarea className="input min-h-24" value={real.description} onChange={(e) => setReal({ ...real, description: e.target.value })} /></Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-sm font-medium">Photos</p>
                <Button size="sm" variant="outline" onClick={() => setPicker(true)}><Images className="size-4" /> Ajouter</Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(real.images ?? []).map((img, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element -- média local */}
                    <img src={img.url} alt={img.alt} className="size-full object-cover" />
                    <button type="button" onClick={() => setReal({ ...real, images: real.images!.filter((_, j) => j !== i) })} className="absolute top-1 right-1 rounded-full bg-white/90 p-1" aria-label="Retirer"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Prestations utilisées</p>
              <ServiceChecklist services={services} value={real.serviceIds} onChange={(ids) => setReal({ ...real, serviceIds: ids })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={real.status === "published"} onChange={(e) => setReal({ ...real, status: e.target.checked ? "published" : "draft" })} /> Publiée sur le site</label>
            <Button type="submit" className="w-full">Enregistrer</Button>
            <MediaPicker open={picker} onClose={() => setPicker(false)} tags={["réalisations", "événements"]} onPick={(m) => setReal({ ...real, images: [...(real.images ?? []), ...m.map((x) => ({ url: x.url, alt: x.alt }))] })} />
          </form>
        )}
      </Modal>
    </>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={`${on ? "Désactiver" : "Activer"} ${label}`} onClick={onChange} className={cn("relative h-6 w-11 shrink-0 rounded-full transition", on ? "bg-emerald-500" : "bg-zinc-300")}>
      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition", on ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

function ServiceChecklist({ services, value, onChange }: { services: Service[]; value: string[]; onChange: (ids: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {services.map((s) => {
        const on = value.includes(s.id);
        return (
          <button key={s.id} type="button" onClick={() => onChange(on ? value.filter((x) => x !== s.id) : [...value, s.id])} className={cn("rounded-full px-3 py-1 text-xs font-semibold", on ? "bg-event text-white" : "border border-line")}>
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
