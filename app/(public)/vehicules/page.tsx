import { PageHero } from "@/components/public/page-hero";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VehicleCard } from "@/components/public/vehicle-card";
import { VehicleFilters } from "@/components/public/vehicle-filters";
import { BannerStrip } from "@/components/public/banner-strip";
import { EmptyState, LinkButton } from "@/components/ui";
import { getSaleBrands, getSaleVehicles, getVehicleCategories, type VehicleFilters as Filters } from "@/lib/data/catalog";
import { getBanners } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Véhicules à vendre",
  description: "SUV, 4x4, berlines, pick-up et véhicules premium à vendre à Pointe-Noire et Brazzaville. Prix affichés, contact WhatsApp immédiat.",
  alternates: { canonical: "/vehicules" },
};

const num = (v?: string | string[]) => (typeof v === "string" && v ? Number(v) : undefined);
const str = (v?: string | string[]) => (typeof v === "string" && v ? v : undefined);

export default async function VehiclesPage(props: PageProps<"/vehicules">) {
  const sp = await props.searchParams;
  const filters: Filters = {
    category: str(sp.category),
    brand: str(sp.brand),
    fuel: str(sp.fuel),
    gearbox: str(sp.gearbox),
    maxPrice: num(sp.maxPrice),
    minYear: num(sp.minYear),
    q: str(sp.q),
    tab: str(sp.tab) as Filters["tab"],
    sort: str(sp.sort) as Filters["sort"],
  };
  const [vehicles, categories, brands] = await Promise.all([getSaleVehicles(filters), getVehicleCategories("sale"), getSaleBrands()]);

  return (
    <>
    <PageHero tone="auto" eyebrow="Vente automobile" title="Nos véhicules" description={"Tous nos véhicules sont inspectés. Un doute, une question ? Un conseiller vous répond sur WhatsApp."} crumbs={[["Véhicules"]]} />
    <div className="container-page py-8">

      <BannerStrip placement="vehicles" fallback={await getBanners()} className="mt-6" />
      <div className="mt-8">
        <Suspense>
          <VehicleFilters categories={categories} brands={brands} total={vehicles.length} />
        </Suspense>
      </div>

      <h2 className="sr-only">Résultats</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((v) => (
          <VehicleCard key={v.id} vehicle={v} />
        ))}
      </div>
      {vehicles.length === 0 && (
        <EmptyState
          title="Aucun véhicule ne correspond à votre recherche"
          description="Dites-nous ce que vous cherchez : nous trouvons régulièrement des véhicules sur commande."
          action={<LinkButton href="/contact?sujet=recherche-vehicule" variant="gold">Faire une demande personnalisée</LinkButton>}
        />
      )}
    </div>
    </>
  );
}
