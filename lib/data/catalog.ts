// Couche d'accès au catalogue public.
// Aujourd'hui : données mockées (lib/mock/catalog.ts).
// Demain : remplacer le corps de chaque fonction par une requête Supabase (même signature).

import * as mock from "../mock/catalog";
import type {
  BusinessSettings,
  EventType,
  EventTypeRecommendation,
  Package,
  Promotion,
  Realisation,
  Service,
  ServiceCategory,
  Vehicle,
  VehicleCategory,
} from "../types";

export const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? "mock";

const DAY = 86_400_000;
/** Date de référence figée pour un rendu statique déterministe des données de démo. */
const REFERENCE_NOW = new Date("2026-09-26T12:00:00Z").getTime();

// ---------- Règles de visibilité (R11) ----------

export function isPublicVehicle(v: Vehicle, now = REFERENCE_NOW): boolean {
  if (v.status === "available" || v.status === "reserved") return true;
  return v.status === "sold" && !!v.soldAt && now - new Date(v.soldAt).getTime() < 30 * DAY;
}

export function isNewArrival(v: Vehicle, now = REFERENCE_NOW): boolean {
  return !!v.publishedAt && now - new Date(v.publishedAt).getTime() < 30 * DAY;
}

export function hasPriceDrop(v: Vehicle, now = REFERENCE_NOW): boolean {
  return (
    !!v.previousPrice &&
    !!v.salePrice &&
    v.previousPrice > v.salePrice &&
    !!v.priceChangedAt &&
    now - new Date(v.priceChangedAt).getTime() < 30 * DAY
  );
}

export function vehicleTitle(v: Pick<Vehicle, "brand" | "model" | "year">): string {
  return `${v.brand} ${v.model} ${v.year}`;
}

// ---------- Paramètres ----------

export async function getSettings(): Promise<BusinessSettings> {
  return mock.settings;
}

// ---------- Véhicules ----------

export interface VehicleFilters {
  category?: string;
  brand?: string;
  fuel?: string;
  gearbox?: string;
  minPrice?: number;
  maxPrice?: number;
  minYear?: number;
  q?: string;
  tab?: "tous" | "nouveautes" | "promotions" | "baisses";
  sort?: "recent" | "prix-asc" | "prix-desc" | "km";
}

export async function getVehicleCategories(scope?: "sale" | "rent"): Promise<VehicleCategory[]> {
  return mock.vehicleCategories
    .filter((c) => (scope === "sale" ? c.forSale : scope === "rent" ? c.forRent : true))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getSaleVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
  const cats = await getVehicleCategories();
  const promoIds = new Set(mock.promotions.filter((p) => p.scope === "sale" && p.vehicleId).map((p) => p.vehicleId));
  const q = filters.q?.trim().toLowerCase();
  const list = mock.vehicles.filter((v) => {
    if (!v.isForSale || !isPublicVehicle(v)) return false;
    if (filters.category && cats.find((c) => c.id === v.categoryId)?.slug !== filters.category) return false;
    if (filters.brand && v.brand !== filters.brand) return false;
    if (filters.fuel && v.fuel !== filters.fuel) return false;
    if (filters.gearbox && v.gearbox !== filters.gearbox) return false;
    if (filters.minPrice && (v.salePrice ?? 0) < filters.minPrice) return false;
    if (filters.maxPrice && (v.salePrice ?? Infinity) > filters.maxPrice) return false;
    if (filters.minYear && v.year < filters.minYear) return false;
    if (q && !`${v.brand} ${v.model} ${v.version ?? ""} ${v.reference}`.toLowerCase().includes(q)) return false;
    if (filters.tab === "nouveautes" && !isNewArrival(v)) return false;
    if (filters.tab === "baisses" && !hasPriceDrop(v)) return false;
    if (filters.tab === "promotions" && !hasPriceDrop(v) && !promoIds.has(v.id)) return false;
    return true;
  });
  const sold = (v: Vehicle) => (v.status === "sold" ? 1 : 0);
  return list.sort((a, b) => {
    if (sold(a) !== sold(b)) return sold(a) - sold(b);
    switch (filters.sort) {
      case "prix-asc":
        return (a.salePrice ?? Infinity) - (b.salePrice ?? Infinity);
      case "prix-desc":
        return (b.salePrice ?? 0) - (a.salePrice ?? 0);
      case "km":
        return a.mileageKm - b.mileageKm;
      default:
        return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    }
  });
}

