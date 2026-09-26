"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ExternalLink, ImagePlus, Info, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusinessError, getAdminVehicle, mockDb, nextVehicleReference, saveVehicle } from "@/lib/db/mock-backend";
import { formatDateTime, formatXAF } from "@/lib/format";
import { CONDITION_LABELS, DRIVETRAIN_LABELS, FUEL_LABELS, GEARBOX_LABELS, VEHICLE_STATUS_LABELS } from "@/lib/labels";
import { vehicleCategories } from "@/lib/mock/catalog";
import { can } from "@/lib/permissions";
import type { AuditLog, BodyType, RentalRates, Vehicle } from "@/lib/types";
import { VehicleVisual } from "../public/vehicle-visual";
import { Button, Field, cn } from "../ui";
import { QrCodeCard } from "./qr-code";
import { Forbidden, PageHeader, useStaff } from "./shell";
import { Loading, Tabs } from "./ui";

const BODY_LABELS: Record<BodyType, string> = { suv: "SUV", sedan: "Berline", pickup: "Pick-up", van: "Minibus / van", hatchback: "Citadine", coupe: "Coupé" };

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const EMPTY: Vehicle = {
  id: "",
  reference: "",
  slug: "",
  status: "draft",
  categoryId: vehicleCategories[0].id,
  isForSale: true,
  isForRent: false,
  isForEvents: false,
  brand: "",
  model: "",
  year: new Date().getFullYear(),
  mileageKm: 0,
  fuel: "diesel",
  gearbox: "automatic",
  drivetrain: "4wd",
  color: "",
  colorHex: "#9ca3af",
  bodyType: "suv",
  seats: 5,
  doors: 5,
  airConditioning: true,
  condition: "used_good",
  features: [],
  description: "",
  city: "Pointe-Noire",
  priceVisible: true,
  isFeatured: false,
  images: [],
};

const DEFAULT_RATES: RentalRates = { dailyRate: 50000, withDriver: true, selfDrive: true, minDays: 1, cities: [] };

/** Compression des photos dans le navigateur avant envoi (US4.3) — économise la data mobile. */
async function compressImage(file: File, max = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.8);
}

export function VehicleForm({ id }: { id: string }) {
  const isNew = id === "nouveau";
  const existing = useLiveQuery(() => (isNew ? Promise.resolve(null) : getAdminVehicle(id).then((v) => v ?? null)), [id, isNew]);
  if (existing === undefined) return <Loading />;
  if (!isNew && existing === null) return <p>Véhicule introuvable.</p>;
  return <VehicleEditor key={id} initial={existing ?? EMPTY} isNew={isNew} />;
}

