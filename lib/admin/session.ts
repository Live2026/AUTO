"use client";

// Session admin de démonstration (sera remplacée par Supabase Auth).

import { useSyncExternalStore } from "react";

const KEY = "bm-admin-user";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function signIn(userId: string) {
  localStorage.setItem(KEY, userId);
  emit();
}

export function signOut() {
  localStorage.removeItem(KEY);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** undefined = pas encore hydraté, null = déconnecté, sinon l'id de l'employé */
export function useAdminUserId(): string | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined as unknown as string | null);
}

// Préférence : barre latérale repliée (par appareil)
const SIDEBAR_KEY = "bm-sidebar-collapsed";
const sidebarListeners = new Set<() => void>();

export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      sidebarListeners.add(cb);
      return () => sidebarListeners.delete(cb);
    },
    () => {
      try {
        return localStorage.getItem(SIDEBAR_KEY) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const set = (v: boolean) => {
    try {
      localStorage.setItem(SIDEBAR_KEY, v ? "1" : "0");
    } catch {
      /* stockage indisponible */
    }
    sidebarListeners.forEach((l) => l());
  };
  return [value, set];
}