export async function getFeaturedVehicles(limit = 6): Promise<Vehicle[]> {
  const all = await getSaleVehicles();
  return [...all.filter((v) => v.isFeatured && v.status !== "sold"), ...all.filter((v) => !v.isFeatured)].slice(0, limit);
}

export async function getVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
  return mock.vehicles.find((v) => v.slug === slug && isPublicVehicle(v));
}

export async function getVehicleById(id: string): Promise<Vehicle | undefined> {
  return mock.vehicles.find((v) => v.id === id);
}

export async function getSimilarVehicles(vehicle: Vehicle, limit = 3): Promise<Vehicle[]> {
  const all = await getSaleVehicles();
  return all
    .filter((v) => v.id !== vehicle.id && v.status !== "sold")
    .sort((a, b) => {
      const score = (x: Vehicle) =>
        (x.categoryId === vehicle.categoryId ? 2 : 0) +
        (Math.abs((x.salePrice ?? 0) - (vehicle.salePrice ?? 0)) < 10_000_000 ? 1 : 0);
      return score(b) - score(a);
    })
    .slice(0, limit);
}

export async function getSaleBrands(): Promise<string[]> {
  const all = await getSaleVehicles();
  return [...new Set(all.map((v) => v.brand))].sort();
}

export async function getAllPublicVehicleSlugs(): Promise<string[]> {
  return mock.vehicles.filter((v) => v.isForSale && isPublicVehicle(v)).map((v) => v.slug);
}

// ---------- Location ----------

export async function getRentalVehicles(): Promise<Vehicle[]> {
  return mock.vehicles
    .filter((v) => v.isForRent && v.rental && v.status === "available")
    .sort((a, b) => (a.rental!.dailyRate ?? 0) - (b.rental!.dailyRate ?? 0));
}

export async function getRentalVehicleBySlug(slug: string): Promise<Vehicle | undefined> {
  return (await getRentalVehicles()).find((v) => v.slug === slug);
}

// ---------- Événementiel ----------

export async function getEventTypes(): Promise<EventType[]> {
  return mock.eventTypes.filter((e) => e.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getEventTypeBySlug(slug: string): Promise<EventType | undefined> {
  return (await getEventTypes()).find((e) => e.slug === slug);
}

export async function getServiceCategories(): Promise<ServiceCategory[]> {
  return [...mock.serviceCategories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getServices(): Promise<Service[]> {
  return mock.services.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getPackages(eventTypeId?: string): Promise<Package[]> {
  return mock.packages.filter((p) => p.status === "published" && (!eventTypeId || p.eventTypeId === eventTypeId));
}

export async function getRecommendations(eventTypeId: string): Promise<EventTypeRecommendation[]> {
  return mock.recommendations.filter((r) => r.eventTypeId === eventTypeId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getAllRecommendations(): Promise<EventTypeRecommendation[]> {
  return mock.recommendations;
}

// ---------- Réalisations & promotions ----------

export async function getRealisations(eventTypeId?: string): Promise<Realisation[]> {
  return mock.realisations
    .filter((r) => r.status === "published" && (!eventTypeId || r.eventTypeId === eventTypeId))
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

export async function getRealisationBySlug(slug: string): Promise<Realisation | undefined> {
  return (await getRealisations()).find((r) => r.slug === slug);
}

export async function getActivePromotions(scope?: Promotion["scope"]): Promise<Promotion[]> {
  return mock.promotions.filter(
    (p) =>
      p.isActive &&
      (!scope || p.scope === scope) &&
      new Date(p.startsAt).getTime() <= REFERENCE_NOW &&
      (!p.endsAt || new Date(p.endsAt).getTime() > REFERENCE_NOW),
  );
}
