"use client";

import { Download, WifiOff, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { flushOutbox } from "@/lib/data/requests";
import { trackEvent } from "@/lib/db/mock-backend";

/** Enregistre le service worker (public/sw.js) et rejoue la file d'envoi au retour du réseau. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onOnline = () => void flushOutbox();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);
  return null;
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="no-print sticky top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-ink">
      <WifiOff className="size-4" />
      Hors-ligne — les pages déjà consultées restent disponibles, vos demandes partiront au retour du réseau.
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Proposition d'installation discrète — jamais imposée (docs/01). */
export function InstallPrompt({ label = "Installer l'application" }: { label?: string }) {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!event || dismissed) return null;
  return (
    <div className="no-print fixed inset-x-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink p-3 pl-4 text-white shadow-2xl lg:bottom-6">
      <Download className="size-5 shrink-0 text-gold" />
      <p className="flex-1 text-sm">Accès rapide depuis votre écran d&apos;accueil, même avec un réseau faible.</p>
      <button
        type="button"
        className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-ink"
        onClick={async () => {
          await event.prompt();
          const choice = await event.userChoice;
          if (choice.outcome === "accepted") void trackEvent("pwa_install");
          setEvent(null);
        }}
      >
        {label}
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="rounded-lg p-1.5 text-white/60 hover:text-white" aria-label="Plus tard">
        <X className="size-4" />
      </button>
    </div>
  );
}
