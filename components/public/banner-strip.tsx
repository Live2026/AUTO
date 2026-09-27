"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { isBannerLive, useBanners } from "@/lib/data/live";
import { useNow } from "@/lib/hooks";
import type { Banner } from "@/lib/types";

/** Bannières gérées depuis l'admin → Marketing (§46). */
export function BannerStrip({ placement, fallback, className }: { placement: Banner["placement"]; fallback: Banner[]; className?: string }) {
  const now = useNow();
  const banners = useBanners(placement, fallback).filter((b) => now && isBannerLive(b, now));
  if (banners.length === 0) return null;
  return (
    <div className={className}>
      <div className="space-y-3">
        {banners.map((b) => (
          <div key={b.id} className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-ink to-ink-3 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- média de la médiathèque */}
            {b.image && <img src={b.image.url} alt={b.image.alt} className="absolute inset-0 size-full object-cover opacity-45" />}
            <div className="relative flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7">
              <div className="max-w-xl">
                <p className="text-xl font-extrabold sm:text-2xl">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-white/80">{b.subtitle}</p>}
              </div>
              {b.linkUrl && (
                <Link href={b.linkUrl} className="inline-flex h-11 items-center gap-2 rounded-xl bg-gold px-5 font-semibold text-ink hover:bg-gold-2">
                  {b.linkLabel ?? "Découvrir"} <ArrowRight className="size-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
