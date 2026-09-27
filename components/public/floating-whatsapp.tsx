"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/db/mock-backend";
import type { BusinessSettings, Pole } from "@/lib/types";
import { buildWhatsAppLink, whatsappNumber } from "@/lib/whatsapp";

/** Bouton WhatsApp permanent (§68) — oriente vers le numéro du pôle consulté. */
export function FloatingWhatsApp({ settings }: { settings: BusinessSettings }) {
  const pathname = usePathname();
  const pole: Pole | undefined = pathname.startsWith("/location")
    ? "rental"
    : pathname.startsWith("/evenementiel") || pathname.startsWith("/realisations")
      ? "event"
      : pathname.startsWith("/vehicules")
        ? "sale"
        : undefined;
  if (pathname.startsWith("/devis")) return null;
  return (
    <a
      href={buildWhatsAppLink(whatsappNumber(settings, pole), "Bonjour BRYAN MULTISERVICES, j'ai une question.")}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp_click", { props: { pole: pole ?? "general", source: "fab" } })}
      className="no-print fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-white shadow-lg shadow-black/20 transition hover:scale-105 lg:bottom-6"
      aria-label="Nous écrire sur WhatsApp"
    >
      <MessageCircle className="size-7" />
    </a>
  );
}
