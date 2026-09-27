import { PageHero } from "@/components/public/page-hero";
import type { Metadata } from "next";
import { FavoritesList } from "@/components/public/favorites-list";

export const metadata: Metadata = { title: "Mes favoris", robots: { index: false } };

export default function FavoritesPage() {
  return (
    <>
    <PageHero tone="neutral" title="Mes favoris" description={"Enregistrés sur cet appareil — aucun compte nécessaire."} crumbs={[["Mes favoris"]]} narrow />
    <div className="container-page max-w-4xl py-8">
      <FavoritesList />
    </div>
    </>
  );
}
