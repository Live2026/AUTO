"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ensureSeeded, listBookings } from "./db/mock-backend";
import type { VehicleBooking } from "./types";

/** Occupations véhicules (mock : IndexedDB ; Supabase : RPC rental_availability). */
export function useBookings(): VehicleBooking[] | undefined {
  const [bookings, setBookings] = useState<VehicleBooking[]>();
  useEffect(() => {
    let alive = true;
    ensureSeeded()
      .then(() => listBookings())
      .then((b) => alive && setBookings(b))
      .catch(() => alive && setBookings([]));
    return () => {
      alive = false;
    };
  }, []);
  return bookings;
}

/** Date du jour + n jours au format yyyy-mm-dd (heure locale). */
export function dayInput(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toIso(date: string, time = "08:00"): string | undefined {
  if (!date) return undefined;
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

// Horloge partagée (mise à jour chaque minute) — évite Date.now() pendant le rendu.
let clock = typeof window === "undefined" ? 0 : Date.now();
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | undefined;

function subscribeClock(cb: () => void) {
  clockListeners.add(cb);
  if (!clockTimer) {
    clock = Date.now();
    clockTimer = setInterval(() => {
      clock = Date.now();
      clockListeners.forEach((l) => l());
    }, 60_000);
  }
  return () => {
    clockListeners.delete(cb);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

export function useNow(): number {
  return useSyncExternalStore(subscribeClock, () => clock, () => 0);
}

const noopSubscribe = () => () => undefined;

/** true une fois dans le navigateur (après hydratation) — pour les valeurs dépendant de la date/du fuseau. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
