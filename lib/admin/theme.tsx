"use client";

// Thème de l'espace de gestion : clair, sombre ou automatique (suit l'appareil).
// Préférence enregistrée par appareil ; appliquée via html[data-theme].

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { cn } from "@/components/ui";

export type ThemePref = "light" | "dark" | "system";

const KEY = "bm-theme";
const listeners = new Set<() => void>();
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(pref: ThemePref): "light" | "dark" {
  if (pref !== "system") return pref;
  return typeof window !== "undefined" && window.matchMedia?.(DARK_QUERY).matches ? "dark" : "light";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia?.(DARK_QUERY);
  mq?.addEventListener("change", cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    mq?.removeEventListener("change", cb);
    window.removeEventListener("storage", cb);
  };
}

export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as ThemePref);
  const set = (p: ThemePref) => {
    try {
      localStorage.setItem(KEY, p);
    } catch {
      /* stockage indisponible */
    }
    listeners.forEach((l) => l());
  };
  return [pref, set];
}

/** Applique le thème tant que l'on est dans l'espace de gestion ; le site public reste clair. */
export function ThemeSync() {
  const dark = useSyncExternalStore(subscribe, () => resolve(readPref()) === "dark", () => false);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    return () => {
      delete root.dataset.theme;
    };
  }, [dark]);
  return null;
}

const OPTIONS: [ThemePref, string, typeof Sun][] = [
  ["light", "Clair", Sun],
  ["dark", "Sombre", Moon],
  ["system", "Auto", Monitor],
];

/** Sélecteur segmenté Clair / Sombre / Auto. */
export function ThemeSwitcher({ className, compact }: { className?: string; compact?: boolean }) {
  const [pref, setPref] = useThemePref();
  return (
    <div role="radiogroup" aria-label="Thème" className={cn("grid grid-cols-3 gap-1 rounded-xl bg-paper p-1 ring-1 ring-line", className)}>
      {OPTIONS.map(([value, label, Icon]) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          onClick={() => setPref(value)}
          title={value === "system" ? "Suivre le réglage de l'appareil" : `Thème ${label.toLowerCase()}`}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition",
            pref === value ? "bg-white text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
          )}
        >
          <Icon className="size-3.5" />
          {!compact && label}
        </button>
      ))}
    </div>
  );
}
