"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "@/lib/db/mock-backend";
import { buttonClass } from "../ui";

/** Partage natif (WhatsApp, Facebook… via le menu du téléphone) ou copie du lien (§47). */
export function ShareButton({ title, text, path, variant = "outline", className }: { title: string; text?: string; path: string; variant?: "outline" | "ghost" | "gold"; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={buttonClass(variant, "md", className)}
      onClick={async () => {
        const url = `${location.origin}${path}`;
        void trackEvent("share_click", { path });
        if (navigator.share) {
          try {
            await navigator.share({ title, text: text ?? title, url });
          } catch {
            /* partage annulé */
          }
        } else {
          await navigator.clipboard?.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />} {copied ? "Lien copié" : "Partager"}
    </button>
  );
}
