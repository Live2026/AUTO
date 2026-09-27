import type { BusinessSettings, Pole } from "./types";

export type TemplateVars = Partial<
  Record<"vehicule" | "reference" | "date_debut" | "date_fin" | "type_evenement" | "url", string>
>;

export function fillTemplate(template: string, vars: TemplateVars): string {
  return template
    .replace(/\{(\w+)\}/g, (_, key: keyof TemplateVars) => vars[key] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function whatsappNumber(settings: BusinessSettings, pole?: Pole): string {
  return (pole && settings.whatsappNumbers[pole]) || settings.whatsappNumbers.default || "";
}

export function phoneNumber(settings: BusinessSettings, pole?: Pole): string {
  return (pole && settings.contactPhones[pole]) || settings.contactPhones.default || "";
}

/** Lien wa.me avec message pré-rempli (R10). */
export function buildWhatsAppLink(number: string, message?: string): string {
  const digits = number.replace(/[^0-9]/g, "");
  return message ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : `https://wa.me/${digits}`;
}

export function buildTelLink(number: string): string {
  return `tel:${number.replace(/[^0-9+]/g, "")}`;
}
