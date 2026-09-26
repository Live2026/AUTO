"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { trackEvent } from "@/lib/db/mock-backend";
import { dayInput, toIso, useBookings } from "@/lib/hooks";
import { rentalAvailability, type Availability } from "@/lib/rules/rental";
import type { Vehicle, VehicleCategory } from "@/lib/types";
import { Button, Field, cn } from "../ui";
import { AvailabilityBadge } from "./availability-badge";
import { RentalCard } from "./vehicle-card";

type Driver = "" | "with" | "without";
type Duration = "" | "courte" | "longue";

export function RentalSearch({
  vehicles,
  categories,
  cities,
  initialDriver = "",
  initialDuration = "",
}: {
  vehicles: Vehicle[];
  categories: VehicleCategory[];
  cities: string[];
  initialDriver?: Driver;
  initialDuration?: Duration;
}) {
  const bookings = useBookings();
  const [form, setForm] = useState({
    start: dayInput(1),
    end: dayInput(initialDuration === "longue" ? 31 : 3),
    city: "",
    category: "",
    driver: initialDriver,
    duration: initialDuration,
  });
  const [query, setQuery] = useState(form);

  const results = useMemo(() => {
    const start = toIso(query.start);
    const end = toIso(query.end);
    return vehicles
      .filter((v) => {
        const r = v.rental!;
        if (query.category && categories.find((c) => c.id === v.categoryId)?.slug !== query.category) return false;
        if (query.driver === "with" && !r.withDriver) return false;
        if (query.driver === "without" && !r.selfDrive) return false;
        if (query.city && r.cities.length > 0 && !r.cities.includes(query.city)) return false;
        // Longue durée : véhicules proposant un tarif semaine ou mois (§21)
        if (query.duration === "longue" && !r.weeklyRate && !r.monthlyRate) return false;
        return true;
      })
      .map((v) => {
        let availability: Availability | undefined;
        // eslint-disable-next-line react-hooks/purity -- calcul de disponibilité à l'instant de la recherche
        if (bookings && start && end && end > start) availability = rentalAvailability(v, bookings, start, end, Date.now());
        return { vehicle: v, availability };
      })
      .sort((a, b) => rank(a.availability) - rank(b.availability));
  }, [vehicles, categories, bookings, query]);

  const invalid = !!form.start && !!form.end && form.end <= form.start;

  return (
    <div>
      <form
        className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-7 lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid) return;
          setQuery(form);
          void trackEvent("search", { props: { pole: "rental", ...form } });
        }}
      >
        <Field label="Départ" className="lg:col-span-1">
          <input type="date" className="input" min={dayInput(0)} value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
        </Field>
        <Field label="Retour" error={invalid ? "Après la date de départ" : undefined}>
          <input type="date" className="input" min={form.start} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
        </Field>
        <Field label="Ville">
          <select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
            <option value="">Toutes</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Catégorie">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Chauffeur">
          <select className="input" value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value as Driver })}>
            <option value="">Indifférent</option>
            <option value="with">Avec chauffeur</option>
            <option value="without">Sans chauffeur</option>
          </select>
        </Field>
        <Field label="Durée">
          <select
            className="input"
            value={form.duration}
            onChange={(e) => {
              const duration = e.target.value as Duration;
              setForm({ ...form, duration, end: duration === "longue" ? dayInput(31) : duration === "courte" ? dayInput(3) : form.end });
            }}
          >
            <option value="">Indifférente</option>
            <option value="courte">Courte (jours)</option>
            <option value="longue">Longue (semaine, mois)</option>
          </select>
        </Field>
        <Button type="submit" variant="rent" size="md" className="w-full">
          <Search className="size-4" /> Rechercher
        </Button>
      </form>

      <p className="mt-6 mb-3 text-sm text-muted">
        <strong className="text-ink">{results.length}</strong> véhicule{results.length > 1 ? "s" : ""} · du {new Date(`${query.start}T08:00`).toLocaleDateString("fr-FR")} au {new Date(`${query.end}T08:00`).toLocaleDateString("fr-FR")}
      </p>
      <h2 className="sr-only">Véhicules disponibles à la location</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(({ vehicle, availability }) => (
          <div key={vehicle.id} className={cn("relative", availability === "unavailable" && "[&_a:first-child]:grayscale")}>
            <RentalCard vehicle={vehicle} />
            {availability && <AvailabilityBadge value={availability} className="absolute top-3 right-3 shadow" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function rank(a?: Availability) {
  return a === "available" ? 0 : a === "on_request" ? 1 : a === "unavailable" ? 2 : 0;
}
