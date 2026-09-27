"use client";

import { Heart } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { publicDb, toggleFavorite, type FavoriteItem } from "@/lib/db/public-db";
import { trackEvent } from "@/lib/db/mock-backend";
import { cn } from "../ui";

/** Favoris sans compte, stockés dans IndexedDB (§16). */
export function FavoriteButton({ item, withLabel }: { item: Omit<FavoriteItem, "addedAt">; withLabel?: boolean }) {
  const isFav = useLiveQuery(() => publicDb.favorites.get(item.id).then(Boolean), [item.id]);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.preventDefault();
        const added = await toggleFavorite(item);
        if (added) void trackEvent("favorite_add", { objectId: item.id, objectType: item.kind });
      }}
      className={cn(
        "relative z-10 inline-flex items-center gap-2 rounded-full bg-white/90 p-2 text-ink shadow-sm backdrop-blur transition hover:scale-105",
        withLabel && "h-11 rounded-xl border border-line px-4 shadow-none",
      )}
      aria-pressed={!!isFav}
      aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      <Heart className={cn("size-5", isFav && "fill-rose-600 text-rose-600")} />
      {withLabel && <span className="text-sm font-semibold">{isFav ? "Dans mes favoris" : "Favori"}</span>}
    </button>
  );
}
