import type { MetadataRoute } from "next";
import { getAllPublicVehicleSlugs, getEventTypes, getRealisations, getRentalVehicles } from "@/lib/data/catalog";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bryanmultiservices.cg";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [vehicles, rentals, types, realisations] = await Promise.all([getAllPublicVehicleSlugs(), getRentalVehicles(), getEventTypes(), getRealisations()]);
  const staticPages = ["", "/vehicules", "/location", "/evenementiel", "/evenementiel/prestations", "/evenementiel/creer", "/realisations", "/a-propos", "/contact", "/reprise"];
  return [
    ...staticPages.map((p) => ({ url: `${SITE}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.8 })),
    ...vehicles.map((s) => ({ url: `${SITE}/vehicules/${s}`, changeFrequency: "daily" as const, priority: 0.9 })),
    ...rentals.map((v) => ({ url: `${SITE}/location/${v.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...types.map((t) => ({ url: `${SITE}/evenementiel/${t.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...realisations.map((r) => ({ url: `${SITE}/realisations/${r.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
