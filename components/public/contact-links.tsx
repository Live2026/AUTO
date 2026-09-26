"use client";

import { MessageCircle, Phone } from "lucide-react";
import { trackEvent } from "@/lib/db/mock-backend";
import { buildTelLink, buildWhatsAppLink } from "@/lib/whatsapp";
import { buttonClass, cn } from "../ui";

type Size = "sm" | "md" | "lg";

export function WhatsAppButton({
  number,
  message,
  label = "WhatsApp",
  size = "md",
  className,
  pole,
  objectId,
  iconOnly,
}: {
  number: string;
  message?: string;
  label?: string;
  size?: Size;
  className?: string;
  pole?: string;
  objectId?: string;
  iconOnly?: boolean;
}) {
  return (
    <a
      href={buildWhatsAppLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("whatsapp_click", { objectId, props: { pole } })}
      className={buttonClass("whatsapp", size, className)}
      aria-label={iconOnly ? label : undefined}
    >
      <MessageCircle className="size-[1.15em]" />
      {!iconOnly && label}
    </a>
  );
}

export function CallButton({
  number,
  label = "Appeler",
  size = "md",
  variant = "outline",
  className,
  pole,
  iconOnly,
}: {
  number: string;
  label?: string;
  size?: Size;
  variant?: "outline" | "primary" | "gold" | "ghost";
  className?: string;
  pole?: string;
  iconOnly?: boolean;
}) {
  return (
    <a
      href={buildTelLink(number)}
      onClick={() => trackEvent("call_click", { props: { pole } })}
      className={cn(buttonClass(variant, size), className)}
      aria-label={iconOnly ? label : undefined}
    >
      <Phone className="size-[1.1em]" />
      {!iconOnly && label}
    </a>
  );
}
