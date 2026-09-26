"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useVehicleImages } from "@/lib/data/live";
import type { BodyType, MediaImage } from "@/lib/types";
import { cn } from "../ui";
import { VehicleVisual } from "./vehicle-visual";

const VIEWS = ["Vue latérale", "Vue 3/4", "Profil droit", "Studio"];

export function VehicleGallery({
  vehicleId,
  images = [],
  bodyType,
  colorHex,
  title,
  videoUrl,
}: {
  vehicleId: string;
  images?: MediaImage[];
  bodyType: BodyType;
  colorHex: string;
  title: string;
  videoUrl?: string;
}) {
  const photos = useVehicleImages(vehicleId, images);
  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const hasPhotos = photos.length > 0;
  const count = hasPhotos ? photos.length : VIEWS.length;
  const idx = Math.min(active, count - 1);
  const go = (d: number) => {
    setShowVideo(false);
    setActive((a) => (a + d + count) % count);
  };

  return (
    <div className="space-y-3">
      <div className="group relative aspect-[16/10] overflow-hidden rounded-3xl bg-zinc-100">
        {showVideo && videoUrl ? (
          <iframe src={videoUrl} title={`Vidéo ${title}`} className="size-full" allow="autoplay; encrypted-media" allowFullScreen />
        ) : hasPhotos ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage / data URL en démo
          <img src={photos[idx].url} alt={photos[idx].alt || title} className="size-full object-cover" />
        ) : (
          <VehicleVisual bodyType={bodyType} colorHex={colorHex} variant={idx} flip={idx === 2} label={`${title} — ${VIEWS[idx]}`} />
        )}
        {count > 1 && !showVideo && (
          <>
            <button type="button" onClick={() => go(-1)} className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 shadow" aria-label="Photo précédente"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(1)} className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 shadow" aria-label="Photo suivante"><ChevronRight className="size-5" /></button>
          </>
        )}
        <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          {hasPhotos ? `${idx + 1} / ${count}` : "Illustration — photos réelles à venir"}
        </span>
      </div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              setActive(i);
              setShowVideo(false);
            }}
            className={cn("aspect-[16/10] w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition sm:w-28", idx === i && !showVideo ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100")}
            aria-label={hasPhotos ? `Photo ${i + 1}` : VIEWS[i]}
          >
            {hasPhotos ? (
              // eslint-disable-next-line @next/next/no-img-element -- miniature
              <img src={photos[i].url} alt="" className="size-full object-cover" loading="lazy" />
            ) : (
              <VehicleVisual bodyType={bodyType} colorHex={colorHex} variant={i} flip={i === 2} />
            )}
          </button>
        ))}
      </div>
      {videoUrl && (
        <button type="button" onClick={() => setShowVideo(true)} className="text-sm font-semibold underline">
          ▶ Voir la vidéo (chargée à la demande)
        </button>
      )}
    </div>
  );
}
