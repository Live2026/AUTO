"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Images, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { MediaPicker } from "@/components/admin/media";
import { QrCodeCard } from "@/components/admin/qr-code";
import { Forbidden, PageHeader, useStaff } from "@/components/admin/shell";
import { Loading, Panel, Tabs } from "@/components/admin/ui";
import { Button, Field, cn } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { deleteContent, mockDb, saveContent } from "@/lib/db/mock-backend";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { Banner, BannerPlacement, Promotion, PromotionKind, PromotionScope } from "@/lib/types";

const SCOPE: Record<PromotionScope, [string, string]> = {
  sale: ["Automobile", "bg-gold-soft text-[#7a5f0c]"],
  rental: ["Location", "bg-rent-soft text-rent"],
  event: ["Événementiel", "bg-event-soft text-event"],
};
const KIND: Record<PromotionKind, string> = { percent: "Remise en %", amount: "Remise en FCFA", fixed_price: "Prix spécial", label: "Libellé seul" };
const PLACEMENT: Record<BannerPlacement, string> = {
  home_strip: "Accueil — bandeau",
  home_hero: "Accueil — grande bannière",
  vehicles: "Page véhicules",
  rental: "Page location",
  events: "Page événementiel",
};

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");
const fromDateInput = (d: string, end = false) => (d ? new Date(`${d}T${end ? "23:59:59" : "00:00:00"}`).toISOString() : undefined);

function isLive(p: { isActive: boolean; startsAt?: string; endsAt?: string }, now: number) {
  return p.isActive && (!p.startsAt || Date.parse(p.startsAt) <= now) && (!p.endsAt || Date.parse(p.endsAt) > now);
}

