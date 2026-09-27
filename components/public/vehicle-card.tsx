import Link from "next/link";
import { ArrowUpRight, Fuel, Gauge, Settings2, Users } from "lucide-react";
import { hasPriceDrop, isNewArrival, vehicleTitle } from "@/lib/data/catalog";
import { formatKm, formatXAF, percentOff } from "@/lib/format";
import { FUEL_LABELS, GEARBOX_LABELS } from "@/lib/labels";
import type { Vehicle } from "@/lib/types";
import { cn } from "../ui";
import { VehicleMedia } from "./vehicle-media";
import { FavoriteButton } from "./favorite-button";

export function VehicleStatusBadges({ vehicle, className }: { vehicle: Vehicle; className?: string }) {
  const drop = hasPriceDrop(vehicle);
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {vehicle.status === "sold" && <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-white">VENDU</span>}
      {vehicle.status === "reserved" && <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-ink">RÉSERVÉ</span>}
      {drop && vehicle.status !== "sold" && (
        <span className="rounded-full bg-rose-700 px-2.5 py-1 text-[11px] font-bold text-white">
          BAISSE –{percentOff(vehicle.previousPrice!, vehicle.salePrice!)} %
        </span>
      )}
      {isNewArrival(vehicle) && vehicle.status === "available" && (
        <span className="rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold text-ink">NOUVEAU</span>
      )}
      {vehicle.condition === "new" && <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white">NEUF</span>}
    </div>
  );
}

export function SalePrice({ vehicle, size = "md" }: { vehicle: Vehicle; size?: "md" | "lg" }) {
  if (!vehicle.priceVisible || !vehicle.salePrice) {
    return <p className={cn("font-bold text-ink", size === "lg" ? "text-2xl" : "text-lg")}>Prix sur demande</p>;
  }
  const drop = hasPriceDrop(vehicle);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <p className={cn("font-extrabold tracking-tight text-ink", size === "lg" ? "text-3xl" : "text-lg")}>{formatXAF(vehicle.salePrice)}</p>
      {drop && <p className="text-sm text-muted line-through">{formatXAF(vehicle.previousPrice)}</p>}
    </div>
  );
}

export function VehicleCard({ vehicle, href }: { vehicle: Vehicle; href?: string }) {
  const url = href ?? `/vehicules/${vehicle.slug}`;
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
      <Link href={url} className="relative block aspect-[16/10] overflow-hidden bg-zinc-100">
        <VehicleMedia vehicleId={vehicle.id} images={vehicle.images} bodyType={vehicle.bodyType} colorHex={vehicle.colorHex} label={vehicleTitle(vehicle)} className="transition duration-500 group-hover:scale-[1.03]" />
        <VehicleStatusBadges vehicle={vehicle} className="absolute top-3 left-3" />
      </Link>
      <div className="absolute top-3 right-3">
        <FavoriteButton
          item={{ id: vehicle.id, kind: "vehicle", slug: vehicle.slug, title: vehicleTitle(vehicle), subtitle: vehicle.version, price: vehicle.salePrice, colorHex: vehicle.colorHex }}
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-muted">{vehicle.reference} · {vehicle.city}</p>
        <h3 className="mt-1 font-bold leading-snug">
          <Link href={url} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {vehicleTitle(vehicle)}
          </Link>
        </h3>
        {vehicle.version && <p className="text-sm text-muted">{vehicle.version}</p>}
        <ul className="mt-3 mb-4 flex flex-wrap gap-1.5 text-[12px] font-medium text-zinc-700">
          <li className="inline-flex items-center gap-1 rounded-lg bg-paper px-2 py-1"><Gauge className="size-3.5 text-muted" />{formatKm(vehicle.mileageKm)}</li>
          <li className="inline-flex items-center gap-1 rounded-lg bg-paper px-2 py-1"><Fuel className="size-3.5 text-muted" />{FUEL_LABELS[vehicle.fuel]}</li>
          <li className="inline-flex items-center gap-1 rounded-lg bg-paper px-2 py-1"><Settings2 className="size-3.5 text-muted" />{GEARBOX_LABELS[vehicle.gearbox]}</li>
          <li className="inline-flex items-center gap-1 rounded-lg bg-paper px-2 py-1"><Users className="size-3.5 text-muted" />{vehicle.seats} pl.</li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          <SalePrice vehicle={vehicle} />
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white transition group-hover:bg-gold group-hover:text-ink" aria-hidden>
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function RentalCard({ vehicle, badge }: { vehicle: Vehicle; badge?: React.ReactNode }) {
  const r = vehicle.rental!;
  return (
    <article className="group card relative flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/5">
      <Link href={`/location/${vehicle.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-zinc-100">
        <VehicleMedia vehicleId={vehicle.id} images={vehicle.images} bodyType={vehicle.bodyType} colorHex={vehicle.colorHex} variant={2} label={vehicleTitle(vehicle)} className="transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {r.withDriver && <span className="rounded-full bg-rent px-2.5 py-1 text-[11px] font-bold text-white">AVEC CHAUFFEUR</span>}
          {r.selfDrive && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-rent">SANS CHAUFFEUR</span>}
        </div>
        {badge && <div className="absolute bottom-3 left-3">{badge}</div>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold">
          <Link href={`/location/${vehicle.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:underline">
            {vehicle.brand} {vehicle.model}
          </Link>
        </h3>
        <p className="text-sm text-muted">{vehicle.seats} places · {GEARBOX_LABELS[vehicle.gearbox]} · {FUEL_LABELS[vehicle.fuel]}{vehicle.airConditioning ? " · Clim" : ""}</p>
        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <p>
            <span className="text-xs text-muted">à partir de</span>
            <span className="block text-lg font-extrabold text-ink">{formatXAF(r.dailyRate)}<span className="text-sm font-medium text-muted"> / jour</span></span>
          </p>
          {r.weeklyRate && <p className="text-right text-xs text-muted">{formatXAF(r.weeklyRate)}<br />/ semaine</p>}
        </div>
      </div>
    </article>
  );
}
