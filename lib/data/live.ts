"use client";

// Contenus « vivants » côté visiteur.
// Mode démo : les modifications faites dans l'admin (photos, promotions, bannières, réalisations) sont
// stockées dans l'IndexedDB du navigateur ; ces hooks les superposent aux données statiques du serveur.
// Mode Supabase : le serveur fournit déjà les données à jour (ISR) → on garde simplement la valeur serveur.

import { useLiveQuery } from "dexie-react-hooks";
import { mockDb } from "../db/mock-backend";
import type { Banner, MediaAsset, MediaImage, Promotion, Realisation } from "../types";

const MOCK = (process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock") === "mock";

export function useVehicleImages(vehicleId: string, fallback: MediaImage[]): MediaImage[] {
  const live = useLiveQuery(async () => (MOCK ? (await mockDb.vehicles.get(vehicleId))?.images : undefined), [vehicleId]);
  return live && live.length ? live : fallback;
}

export function useRealisationImages(id: string, fallback: MediaImage[] = []): { images: MediaImage[]; videoUrl?: string } {
  const live = useLiveQuery(async (): Promise<Realisation | undefined> => (MOCK ? mockDb.realisations.get(id) : undefined), [id]);
  return { images: live?.images?.length ? live.images : fallback, videoUrl: live?.videoUrl };
}

export function usePromotions(fallback: Promotion[]): Promotion[] {
  const live = useLiveQuery(async () => (MOCK ? mockDb.promotions.toArray() : undefined), []);
  return live && live.length ? live : fallback;
}

export function useBanners(placement: Banner["placement"], fallback: Banner[]): (Banner & { image?: MediaAsset })[] {
  const live = useLiveQuery(async () => {
    if (!MOCK) return undefined;
    const [banners, media] = await Promise.all([mockDb.banners.toArray(), mockDb.media.toArray()]);
    return banners.length ? banners.map((b) => ({ ...b, image: media.find((m) => m.id === b.mediaId) })) : undefined;
  }, []);
  return (live ?? fallback).filter((b) => b.placement === placement).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isBannerLive(b: { isActive: boolean; startsAt?: string; endsAt?: string }, now: number) {
  return b.isActive && (!b.startsAt || Date.parse(b.startsAt) <= now) && (!b.endsAt || Date.parse(b.endsAt) > now);
}
