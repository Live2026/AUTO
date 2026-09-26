"use client";

// IndexedDB — face publique (docs/03-architecture-technique.md §4).
// Favoris, vus récemment, brouillons de formulaires, file d'envoi hors-ligne, mes demandes.

import Dexie, { type EntityTable } from "dexie";
import type { PublicRequestPayload, RequestType } from "../types";

export interface FavoriteItem {
  id: string;
  kind: "vehicle" | "rental" | "service";
  slug: string;
  title: string;
  subtitle?: string;
  price?: number;
  colorHex?: string;
  addedAt: string;
}

export interface RecentItem {
  id: string;
  kind: "vehicle" | "rental";
  slug: string;
  title: string;
  viewedAt: string;
}

export interface FormDraft {
  key: string;
  data: unknown;
  updatedAt: string;
}

export interface OutboxItem {
  id?: number;
  payload: PublicRequestPayload;
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export interface MyRequest {
  reference: string;
  trackingToken: string;
  type: RequestType;
  summary: string;
  createdAt: string;
}

class PublicDB extends Dexie {
  favorites!: EntityTable<FavoriteItem, "id">;
  recentlyViewed!: EntityTable<RecentItem, "id">;
  formDrafts!: EntityTable<FormDraft, "key">;
  outbox!: EntityTable<OutboxItem, "id">;
  myRequests!: EntityTable<MyRequest, "reference">;

  constructor() {
    super("bryan-public");
    this.version(1).stores({
      favorites: "id, kind, addedAt",
      recentlyViewed: "id, viewedAt",
      formDrafts: "key",
      outbox: "++id, createdAt",
      myRequests: "reference, createdAt",
    });
  }
}

export const publicDb = new PublicDB();

export async function toggleFavorite(item: Omit<FavoriteItem, "addedAt">): Promise<boolean> {
  const existing = await publicDb.favorites.get(item.id);
  if (existing) {
    await publicDb.favorites.delete(item.id);
    return false;
  }
  await publicDb.favorites.put({ ...item, addedAt: new Date().toISOString() });
  return true;
}

export async function rememberView(item: Omit<RecentItem, "viewedAt">): Promise<void> {
  await publicDb.recentlyViewed.put({ ...item, viewedAt: new Date().toISOString() });
  const count = await publicDb.recentlyViewed.count();
  if (count > 20) {
    const oldest = await publicDb.recentlyViewed.orderBy("viewedAt").limit(count - 20).primaryKeys();
    await publicDb.recentlyViewed.bulkDelete(oldest);
  }
}

export async function saveDraft(key: string, data: unknown): Promise<void> {
  await publicDb.formDrafts.put({ key, data, updatedAt: new Date().toISOString() });
}

export async function loadDraft<T>(key: string): Promise<T | undefined> {
  return (await publicDb.formDrafts.get(key))?.data as T | undefined;
}

export async function clearDraft(key: string): Promise<void> {
  await publicDb.formDrafts.delete(key);
}