export default function MarketingPage() {
  const user = useStaff();
  const [tab, setTab] = useState<"promotions" | "banners" | "qr">("promotions");
  const data = useLiveQuery(async () => ({
    promotions: await mockDb.promotions.toArray(),
    banners: (await mockDb.banners.toArray()).sort((a, b) => a.sortOrder - b.sortOrder),
    vehicles: await mockDb.vehicles.toArray(),
    services: await mockDb.services.toArray(),
    packages: await mockDb.packages.toArray(),
    media: await mockDb.media.toArray(),
  }), []);
  const [promo, setPromo] = useState<Promotion | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [picker, setPicker] = useState(false);
  const [path, setPath] = useState("/vehicules");
  const [campaign, setCampaign] = useState("flyer-octobre");
  const [now] = useState(() => Date.now());
  if (!can(user.roleId, "marketing.write")) return <Forbidden />;
  if (!data) return <Loading />;
  const origin = typeof location !== "undefined" ? location.origin : "";
  const qrUrl = `${origin}${path}${path.includes("?") ? "&" : "?"}utm_source=qr&utm_campaign=${encodeURIComponent(campaign)}`;

  return (
    <>
      <PageHeader
        title="Marketing"
        description="Promotions, bannières et QR codes de campagne (§45–48)."
        actions={
          tab === "promotions" ? (
            <Button onClick={() => setPromo({ id: crypto.randomUUID(), title: "", scope: "sale", kind: "percent", value: 10, startsAt: new Date().toISOString(), isActive: true })}><Plus className="size-4" /> Nouvelle promotion</Button>
          ) : tab === "banners" ? (
            <Button onClick={() => setBanner({ id: crypto.randomUUID(), placement: "home_strip", title: "", sortOrder: data.banners.length + 1, isActive: true })}><Plus className="size-4" /> Nouvelle bannière</Button>
          ) : undefined
        }
      />
      <div className="mb-5">
        <Tabs value={tab} onChange={setTab} items={[["promotions", "Promotions", data.promotions.length], ["banners", "Bannières", data.banners.length], ["qr", "QR codes"]]} />
      </div>

      {tab === "promotions" && (
        <div className="card divide-y divide-line">
          {data.promotions.map((p) => {
            const target = p.vehicleId ? data.vehicles.find((v) => v.id === p.vehicleId) : undefined;
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SCOPE[p.scope][1]}`}>{SCOPE[p.scope][0]}</span>
                <div className="min-w-48 flex-1">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-xs text-muted">
                    {KIND[p.kind]}{p.value ? ` : ${p.kind === "percent" ? `${p.value} %` : `${p.value} FCFA`}` : ""}
                    {target ? ` · ${target.brand} ${target.model}` : ""} · du {formatDate(p.startsAt)} au {p.endsAt ? formatDate(p.endsAt) : "—"}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", isLive(p, now) ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500")}>{isLive(p, now) ? "En ligne" : p.isActive ? "Programmée / terminée" : "Désactivée"}</span>
                <button type="button" onClick={() => setPromo(p)} className="rounded-lg p-2 hover:bg-black/5" aria-label="Modifier"><Pencil className="size-4" /></button>
                <button type="button" onClick={() => confirm("Supprimer cette promotion ?") && deleteContent("promotions", p.id, user.id, p.title)} className="rounded-lg p-2 text-muted hover:text-rose-600" aria-label="Supprimer"><Trash2 className="size-4" /></button>
              </div>
            );
          })}
          {data.promotions.length === 0 && <p className="p-6 text-center text-sm text-muted">Aucune promotion.</p>}
        </div>
      )}

      {tab === "banners" && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.banners.map((b) => {
            const img = data.media.find((m) => m.id === b.mediaId);
            return (
              <div key={b.id} className="card overflow-hidden">
                <div className="relative h-28 bg-gradient-to-r from-ink to-ink-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- média local */}
                  {img && <img src={img.url} alt={img.alt} className="absolute inset-0 size-full object-cover opacity-60" />}
                  <div className="relative p-4 text-white">
                    <p className="font-bold">{b.title}</p>
                    <p className="text-sm text-white/80">{b.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 text-xs">
                  <span className="flex-1 text-muted">{PLACEMENT[b.placement]} · {b.linkUrl ?? "sans lien"}</span>
                  <span className={cn("rounded-full px-2 py-0.5 font-semibold", isLive(b, now) ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500")}>{isLive(b, now) ? "En ligne" : "Hors ligne"}</span>
                  <button type="button" onClick={() => setBanner(b)} className="rounded-lg p-1.5 hover:bg-black/5" aria-label="Modifier"><Pencil className="size-4" /></button>
                  <button type="button" onClick={() => confirm("Supprimer cette bannière ?") && deleteContent("banners", b.id, user.id, b.title)} className="rounded-lg p-1.5 text-muted hover:text-rose-600" aria-label="Supprimer"><Trash2 className="size-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "qr" && (
        <Panel title="Générateur de QR code de campagne">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="space-y-4">
              <Field label="Page cible">
                <select className="input" value={path} onChange={(e) => setPath(e.target.value)}>
                  <option value="/vehicules">Catalogue véhicules</option>
                  <option value="/vehicules?tab=promotions">Promotions automobile</option>
                  <option value="/location">Location</option>
                  <option value="/evenementiel/creer">Créer mon événement</option>
                  <option value="/evenementiel/creer?type=mariage">Devis mariage</option>
                  {data.vehicles.filter((v) => v.isForSale && v.status === "available").map((v) => (
                    <option key={v.id} value={`/vehicules/${v.slug}`}>Fiche {v.brand} {v.model} {v.year}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nom de campagne" hint="Mesuré dans Analytics (utm_campaign)."><input className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)} /></Field>
            </div>
            <QrCodeCard url={qrUrl} filename={`qr-${campaign}`} />
          </div>
        </Panel>
      )}

      <Modal open={!!promo} onClose={() => setPromo(null)} title="Promotion">
        {promo && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await saveContent("promotions", promo, user.id, promo.title); setPromo(null); }}>
            <Field label="Titre"><input className="input" value={promo.title} onChange={(e) => setPromo({ ...promo, title: e.target.value })} required /></Field>
            <Field label="Description (affichée sur le site)"><input className="input" value={promo.description ?? ""} onChange={(e) => setPromo({ ...promo, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pôle">
                <select className="input" value={promo.scope} onChange={(e) => setPromo({ ...promo, scope: e.target.value as PromotionScope, vehicleId: undefined, serviceId: undefined, packageId: undefined })}>
                  {Object.entries(SCOPE).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select className="input" value={promo.kind} onChange={(e) => setPromo({ ...promo, kind: e.target.value as PromotionKind })}>
                  {Object.entries(KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </Field>
              {promo.kind !== "label" && (
                <Field label={promo.kind === "percent" ? "Valeur (%)" : "Montant (FCFA)"}><input className="input" type="number" min={0} value={promo.value ?? ""} onChange={(e) => setPromo({ ...promo, value: Number(e.target.value) })} /></Field>
              )}
              <Field label="Cible (facultatif)">
                <select
                  className="input"
                  value={promo.vehicleId ?? promo.serviceId ?? promo.packageId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value || undefined;
                    setPromo({ ...promo, vehicleId: promo.scope !== "event" ? id : undefined, serviceId: promo.scope === "event" && data.services.some((s) => s.id === id) ? id : undefined, packageId: promo.scope === "event" && data.packages.some((p) => p.id === id) ? id : undefined });
                  }}
                >
                  <option value="">Tout le pôle</option>
                  {promo.scope === "sale" && data.vehicles.filter((v) => v.isForSale).map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model} {v.year}</option>)}
                  {promo.scope === "rental" && data.vehicles.filter((v) => v.isForRent).map((v) => <option key={v.id} value={v.id}>{v.brand} {v.model}</option>)}
                  {promo.scope === "event" && data.packages.map((p) => <option key={p.id} value={p.id}>Pack {p.name}</option>)}
                  {promo.scope === "event" && data.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <Field label="Début"><input className="input" type="date" value={toDateInput(promo.startsAt)} onChange={(e) => setPromo({ ...promo, startsAt: fromDateInput(e.target.value) ?? new Date().toISOString() })} /></Field>
              <Field label="Fin"><input className="input" type="date" value={toDateInput(promo.endsAt)} onChange={(e) => setPromo({ ...promo, endsAt: fromDateInput(e.target.value, true) })} /></Field>
            </div>
            {promo.scope === "rental" && promo.kind === "percent" && <p className="text-xs text-muted">Appliquée automatiquement à l&apos;estimation de location sur le site (week-end : si le titre contient « week-end », uniquement du vendredi au lundi).</p>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={promo.isActive} onChange={(e) => setPromo({ ...promo, isActive: e.target.checked })} /> Active</label>
            <Button type="submit" className="w-full">Enregistrer</Button>
          </form>
        )}
      </Modal>

      <Modal open={!!banner} onClose={() => setBanner(null)} title="Bannière">
        {banner && (
          <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); await saveContent("banners", banner, user.id, banner.title); setBanner(null); }}>
            <Field label="Emplacement">
              <select className="input" value={banner.placement} onChange={(e) => setBanner({ ...banner, placement: e.target.value as BannerPlacement })}>
                {Object.entries(PLACEMENT).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Titre"><input className="input" value={banner.title} onChange={(e) => setBanner({ ...banner, title: e.target.value })} required /></Field>
            <Field label="Sous-titre"><input className="input" value={banner.subtitle ?? ""} onChange={(e) => setBanner({ ...banner, subtitle: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lien"><input className="input" value={banner.linkUrl ?? ""} placeholder="/evenementiel/creer" onChange={(e) => setBanner({ ...banner, linkUrl: e.target.value || undefined })} /></Field>
              <Field label="Texte du bouton"><input className="input" value={banner.linkLabel ?? ""} onChange={(e) => setBanner({ ...banner, linkLabel: e.target.value || undefined })} /></Field>
              <Field label="Début"><input className="input" type="date" value={toDateInput(banner.startsAt)} onChange={(e) => setBanner({ ...banner, startsAt: fromDateInput(e.target.value) })} /></Field>
              <Field label="Fin"><input className="input" type="date" value={toDateInput(banner.endsAt)} onChange={(e) => setBanner({ ...banner, endsAt: fromDateInput(e.target.value, true) })} /></Field>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPicker(true)}><Images className="size-4" /> {banner.mediaId ? "Changer l'image" : "Image de fond"}</Button>
              {banner.mediaId && <Button variant="ghost" size="sm" onClick={() => setBanner({ ...banner, mediaId: undefined })}>Retirer</Button>}
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-ink" checked={banner.isActive} onChange={(e) => setBanner({ ...banner, isActive: e.target.checked })} /> Active</label>
            <Button type="submit" className="w-full">Enregistrer</Button>
            <MediaPicker open={picker} onClose={() => setPicker(false)} multiple={false} tags={["bannières"]} onPick={(m) => m[0] && setBanner({ ...banner, mediaId: m[0].id })} />
          </form>
        )}
      </Modal>
    </>
  );
}
