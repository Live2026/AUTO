"use client";

import { useRealisationImages } from "@/lib/data/live";
import type { MediaImage, Realisation } from "@/lib/types";
import { RealisationVisual } from "./realisation-card";

/** Photos / vidéo d'une réalisation (§35) ; visuel de secours tant qu'aucune photo n'est publiée. */
export function RealisationGallery({ realisation, icon }: { realisation: Realisation; icon?: string }) {
  const { images, videoUrl } = useRealisationImages(realisation.id, realisation.images ?? []);
  const video = videoUrl ?? realisation.videoUrl;
  if (images.length === 0 && !video) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        <RealisationVisual realisation={realisation} icon={icon} className="aspect-[4/3] rounded-3xl sm:col-span-2 sm:row-span-2 sm:aspect-auto" />
        <RealisationVisual realisation={{ ...realisation, palette: [realisation.palette[1], realisation.palette[0]] }} icon="Camera" className="aspect-[4/3] rounded-3xl" />
        <RealisationVisual realisation={{ ...realisation, palette: ["#e5e7eb", realisation.palette[1]] }} icon="Sparkles" className="aspect-[4/3] rounded-3xl" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {video && (
        <div className="aspect-video overflow-hidden rounded-3xl bg-black">
          <iframe src={video} title={realisation.title} className="size-full" loading="lazy" allow="encrypted-media" allowFullScreen />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img: MediaImage, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage / data URL en démo
          <img key={i} src={img.url} alt={img.alt || realisation.title} loading="lazy" className={i === 0 && images.length > 2 ? "col-span-2 row-span-2 size-full rounded-3xl object-cover" : "aspect-[4/3] size-full rounded-3xl object-cover"} />
        ))}
      </div>
    </div>
  );
}

export function RealisationCover({ realisation, icon, className }: { realisation: Realisation; icon?: string; className?: string }) {
  const { images } = useRealisationImages(realisation.id, realisation.images ?? []);
  if (images[0]) {
    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage / data URL en démo
    return <img src={images[0].url} alt={images[0].alt || realisation.title} loading="lazy" className={`${className ?? ""} object-cover`} />;
  }
  return <RealisationVisual realisation={realisation} icon={icon} className={className} />;
}
