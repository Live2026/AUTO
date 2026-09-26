import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftRight, Check, ChevronRight } from "lucide-react";
import { VehicleActions } from "@/components/public/vehicle-actions";
import { VehicleCard, SalePrice, VehicleStatusBadges } from "@/components/public/vehicle-card";
import { VehicleGallery } from "@/components/public/vehicle-gallery";
import { LinkButton } from "@/components/ui";
import {
  getAllPublicVehicleSlugs,
  getSettings,
  getSimilarVehicles,
  getVehicleBySlug,
  getVehicleCategories,
  hasPriceDrop,
  vehicleTitle,
} from "@/lib/data/catalog";
import { formatKm, formatXAF, percentOff } from "@/lib/format";
import { CONDITION_LABELS, DRIVETRAIN_LABELS, FUEL_LABELS, GEARBOX_LABELS, VEHICLE_STATUS_LABELS } from "@/lib/labels";
import { fillTemplate, phoneNumber, whatsappNumber } from "@/lib/whatsapp";

export async function generateStaticParams() {
  return (await getAllPublicVehicleSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/vehicules/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const v = await getVehicleBySlug(slug);
  if (!v) return {};
  const title = `${vehicleTitle(v)}${v.version ? ` ${v.version}` : ""}`;
  const price = v.priceVisible && v.salePrice ? ` — ${formatXAF(v.salePrice)}` : "";
  return {
    title: `${title}${price}`,
    description: `${title}, ${formatKm(v.mileageKm)}, ${FUEL_LABELS[v.fuel]}, ${GEARBOX_LABELS[v.gearbox]}. Réf. ${v.reference}. ${v.description}`.slice(0, 160),
    alternates: { canonical: `/vehicules/${v.slug}` },
    openGraph: { title: `${title}${price}`, description: v.description, type: "website" },
  };
}

export default async function VehiclePage(props: PageProps<"/vehicules/[slug]">) {
  const { slug } = await props.params;
  const vehicle = await getVehicleBySlug(slug);
  if (!vehicle) notFound();
  const [settings, similar, categories] = await Promise.all([getSettings(), getSimilarVehicles(vehicle), getVehicleCategories()]);
  const title = vehicleTitle(vehicle);
  const category = categories.find((c) => c.id === vehicle.categoryId);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bryanmultiservices.cg";
  const url = `${siteUrl}/vehicules/${vehicle.slug}`;
  const waMessage = fillTemplate(settings.whatsappTemplates.sale, { vehicule: title, reference: vehicle.reference, url });

  const specs: [string, string][] = [
    ["Marque", vehicle.brand],
    ["Modèle", `${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""}`],
    ["Année", String(vehicle.year)],
    ["Kilométrage", formatKm(vehicle.mileageKm)],
    ["Carburant", FUEL_LABELS[vehicle.fuel]],
    ["Boîte de vitesses", GEARBOX_LABELS[vehicle.gearbox]],
    ["Transmission", DRIVETRAIN_LABELS[vehicle.drivetrain]],
    ["Couleur", vehicle.color],
    ["Places", String(vehicle.seats)],
    ["État", CONDITION_LABELS[vehicle.condition]],
    ["Disponibilité", VEHICLE_STATUS_LABELS[vehicle.status]],
    ["Référence", vehicle.reference],
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Car",
    name: title,
    brand: { "@type": "Brand", name: vehicle.brand },
    model: vehicle.model,
    vehicleModelDate: String(vehicle.year),
    mileageFromOdometer: { "@type": "QuantitativeValue", value: vehicle.mileageKm, unitCode: "KMT" },
    fuelType: FUEL_LABELS[vehicle.fuel],
    vehicleTransmission: GEARBOX_LABELS[vehicle.gearbox],
    color: vehicle.color,
    seatingCapacity: vehicle.seats,
    itemCondition: vehicle.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    sku: vehicle.reference,
    url,
    ...(vehicle.priceVisible && vehicle.salePrice
      ? {
          offers: {
            "@type": "Offer",
            price: vehicle.salePrice,
            priceCurrency: "XAF",
            availability: vehicle.status === "sold" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
            seller: { "@type": "AutoDealer", name: settings.company.name },
          },
        }
      : {}),
  };
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Véhicules", item: `${siteUrl}/vehicules` },
      { "@type": "ListItem", position: 3, name: title, item: url },
    ],
  };

  return (
    <div className="container-page py-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumb]) }} />
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted" aria-label="Fil d'Ariane">
        <Link href="/vehicules" className="hover:text-ink">Véhicules</Link>
        {category && (
          <>
            <ChevronRight className="size-4" />
            <Link href={`/vehicules?category=${category.slug}`} className="hover:text-ink">{category.name}</Link>
          </>
        )}
      </nav>

      {vehicle.status === "sold" && (
        <div className="mb-6 rounded-2xl bg-ink px-5 py-4 text-white">
          <p className="font-bold">Ce véhicule a été vendu.</p>
          <p className="text-sm text-white/70">Découvrez ci-dessous des véhicules similaires, ou demandez-nous une recherche sur commande.</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <VehicleGallery bodyType={vehicle.bodyType} colorHex={vehicle.colorHex} title={title} videoUrl={vehicle.videoUrl} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <VehicleStatusBadges vehicle={vehicle} />
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{title}</h1>
          {vehicle.version && <p className="text-muted">{vehicle.version}</p>}
          <p className="mt-1 text-sm text-muted">Réf. {vehicle.reference} · {vehicle.city}</p>
          <div className="mt-5">
            <SalePrice vehicle={vehicle} size="lg" />
            {hasPriceDrop(vehicle) && (
              <p className="mt-1 text-sm font-semibold text-rose-600">
                Baisse de {formatXAF(vehicle.previousPrice! - vehicle.salePrice!)} (–{percentOff(vehicle.previousPrice!, vehicle.salePrice!)} %)
              </p>
            )}
          </div>
          <div className="mt-6">
            <VehicleActions
              vehicle={vehicle}
              title={title}
              whatsappNumber={whatsappNumber(settings, "sale")}
              phoneNumber={phoneNumber(settings, "sale")}
              whatsappMessage={waMessage}
              shareUrl={url}
            />
          </div>
          <Link href="/reprise" className="mt-4 flex items-center gap-2 rounded-xl bg-gold-soft px-4 py-3 text-sm font-medium">
            <ArrowLeftRight className="size-4 text-gold" />
            Vous avez un véhicule à vendre ou échanger ?
            <ChevronRight className="ml-auto size-4" />
          </Link>
        </aside>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <section className="space-y-8">
          <div>
            <h2 className="text-xl font-bold">Description</h2>
            <p className="mt-2 leading-relaxed text-zinc-700">{vehicle.description}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Caractéristiques</h2>
            <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-white sm:grid-cols-3">
              {specs.map(([k, val]) => (
                <div key={k} className="border-b border-line p-3.5 odd:border-r sm:[&:not(:nth-child(3n))]:border-r">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-semibold">{val}</dd>
                </div>
              ))}
            </dl>
          </div>
          {vehicle.features.length > 0 && (
            <div>
              <h2 className="text-xl font-bold">Équipements</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {vehicle.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-zinc-700"><Check className="size-4 text-emerald-600" />{f}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        {vehicle.isForRent && vehicle.status === "available" && (
          <aside className="self-start rounded-2xl bg-rent-soft p-5">
            <p className="eyebrow text-rent">Aussi disponible en location</p>
            <p className="mt-2 text-sm">Ce véhicule est proposé à la location {vehicle.rental?.withDriver ? "avec chauffeur" : ""} à partir de <strong>{formatXAF(vehicle.rental?.dailyRate)}</strong> / jour.</p>
            <LinkButton href={`/location/${vehicle.slug}`} variant="rent" size="sm" className="mt-3">Voir la location</LinkButton>
          </aside>
        )}
      </div>

      {similar.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">Véhicules similaires</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((v) => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
