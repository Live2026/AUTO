"use client";

import { useState } from "react";
import type { BodyType } from "@/lib/types";
import { cn } from "../ui";
import { VehicleVisual } from "./vehicle-visual";

const VIEWS = ["Vue latérale", "Vue 3/4", "Profil droit", "Studio"];

export function VehicleGallery({ bodyType, colorHex, title, videoUrl }: { bodyType: BodyType; colorHex: string; title: string; videoUrl?: string }) {
  const [active, setActive] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-zinc-100">
        {showVideo && videoUrl ? (
          <iframe src={videoUrl} title={`Vidéo ${title}`} className="size-full" allow="autoplay; encrypted-media" allowFullScreen />
        ) : (
          <VehicleVisual bodyType={bodyType} colorHex={colorHex} variant={active} flip={active === 2} label={`${title} — ${VIEWS[active]}`} />
        )}
        <span className="absolute right-3 bottom-3 rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          Illustration — photos réelles à venir
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {VIEWS.map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setActive(i);
              setShowVideo(false);
            }}
            className={cn("aspect-[16/10] overflow-hidden rounded-xl ring-2 transition", active === i && !showVideo ? "ring-ink" : "ring-transparent opacity-70 hover:opacity-100")}
            aria-label={v}
          >
            <VehicleVisual bodyType={bodyType} colorHex={colorHex} variant={i} flip={i === 2} />
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
