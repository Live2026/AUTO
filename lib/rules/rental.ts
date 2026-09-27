import type { BookingStatus, RentalRates, Vehicle, VehicleBooking } from "../types";

export type Availability = "available" | "on_request" | "unavailable";

const BLOCKING: BookingStatus[] = ["hold", "confirmed", "in_progress"];

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

export function isBlocking(b: VehicleBooking, now: number): boolean {
  if (!BLOCKING.includes(b.status)) return false;
  if (b.status === "hold" && b.holdExpiresAt && new Date(b.holdExpiresAt).getTime() < now) return false;
  return true;
}

/** R3 — disponibilité d'un véhicule sur une période (même logique que rental_availability SQL). */
export function rentalAvailability(
  vehicle: Vehicle,
  bookings: VehicleBooking[],
  start: string,
  end: string,
  now: number,
): Availability {
  if (!vehicle.isForRent || vehicle.status !== "available") return "unavailable";
  const mine = bookings.filter((b) => b.vehicleId === vehicle.id && isBlocking(b, now));
  if (mine.some((b) => b.status !== "hold" && overlaps(b.start, b.blockedEnd, start, end))) return "unavailable";
  if (mine.some((b) => b.status === "hold" && overlaps(b.start, b.blockedEnd, start, end))) return "on_request";
  return "available";
}

/** Retourne la réservation en conflit, s'il y en a une (contrainte d'exclusion SQL). */
export function findConflict(
  bookings: VehicleBooking[],
  candidate: Pick<VehicleBooking, "vehicleId" | "start" | "blockedEnd" | "id">,
  now: number,
): VehicleBooking | undefined {
  return bookings.find(
    (b) =>
      b.id !== candidate.id &&
      b.vehicleId === candidate.vehicleId &&
      isBlocking(b, now) &&
      overlaps(b.start, b.blockedEnd, candidate.start, candidate.blockedEnd),
  );
}

export function rentalDays(start: string, end: string, minDays = 1): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return 0;
  return Math.max(Math.ceil(ms / 86_400_000), minDays);
}

export interface RentalEstimate {
  days: number;
  vehicleAmount: number;
  driverAmount: number;
  total: number;
  deposit?: number;
  breakdown: { label: string; amount: number }[];
}

/** R5 — mois > semaines > jours ; paliers absents → palier inférieur. */
export function estimateRental(
  rates: RentalRates,
  start: string,
  end: string,
  withDriver: boolean,
): RentalEstimate | null {
  const days = rentalDays(start, end, rates.minDays);
  if (days === 0) return null;
  let left = days;
  let amount = 0;
  const breakdown: { label: string; amount: number }[] = [];
  if (rates.monthlyRate) {
    const m = Math.floor(left / 30);
    if (m > 0) {
      amount += m * rates.monthlyRate;
      breakdown.push({ label: `${m} mois`, amount: m * rates.monthlyRate });
    }
    left %= 30;
  }
  if (rates.weeklyRate) {
    const w = Math.floor(left / 7);
    if (w > 0) {
      amount += w * rates.weeklyRate;
      breakdown.push({ label: `${w} semaine${w > 1 ? "s" : ""}`, amount: w * rates.weeklyRate });
    }
    left %= 7;
  }
  if (left > 0) {
    amount += left * rates.dailyRate;
    breakdown.push({ label: `${left} jour${left > 1 ? "s" : ""}`, amount: left * rates.dailyRate });
  }
  const driverAmount = withDriver && rates.driverDailyRate ? days * rates.driverDailyRate : 0;
  if (driverAmount) breakdown.push({ label: `Chauffeur (${days} j)`, amount: driverAmount });
  return { days, vehicleAmount: amount, driverAmount, total: amount + driverAmount, deposit: rates.deposit, breakdown };
}

export function addHours(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

export interface RentalPromotionLike {
  id: string;
  title: string;
  description?: string;
  scope: "sale" | "rental" | "event";
  kind: "percent" | "amount" | "fixed_price" | "label";
  value?: number;
  vehicleId?: string;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}

/**
 * Promotions location (§45) appliquées à l'estimation.
 * - « percent » / « amount » sur le montant véhicule ;
 * - une promo dont le titre contient « week-end » ne s'applique qu'aux locations
 *   commençant le vendredi ou le samedi, de 4 jours maximum ;
 * - on retient la promotion la plus avantageuse (pas de cumul).
 */
export function applyRentalPromotion(
  estimate: RentalEstimate,
  promos: RentalPromotionLike[],
  vehicleId: string,
  start: string,
  now: number,
): { estimate: RentalEstimate; promo?: RentalPromotionLike; discount: number } {
  const startDay = new Date(start).getDay();
  const candidates = promos.filter((p) => {
    if (p.scope !== "rental" || !p.isActive || (p.kind !== "percent" && p.kind !== "amount") || !p.value) return false;
    if (Date.parse(p.startsAt) > now || (p.endsAt && Date.parse(p.endsAt) <= now)) return false;
    if (p.vehicleId && p.vehicleId !== vehicleId) return false;
    if (/week-?end/i.test(p.title) && !((startDay === 5 || startDay === 6) && estimate.days <= 4)) return false;
    return true;
  });
  let best: { promo?: RentalPromotionLike; discount: number } = { discount: 0 };
  for (const p of candidates) {
    const d = p.kind === "percent" ? Math.round((estimate.vehicleAmount * p.value!) / 100) : Math.min(p.value!, estimate.vehicleAmount);
    if (d > best.discount) best = { promo: p, discount: d };
  }
  if (!best.promo) return { estimate, discount: 0 };
  return {
    promo: best.promo,
    discount: best.discount,
    estimate: {
      ...estimate,
      total: estimate.total - best.discount,
      breakdown: [...estimate.breakdown, { label: best.promo.title, amount: -best.discount }],
    },
  };
}
