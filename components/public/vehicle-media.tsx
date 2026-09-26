"use client";

import { useVehicleImages } from "@/lib/data/live";
import type { BodyType, MediaImage } from "@/lib/types";
import { cn } from "../ui";
import { VehicleVisual } from "./vehicle-visual";

/** Photo principale du véhicule si disponible, sinon illustration (B1). */
export function VehicleMedia({
  vehicleId,
  images,
  bodyType,
  colorHex,
  label,
  variant,
  className,
}: {
  vehicleId: string;
  images: MediaImage[];
  bodyType: BodyType;
  colorHex: string;
  label: string;
  variant?: number;
  className?: string;
}) {
  const imgs = useVehicleImages(vehicleId, images);
  if (imgs[0]) {
    // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage (transformations) ou data URL en démo
    return <img src={imgs[0].url} alt={imgs[0].alt || label} loading="lazy" decoding="async" className={cn("size-full object-cover", className)} />;
  }
  return <VehicleVisual bodyType={bodyType} colorHex={colorHex} variant={variant} label={label} className={className} />;
}
