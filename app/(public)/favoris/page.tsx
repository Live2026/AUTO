import type { Metadata } from "next";
import { FavoritesList } from "@/components/public/favorites-list";

export const metadata: Metadata = { title: "Mes favoris", robots: { index: false } };

export default function FavoritesPage() {
  return (
    <div className="container-page max-w-4xl py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Mes favoris</h1>
      <p className="mt-1 mb-6 text-muted">Enregistrés sur cet appareil — aucun compte nécessaire.</p>
      <FavoritesList />
    </div>
  );
}