function VehicleEditor({ initial, isNew }: { initial: Vehicle; isNew: boolean }) {
  const user = useStaff();
  const router = useRouter();
  const [v, setV] = useState<Vehicle>(initial);
  const [step, setStep] = useState<"infos" | "specs" | "photos" | "prix">("infos");
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<string>();
  const [featuresText, setFeaturesText] = useState(initial.features.join("\n"));
  const internalKey = `internal-${initial.id}`;
  const internalRow = useLiveQuery(async () => (initial.id ? await mockDb.meta.get(internalKey) : undefined), [internalKey]);
  const [internal, setInternal] = useState<{ vin?: string; plate?: string; purchasePrice?: string } | null>(null);
  const internalValue = internal ?? (internalRow ? JSON.parse(internalRow.value) : {});
  const history = useLiveQuery(
    async (): Promise<AuditLog[]> =>
      initial.id ? mockDb.audit.where("tableName").equals("vehicles").filter((a) => a.recordId === initial.id).reverse().sortBy("occurredAt") : [],
    [initial.id],
  );

  if (!can(user.roleId, "vehicles.write")) return <Forbidden />;
  const set = (patch: Partial<Vehicle>) => setV((x) => ({ ...x, ...patch }));
  const rates = v.rental ?? DEFAULT_RATES;
  const setRates = (patch: Partial<RentalRates>) => set({ rental: { ...rates, ...patch } });

  const save = async (status?: Vehicle["status"]) => {
    setError(undefined);
    if (!v.brand || !v.model) return setError("Marque et modèle sont obligatoires.");
    if (!v.isForSale && !v.isForRent && !v.isForEvents) return setError("Cochez au moins un usage (vente, location ou événementiel).");
    try {
      const next: Vehicle = {
        ...v,
        status: status ?? v.status,
        id: v.id || crypto.randomUUID(),
        reference: v.reference || (await nextVehicleReference()),
        slug: v.slug || slugify(`${v.brand}-${v.model}-${v.year}`),
        features: featuresText.split("\n").map((f) => f.trim()).filter(Boolean),
        rental: v.isForRent ? rates : v.rental,
      };
      const result = await saveVehicle(next, user.id);
      if (internal && can(user.roleId, "vehicles.internal")) await mockDb.meta.put({ key: `internal-${result.id}`, value: JSON.stringify(internal) });
      setV(result);
      setSaved(`Enregistré ${result.status === "draft" ? "en brouillon" : "et publié"} ✓`);
      if (isNew) router.replace(`/admin/vehicules/${result.id}`);
    } catch (e) {
      setError(e instanceof BusinessError ? e.message : String(e));
    }
  };

  const siteUrl = typeof location !== "undefined" ? location.origin : "";

  return (
    <>
      <Link href="/admin/vehicules" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="size-4" /> Véhicules</Link>
      <PageHeader
        title={isNew ? "Nouveau véhicule" : `${v.brand} ${v.model} ${v.year}`}
        description={isNew ? "4 étapes : infos, caractéristiques, photos, prix & publication." : `${v.reference} · ${VEHICLE_STATUS_LABELS[v.status]}`}
        actions={
          <>
            {!isNew && v.status !== "draft" && (
              <Link href={v.isForSale ? `/vehicules/${v.slug}` : `/location/${v.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-black/5">
                Voir en ligne <ExternalLink className="size-4" />
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => save("draft")}>Enregistrer brouillon</Button>
            <Button size="sm" variant="gold" onClick={() => save(v.status === "draft" ? "available" : v.status)}>{v.status === "draft" ? "Publier" : "Enregistrer"}</Button>
          </>
        }
      />
      {error && <p className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      {saved && <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{saved}</p>}

      <div className="mb-5">
        <Tabs value={step} onChange={setStep} items={[["infos", "1. Infos"], ["specs", "2. Caractéristiques"], ["photos", "3. Photos"], ["prix", "4. Prix & publication"]]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card space-y-5 p-5">
          {step === "infos" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Marque"><input className="input" value={v.brand} onChange={(e) => set({ brand: e.target.value })} /></Field>
                <Field label="Modèle"><input className="input" value={v.model} onChange={(e) => set({ model: e.target.value })} /></Field>
                <Field label="Version / finition"><input className="input" value={v.version ?? ""} onChange={(e) => set({ version: e.target.value })} /></Field>
                <Field label="Année"><input className="input" type="number" value={v.year} onChange={(e) => set({ year: Number(e.target.value) })} /></Field>
                <Field label="Catégorie">
                  <select className="input" value={v.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
                    {vehicleCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ville"><input className="input" value={v.city} onChange={(e) => set({ city: e.target.value })} /></Field>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Usages (cumulables, §44)</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    ["isForSale", "Stock vente", "bg-gold-soft"],
                    ["isForRent", "Flotte location", "bg-rent-soft"],
                    ["isForEvents", "Flotte événementielle", "bg-event-soft"],
                  ] as const).map(([k, l, tone]) => (
                    <label key={k} className={cn("flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm font-semibold", v[k] && tone)}>
                      <input type="checkbox" className="size-4 accent-ink" checked={v[k]} onChange={(e) => set({ [k]: e.target.checked } as Partial<Vehicle>)} />
                      {l}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Une réservation (location, événement, essai, maintenance) bloque le véhicule pour tous les usages sur la période (R3).</p>
              </div>
              <Field label="URL de la fiche" hint="Générée automatiquement si vide.">
                <input className="input" value={v.slug} placeholder={slugify(`${v.brand}-${v.model}-${v.year}`)} onChange={(e) => set({ slug: slugify(e.target.value) })} />
              </Field>
            </>
          )}

          {step === "specs" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Kilométrage"><input className="input" type="number" value={v.mileageKm} onChange={(e) => set({ mileageKm: Number(e.target.value) })} /></Field>
                <Field label="Carburant">
                  <select className="input" value={v.fuel} onChange={(e) => set({ fuel: e.target.value as Vehicle["fuel"] })}>
                    {Object.entries(FUEL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Boîte">
                  <select className="input" value={v.gearbox} onChange={(e) => set({ gearbox: e.target.value as Vehicle["gearbox"] })}>
                    {Object.entries(GEARBOX_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Transmission">
                  <select className="input" value={v.drivetrain} onChange={(e) => set({ drivetrain: e.target.value as Vehicle["drivetrain"] })}>
                    {Object.entries(DRIVETRAIN_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Carrosserie">
                  <select className="input" value={v.bodyType} onChange={(e) => set({ bodyType: e.target.value as BodyType })}>
                    {Object.entries(BODY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="État">
                  <select className="input" value={v.condition} onChange={(e) => set({ condition: e.target.value as Vehicle["condition"] })}>
                    {Object.entries(CONDITION_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Couleur"><input className="input" value={v.color} onChange={(e) => set({ color: e.target.value })} /></Field>
                <Field label="Teinte (aperçu)"><input className="input h-11 p-1" type="color" value={v.colorHex} onChange={(e) => set({ colorHex: e.target.value })} /></Field>
                <Field label="Places"><input className="input" type="number" value={v.seats} onChange={(e) => set({ seats: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Équipements (un par ligne)"><textarea className="input min-h-28" value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} /></Field>
              <Field label="Description"><textarea className="input min-h-28" value={v.description} onChange={(e) => set({ description: e.target.value })} /></Field>
            </>
          )}

          {step === "photos" && (
            <>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line p-8 text-center hover:border-ink/40">
                <ImagePlus className="size-8 text-muted" />
                <span className="font-semibold">Ajouter des photos</span>
                <span className="text-xs text-muted">Compressées automatiquement (WebP, 1600 px max) avant envoi.</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    const urls = await Promise.all(files.map((f) => compressImage(f)));
                    set({ images: [...v.images, ...urls.map((url) => ({ url, alt: `${v.brand} ${v.model}` }))] });
                    e.target.value = "";
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {v.images.map((img, i) => (
                  <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (data URL) */}
                    <img src={img.url} alt={img.alt} className="size-full object-cover" />
                    {i === 0 && <span className="absolute top-2 left-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-white">PRINCIPALE</span>}
                    <div className="absolute inset-x-2 bottom-2 flex justify-between opacity-0 transition group-hover:opacity-100">
                      <button type="button" className="rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold" onClick={() => set({ images: [img, ...v.images.filter((_, j) => j !== i)] })}>Principale</button>
                      <button type="button" className="rounded-lg bg-white/90 p-1.5" onClick={() => set({ images: v.images.filter((_, j) => j !== i) })} aria-label="Supprimer"><Trash2 className="size-3.5 text-rose-600" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="flex gap-2 text-xs text-muted"><Info className="size-4 shrink-0" />Démo : photos stockées dans le navigateur. En production : bucket Supabase Storage « media » + transformations d&apos;image.</p>
            </>
          )}

          {step === "prix" && (
            <>
              {v.isForSale && (
                <div className="space-y-4">
                  <p className="font-bold">Vente</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Prix de vente (FCFA)" hint={v.previousPrice ? `Prix précédent : ${formatXAF(v.previousPrice)}` : "Toute modification est historisée (baisse de prix)."}>
                      <input className="input" type="number" value={v.salePrice ?? ""} onChange={(e) => set({ salePrice: e.target.value ? Number(e.target.value) : undefined })} />
                    </Field>
                    <div className="space-y-2 pt-7 text-sm">
                      <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={!v.priceVisible} onChange={(e) => set({ priceVisible: !e.target.checked })} /> Afficher « Prix sur demande »</label>
                      <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={v.isFeatured} onChange={(e) => set({ isFeatured: e.target.checked })} /> Mettre à la une</label>
                    </div>
                  </div>
                </div>
              )}
              {v.isForRent && (
                <div className="space-y-4 border-t border-line pt-5">
                  <p className="font-bold">Location (R5)</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Tarif jour"><input className="input" type="number" value={rates.dailyRate} onChange={(e) => setRates({ dailyRate: Number(e.target.value) })} /></Field>
                    <Field label="Tarif semaine"><input className="input" type="number" value={rates.weeklyRate ?? ""} onChange={(e) => setRates({ weeklyRate: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                    <Field label="Tarif mois"><input className="input" type="number" value={rates.monthlyRate ?? ""} onChange={(e) => setRates({ monthlyRate: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                    <Field label="Chauffeur / jour"><input className="input" type="number" value={rates.driverDailyRate ?? ""} onChange={(e) => setRates({ driverDailyRate: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                    <Field label="Caution"><input className="input" type="number" value={rates.deposit ?? ""} onChange={(e) => setRates({ deposit: e.target.value ? Number(e.target.value) : undefined })} /></Field>
                    <Field label="Durée min. (jours)"><input className="input" type="number" value={rates.minDays} onChange={(e) => setRates({ minDays: Number(e.target.value) })} /></Field>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={rates.withDriver} onChange={(e) => setRates({ withDriver: e.target.checked })} /> Avec chauffeur</label>
                    <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-ink" checked={rates.selfDrive} onChange={(e) => setRates({ selfDrive: e.target.checked })} /> Sans chauffeur</label>
                  </div>
                  <Field label="Conditions"><textarea className="input min-h-20" value={rates.conditions ?? ""} onChange={(e) => setRates({ conditions: e.target.value })} /></Field>
                </div>
              )}
              <div className="space-y-4 border-t border-line pt-5">
                <p className="font-bold">Statut & SEO</p>
                <Field label="Statut">
                  <select className="input" value={v.status} onChange={(e) => set({ status: e.target.value as Vehicle["status"] })}>
                    {Object.entries(VEHICLE_STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Titre SEO" hint="Par défaut : marque, modèle, année et prix."><input className="input" value={v.seoTitle ?? ""} onChange={(e) => set({ seoTitle: e.target.value })} /></Field>
              </div>
              {can(user.roleId, "vehicles.internal") && (
                <div className="space-y-4 rounded-2xl bg-paper p-4">
                  <p className="font-bold">Données internes <span className="text-xs font-normal text-muted">(jamais publiées — table vehicle_internal)</span></p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="VIN"><input className="input" value={internalValue.vin ?? ""} onChange={(e) => setInternal({ ...internalValue, vin: e.target.value })} /></Field>
                    <Field label="Immatriculation"><input className="input" value={internalValue.plate ?? ""} onChange={(e) => setInternal({ ...internalValue, plate: e.target.value })} /></Field>
                    <Field label="Prix d'achat"><input className="input" type="number" value={internalValue.purchasePrice ?? ""} onChange={(e) => setInternal({ ...internalValue, purchasePrice: e.target.value })} /></Field>
                  </div>
                  {internalValue.purchasePrice && v.salePrice ? <p className="text-sm">Marge brute estimée : <strong>{formatXAF(v.salePrice - Number(internalValue.purchasePrice))}</strong></p> : null}
                </div>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="aspect-[16/10]">
              {v.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local
                <img src={v.images[0].url} alt="" className="size-full object-cover" />
              ) : (
                <VehicleVisual bodyType={v.bodyType} colorHex={v.colorHex} />
              )}
            </div>
            <div className="p-4">
              <p className="font-bold">{v.brand || "Marque"} {v.model || "Modèle"} {v.year}</p>
              <p className="text-sm text-muted">{v.version}</p>
              <p className="mt-2 font-extrabold">{v.isForSale ? (v.priceVisible && v.salePrice ? formatXAF(v.salePrice) : "Prix sur demande") : `${formatXAF(rates.dailyRate)} / jour`}</p>
            </div>
          </div>
          {!isNew && v.status !== "draft" && (
            <div className="card p-4">
              <p className="mb-3 text-sm font-bold">QR code de la fiche</p>
              <QrCodeCard url={`${siteUrl}/${v.isForSale ? "vehicules" : "location"}/${v.slug}?utm_source=qr`} filename={`qr-${v.reference}`} />
            </div>
          )}
          {history && history.length > 0 && (
            <div className="card p-4">
              <p className="mb-2 text-sm font-bold">Historique (audit)</p>
              <ul className="space-y-1.5 text-xs text-muted">
                {history.slice(0, 8).map((h) => (
                  <li key={h.id}>{formatDateTime(h.occurredAt)} — {h.summary}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="flex gap-2 rounded-xl bg-sky-50 p-3 text-xs text-sky-800">
            <Info className="size-4 shrink-0" />
            Mode démo : le site public affiche le catalogue de démonstration. Avec Supabase, chaque publication régénère la fiche publique en quelques secondes (ISR).
          </p>
        </aside>
      </div>
    </>
  );
}
