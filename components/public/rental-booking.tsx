"use client";

import { useEffect, useMemo, useState } from "react";
import { rememberView } from "@/lib/db/public-db";
import { trackEvent } from "@/lib/db/mock-backend";
import { formatDate, formatXAF } from "@/lib/format";
import { dayInput, toIso, useBookings, useHydrated } from "@/lib/hooks";
import { applyRentalPromotion, estimateRental, rentalAvailability } from "@/lib/rules/rental";
import { usePromotions } from "@/lib/data/live";
import { useNow } from "@/lib/hooks";
import type { Promotion, PublicRequestPayload, Vehicle } from "@/lib/types";
import { fillTemplate } from "@/lib/whatsapp";
import { Button, Field, Spinner, cn } from "../ui";
import { AvailabilityBadge } from "./availability-badge";
import { CallButton, WhatsAppButton } from "./contact-links";
import { ContactFields, EMPTY_CONTACT, RequestSuccess, contactPayload, validateAndSubmit, type ContactValue, type SubmitState } from "./request-form";

/** Réservation location : dates → disponibilité (R3) → estimation (R5) → demande (§24). */
export function RentalBooking({
  vehicle,
  title,
  cities,
  whatsappNumber,
  phoneNumber,
  whatsappTemplate,
  promotions = [],
}: {
  vehicle: Vehicle;
  title: string;
  cities: string[];
  whatsappNumber: string;
  phoneNumber: string;
  whatsappTemplate: string;
  promotions?: Promotion[];
}) {
  const rates = vehicle.rental!;
  const bookings = useBookings();
  const hydrated = useHydrated();
  const [startDraft, setStart] = useState("");
  const [endDraft, setEnd] = useState("");
  // Dates par défaut : demain → +3 j, calculées dans le navigateur (jamais figées à la compilation).
  const start = startDraft || (hydrated ? dayInput(1) : "");
  const end = endDraft || (hydrated ? dayInput(3) : "");
  const [withDriver, setWithDriver] = useState(rates.withDriver && !rates.selfDrive ? true : rates.withDriver);
  const [city, setCity] = useState(rates.cities[0] ?? cities[0] ?? "");
  const [comment, setComment] = useState("");
  const [contact, setContact] = useState<ContactValue>(EMPTY_CONTACT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  useEffect(() => {
    void rememberView({ id: `rent-${vehicle.id}`, kind: "rental", slug: vehicle.slug, title: `${vehicle.brand} ${vehicle.model} (location)` });
    void trackEvent("rental_view", { objectType: "vehicle", objectId: vehicle.id });
  }, [vehicle.id, vehicle.slug, vehicle.brand, vehicle.model]);

  const startIso = toIso(start);
  const endIso = toIso(end);
  const valid = !!startIso && !!endIso && endIso > startIso;
  const promos = usePromotions(promotions);
  const now = useNow();
  const estimate = useMemo(() => {
    if (!valid) return null;
    const base = estimateRental(rates, startIso!, endIso!, withDriver);
    return base && now ? applyRentalPromotion(base, promos, vehicle.id, startIso!, now).estimate : base;
  }, [rates, startIso, endIso, withDriver, valid, promos, vehicle.id, now]);
  // eslint-disable-next-line react-hooks/purity -- disponibilité évaluée à l'instant du rendu
  const availability = bookings && valid ? rentalAvailability(vehicle, bookings, startIso!, endIso!, Date.now()) : undefined;
  const waMessage = fillTemplate(whatsappTemplate, {
    vehicule: `${title}${withDriver ? " avec chauffeur" : ""}`,
    date_debut: formatDate(startIso, { year: undefined, month: "long" }),
    date_fin: formatDate(endIso, { year: undefined, month: "long" }),
    url: typeof location !== "undefined" ? location.href : "",
  });

  if (state.kind === "sent" || state.kind === "queued") {
    return (
      <div className="card p-5">
        <RequestSuccess state={state} whatsappNumber={whatsappNumber}>
          <p className="text-sm text-muted">Nous vérifions la disponibilité et vous confirmons la réservation.</p>
        </RequestSuccess>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: PublicRequestPayload = {
      ...contactPayload(contact),
      type: "rental",
      vehicleId: vehicle.id,
      startAt: startIso,
      endAt: endIso,
      pickupCity: city,
      withDriver,
      message: comment || undefined,
      details: estimate ? { estimate: estimate.total, days: estimate.days } : {},
      sourcePage: location.pathname,
    };
    setErrors(await validateAndSubmit(payload, `Location ${title} — ${start} → ${end}`, setState));
  };

  return (
    <form onSubmit={submit} className="card space-y-5 p-5" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Départ">
          <input type="date" className="input" min={hydrated ? dayInput(0) : undefined} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Retour" error={!valid && start && end ? "Après le départ" : errors.endAt}>
          <input type="date" className="input" min={start} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Lieu de prise en charge">
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            {(rates.cities.length ? rates.cities : cities).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-medium">Chauffeur</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-paper p-1">
            {[
              [true, "Avec", rates.withDriver],
              [false, "Sans", rates.selfDrive],
            ].map(([val, label, enabled]) => (
              <button
                key={String(val)}
                type="button"
                disabled={!enabled}
                onClick={() => setWithDriver(val as boolean)}
                className={cn("rounded-lg py-2 text-sm font-semibold transition disabled:opacity-40", withDriver === val ? "bg-white shadow-sm" : "text-muted")}
              >
                {label as string}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-rent-soft p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Estimation indicative</p>
          {availability ? <AvailabilityBadge value={availability} /> : valid && <Spinner className="text-rent" />}
        </div>
        {estimate ? (
          <>
            <ul className="mt-2 space-y-1 text-sm">
              {estimate.breakdown.map((b) => (
                <li key={b.label} className={b.amount < 0 ? "flex justify-between font-semibold text-emerald-700" : "flex justify-between"}>
                  <span className={b.amount < 0 ? "" : "text-muted"}>{b.amount < 0 ? `🎁 ${b.label}` : b.label}</span>
                  <span>{b.amount < 0 ? `–${formatXAF(-b.amount)}` : formatXAF(b.amount)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 flex items-baseline justify-between border-t border-rent/20 pt-2">
              <span className="font-semibold">Total ({estimate.days} j)</span>
              <span className="text-xl font-extrabold">{formatXAF(estimate.total)}</span>
            </p>
            {estimate.deposit ? <p className="mt-1 text-xs text-muted">Caution : {formatXAF(estimate.deposit)} — prix final confirmé par le conseiller.</p> : null}
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">Choisissez vos dates.</p>
        )}
        {availability === "unavailable" && <p className="mt-2 text-sm font-medium text-rose-700">Déjà réservé sur cette période : envoyez quand même la demande, nous vous proposerons une alternative.</p>}
      </div>

      <ContactFields value={contact} onChange={setContact} errors={errors} />
      <Field label="Commentaire (facultatif)">
        <textarea className="input min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Itinéraire, horaires, nombre de passagers…" />
      </Field>
      {state.kind === "error" && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.message}</p>}
      <Button type="submit" variant="rent" size="lg" className="w-full" disabled={state.kind === "sending" || !valid}>
        {state.kind === "sending" && <Spinner />} Demander cette location
      </Button>
      <div className="grid grid-cols-2 gap-2.5">
        <WhatsAppButton number={whatsappNumber} message={waMessage} pole="rental" objectId={vehicle.id} />
        <CallButton number={phoneNumber} pole="rental" />
      </div>
    </form>
  );
}
