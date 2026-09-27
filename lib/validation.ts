import { z } from "zod";
import { normalizePhone } from "./phone";

const phone = z
  .string()
  .trim()
  .min(1, "Le numéro de téléphone est obligatoire")
  .refine((v) => normalizePhone(v) !== null, "Numéro invalide (ex. 06 123 45 67)");

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || normalizePhone(v) !== null, "Numéro WhatsApp invalide");

const optionalEmail = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || z.email().safeParse(v).success, "Adresse e-mail invalide");

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Indiquez votre nom"),
  phone,
  whatsapp: optionalPhone,
  email: optionalEmail,
  consent: z.literal(true, { error: "Votre accord est nécessaire pour être recontacté" }),
});

export const publicRequestSchema = contactSchema
  .extend({
    type: z.enum(["sale", "rental", "event", "test_drive", "appointment", "trade_in", "callback", "other"]),
    city: z.string().optional(),
    vehicleId: z.string().optional(),
    subject: z.string().max(200).optional(),
    message: z.string().max(2000).optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    pickupCity: z.string().optional(),
    withDriver: z.boolean().optional(),
    eventType: z.string().optional(),
    eventDate: z.string().optional(),
    eventCity: z.string().optional(),
    venue: z.string().optional(),
    guestsCount: z.number().int().nonnegative().optional(),
    budgetMin: z.number().nonnegative().optional(),
    budgetMax: z.number().nonnegative().optional(),
    serviceIds: z.array(z.string()).optional(),
    details: z.record(z.string(), z.unknown()).optional(),
    sourcePage: z.string().optional(),
    channel: z.enum(["web_form", "whatsapp", "phone", "walk_in", "qr_code", "social", "other"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === "rental") {
      if (!val.startAt || !val.endAt) {
        ctx.addIssue({ code: "custom", path: ["startAt"], message: "Indiquez les dates de départ et de retour" });
      } else if (new Date(val.endAt) <= new Date(val.startAt)) {
        ctx.addIssue({ code: "custom", path: ["endAt"], message: "La date de retour doit être après le départ" });
      }
    }
  });

export type PublicRequestInput = z.infer<typeof publicRequestSchema>;

/** Transforme les erreurs zod en { champ: message } pour l'affichage. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Erreurs métier renvoyées par submit_public_request (SQL) → messages FR. */
export const BUSINESS_ERRORS: Record<string, string> = {
  full_name_required: "Indiquez votre nom.",
  invalid_phone: "Numéro de téléphone invalide.",
  consent_required: "Votre accord est nécessaire pour être recontacté.",
  vehicle_not_found: "Ce véhicule n'est plus disponible.",
  invalid_rental_period: "Période de location invalide.",
  rental_period_in_past: "La date de départ est déjà passée.",
};
