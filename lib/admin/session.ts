"use client";

// Session admin de démonstration (sera remplacée par Supabase Auth).

import { useSyncExternalStore } from "react";
import { staffUsers } from "../mock/catalog";
import { can } from "../permissions";
import type { Permission, StaffUser } from "../types";

const KEY = "bm-admin-user";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function signIn(userId: string) {
  localStorage.setItem(KEY, userId);
  listeners.forEach((l) => l());
}

export function signOut() {
  localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** undefined = pas encore hydraté, null = déconnecté */
export function useAdminUser(): StaffUser | null | undefined {
  const id = useSyncExternalStore(subscribe, read, () => undefined as unknown as string | null);
  if (id === undefined) return undefined;
  if (id === null) return null;
  return staffUsers.find((u) => u.id === id && u.isActive) ?? null;
}

export function useCan(user: StaffUser | null | undefined, permission: Permission): boolean {
  return can(user?.roleId, permission);
}
