import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Snowflake, Users } from "lucide-react";
import { RentalBooking } from "@/components/public/rental-booking";
import { VehicleGallery } from "@/components/public/vehicle-gallery";
import { getActivePromotions, getRentalVehicleBySlug, getRentalVehicles, getServices, getSettings } from "@/lib/data/catalog";
import { DynamicIcon } from "@/components/public/dynamic-icon";
import { formatXAF } from "@/lib/format";
import { FUEL_LABELS, GEARBOX_LABELS } from "@/lib/labels";
import { phoneNumber, whatsappNumber } from "@/lib/whatsapp";

export async function generateStaticParams() {
  return (await getRentalVehicles()).map((v) => ({ slug: v.slug }));
}

export async function generateMetadata(props: PageProps<"/location/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const v = await getRentalVehicleBySlug(slug);
  if (!v) return {};
  return {
    title: `Location ${v.brand} ${v.model} — ${formatXAF(v.rental!.dailyRate)} / jour`,
    description: `Louez un ${v.brand} ${v.model} ${v.rental!.withDriver ? "avec chauffeur" : ""} à ${v.city}. ${v.seats} places, ${GEARBOX_LABELS[v.gearbox]}.`,
    alternates: { canonical: `/location/${v.slug}` },
  };
}

export default async function RentalDetailPage(props: PageProps<"/location/[slug]">) {
  const { slug } = await props.params;
  const vehicle = await getRentalVehicleBySlug(slug);
  if (!vehicle) notFound();
  const [settings, promotions, services] = await Promise.all([getSettings(), getActivePromotions("rental"), getServices()]);
  const r = vehicle.rental!;
  // Cross-selling location (R9) : services de mobilité complémentaires
  const extras = services.filter((s) => ["sv-transfert", "sv-navette", "sv-chauffeur", "sv-voiture-maries"].includes(s.id));
  const title = `${vehicle.brand} ${vehicle.model}`;
  const rates: [string, number | undefined][] = [
    ["Jour", r.dailyRate],
    ["Semaine", r.weeklyRate],
    ["Mois", r.monthlyRate],
  ];

  return (
    <div className="container-page py-6 sm:py-10">
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted" aria-label="Fil d'Ariane">
        <Link href="/location" className="hover:text-ink">Location</Link>
        <ChevronRight className="size-4" />
        <span>{title}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-8">
          <VehicleGallery vehicleId={vehicle.id} images={vehicle.images} bodyType={vehicle.bodyType} colorHex={vehicle.colorHex} title={title} />
          <div>
            <p className="eyebrow text-rent">Location {r.withDriver && r.selfDrive ? "avec ou sans chauffeur" : r.withDriver ? "avec chauffeur" : "sans chauffeur"}</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted">
              <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{vehicle.seats} places</span>
              <span>{GEARBOX_LABELS[vehicle.gearbox]}</span>
              <span>{FUEL_LABELS[vehicle.fuel]}</span>
              {vehicle.airConditioning && <span className="inline-flex items-center gap-1.5"><Snowflake className="size-4" />Climatisation</span>}
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Tarifs</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {rates.map(([label, value]) => (
                <div key={label} className="card p-4 text-center">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="font-extrabold">{value ? formatXAF(value) : "—"}</p>
                </div>
              ))}
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-700">
              {r.driverDailyRate !== undefined && r.withDriver && (
                <li className="flex gap-2"><Check className="size-4 text-emerald-600" />Chauffeur : {r.driverDailyRate ? `${formatXAF(r.driverDailyRate)} / jour` : "inclus"}</li>
              )}
              {r.deposit && <li className="flex gap-2"><Check className="size-4 text-emerald-600" />Caution : {formatXAF(r.deposit)}</li>}
              <li className="flex gap-2"><Check className="size-4 text-emerald-600" />Durée minimum : {r.minDays} jour{r.minDays > 1 ? "s" : ""}</li>
              {r.cities.length > 0 && <li className="flex gap-2"><Check className="size-4 text-emerald-600" />Disponible à : {r.cities.join(", ")}</li>}
            </ul>
          </div>
          {r.conditions && (
            <div>
              <h2 className="text-xl font-bold">Conditions</h2>
              <p className="mt-2 text-zinc-700">{r.conditions}</p>
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold">Description</h2>
            <p className="mt-2 text-zinc-700">{vehicle.description}</p>
          </div>
          {extras.length > 0 && (
            <div>
              <h2 className="text-xl font-bold">Complétez votre location</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {extras.map((s) => (
                  <Link key={s.id} href={`/contact?sujet=${encodeURIComponent(`${s.name} + location ${title}`)}`} className="card flex items-center gap-3 p-3 transition hover:border-rent/40">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rent-soft text-rent"><DynamicIcon name={s.icon} className="size-5" /></span>
                    <span className="text-sm">
                      <span className="block font-semibold">{s.name}</span>
                      <span className="block text-muted">{s.priceVisible && s.basePrice ? `dès ${formatXAF(s.basePrice)} / ${s.unit}` : "sur demande"}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <RentalBooking
            vehicle={vehicle}
            title={title}
            cities={settings.cities}
            whatsappNumber={whatsappNumber(settings, "rental")}
            phoneNumber={phoneNumber(settings, "rental")}
            whatsappTemplate={settings.whatsappTemplates.rental}
            promotions={promotions}
          />
        </aside>
      </div>
    </div>
  );
}
