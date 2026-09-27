"use client";

import { CheckCircle2, CloudOff, Copy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { submitRequest } from "@/lib/data/requests";
import { BusinessError, trackEvent } from "@/lib/db/mock-backend";
import type { PublicRequestPayload, RequestType } from "@/lib/types";
import { BUSINESS_ERRORS, fieldErrors, publicRequestSchema } from "@/lib/validation";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { Button, Field, Spinner, buttonClass, cn } from "../ui";

export interface ContactValue {
  fullName: string;
  phone: string;
  sameWhatsapp: boolean;
  whatsapp: string;
  email: string;
  consent: boolean;
}

export const EMPTY_CONTACT: ContactValue = { fullName: "", phone: "", sameWhatsapp: true, whatsapp: "", email: "", consent: false };

/** Champs de contact communs (§8) : courts, WhatsApp = téléphone par défaut, e-mail facultatif. */
export function ContactFields({
  value,
  onChange,
  errors,
}: {
  value: ContactValue;
  onChange: (v: ContactValue) => void;
  errors: Record<string, string>;
}) {
  const set = <K extends keyof ContactValue>(k: K, v: ContactValue[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-4">
      <Field label="Nom et prénom" error={errors.fullName}>
        <input className="input" autoComplete="name" value={value.fullName} onChange={(e) => set("fullName", e.target.value)} />
      </Field>
      <Field label="Téléphone" error={errors.phone} hint="Ex. 06 123 45 67">
        <input className="input" type="tel" inputMode="tel" autoComplete="tel" value={value.phone} onChange={(e) => set("phone", e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-ink" checked={value.sameWhatsapp} onChange={(e) => set("sameWhatsapp", e.target.checked)} />
        Mon numéro WhatsApp est le même
      </label>
      {!value.sameWhatsapp && (
        <Field label="Numéro WhatsApp" error={errors.whatsapp}>
          <input className="input" type="tel" inputMode="tel" value={value.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
        </Field>
      )}
      <Field label="E-mail (facultatif)" error={errors.email}>
        <input className="input" type="email" inputMode="email" autoComplete="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <label className="flex items-start gap-2 text-sm text-zinc-600">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-ink" checked={value.consent} onChange={(e) => set("consent", e.target.checked)} />
        <span>
          J&apos;accepte que BRYAN MULTISERVICES utilise mes coordonnées pour traiter ma demande et me recontacter.{" "}
          <Link href="/confidentialite" className="underline" target="_blank">En savoir plus</Link>
        </span>
      </label>
      {errors.consent && <p className="-mt-2 text-xs font-medium text-rose-600">{errors.consent}</p>}
    </div>
  );
}

export function contactPayload(c: ContactValue): Pick<PublicRequestPayload, "fullName" | "phone" | "whatsapp" | "email" | "consent"> {
  return {
    fullName: c.fullName,
    phone: c.phone,
    whatsapp: c.sameWhatsapp ? undefined : c.whatsapp,
    email: c.email || undefined,
    consent: c.consent,
  };
}

export type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; reference: string; trackingToken: string }
  | { kind: "queued" }
  | { kind: "error"; message: string };

/** Valide + envoie une demande ; retourne les erreurs de champ éventuelles. */
export async function validateAndSubmit(
  payload: PublicRequestPayload,
  summary: string,
  setState: (s: SubmitState) => void,
): Promise<Record<string, string>> {
  const parsed = publicRequestSchema.safeParse(payload);
  if (!parsed.success) return fieldErrors(parsed.error);
  setState({ kind: "sending" });
  try {
    const outcome = await submitRequest(payload, summary);
    if (outcome.status === "queued") setState({ kind: "queued" });
    else setState({ kind: "sent", reference: outcome.result.reference, trackingToken: outcome.result.trackingToken });
  } catch (e) {
    const message = e instanceof BusinessError ? BUSINESS_ERRORS[e.code] ?? e.message : "L'envoi a échoué. Réessayez ou contactez-nous sur WhatsApp.";
    setState({ kind: "error", message });
  }
  return {};
}

export function RequestSuccess({
  state,
  whatsappNumber,
  children,
}: {
  state: Extract<SubmitState, { kind: "sent" } | { kind: "queued" }>;
  whatsappNumber: string;
  children?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  if (state.kind === "queued") {
    return (
      <div className="space-y-3 text-center">
        <CloudOff className="mx-auto size-12 text-amber-500" />
        <p className="text-lg font-bold">Demande enregistrée sur votre téléphone</p>
        <p className="text-sm text-muted">Vous êtes hors-ligne : elle sera envoyée automatiquement dès le retour du réseau.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
      <div>
        <p className="text-lg font-bold">Demande enregistrée</p>
        <p className="text-sm text-muted">Un conseiller vous contacte très rapidement.</p>
      </div>
      <div className="mx-auto flex max-w-xs items-center justify-between gap-2 rounded-xl bg-paper px-4 py-3">
        <span className="text-left">
          <span className="block text-xs text-muted">Référence</span>
          <span className="font-mono text-lg font-bold">{state.reference}</span>
        </span>
        <button
          type="button"
          className="rounded-lg p-2 hover:bg-black/5"
          onClick={() => {
            void navigator.clipboard?.writeText(state.reference);
            setCopied(true);
          }}
          aria-label="Copier la référence"
        >
          {copied ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </button>
      </div>
      {children}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <a
          className={buttonClass("whatsapp")}
          target="_blank"
          rel="noopener noreferrer"
          href={buildWhatsAppLink(whatsappNumber, `Bonjour BRYAN MULTISERVICES, je vous contacte au sujet de ma demande ${state.reference}.`)}
          onClick={() => trackEvent("whatsapp_click", { props: { source: "request_success" } })}
        >
          <MessageCircle className="size-4" /> Accélérer sur WhatsApp
        </a>
        <Link className={buttonClass("outline")} href={`/suivi/${state.trackingToken}`}>
          Suivre ma demande
        </Link>
      </div>
    </div>
  );
}

type Extra = "slot" | "tradeIn" | "subject";

/** Compression locale (1280 px, WebP) avant envoi — la data mobile coûte cher. */
async function compressPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.75);
}

/** Formulaire de demande générique (intérêt, RDV, essai, rappel, contact, reprise). */
export function RequestForm({
  type,
  basePayload,
  summary,
  whatsappNumber,
  submitLabel = "Envoyer ma demande",
  extras = [],
  messageLabel = "Message (facultatif)",
  messagePlaceholder,
  defaultMessage = "",
}: {
  type: RequestType;
  basePayload?: Partial<PublicRequestPayload>;
  summary: string;
  whatsappNumber: string;
  submitLabel?: string;
  extras?: Extra[];
  messageLabel?: string;
  messagePlaceholder?: string;
  defaultMessage?: string;
}) {
  const [contact, setContact] = useState<ContactValue>(EMPTY_CONTACT);
  const [message, setMessage] = useState(defaultMessage);
  const [subject, setSubject] = useState("");
  const [slot, setSlot] = useState("");
  const [trade, setTrade] = useState({ brand: "", model: "", year: "", mileageKm: "", condition: "Bon état" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitState>({ kind: "idle" });
  const [started, setStarted] = useState(false);

  if (state.kind === "sent" || state.kind === "queued") return <RequestSuccess state={state} whatsappNumber={whatsappNumber} />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const details: Record<string, unknown> = { ...(basePayload?.details ?? {}) };
    if (extras.includes("slot") && slot) details.preferredSlot = slot;
    if (extras.includes("tradeIn")) Object.assign(details, trade, { year: Number(trade.year) || undefined, mileageKm: Number(trade.mileageKm) || undefined, photos });
    const payload: PublicRequestPayload = {
      ...basePayload,
      ...contactPayload(contact),
      type,
      subject: subject || basePayload?.subject,
      message: message || undefined,
      details,
      sourcePage: typeof location !== "undefined" ? location.pathname : undefined,
    };
    setErrors(await validateAndSubmit(payload, summary, setState));
  };

  return (
    <form
      onSubmit={onSubmit}
      onFocus={() => {
        if (!started) {
          setStarted(true);
          void trackEvent("form_start", { props: { type } });
        }
      }}
      className="space-y-4"
      noValidate
    >
      {extras.includes("subject") && (
        <Field label="Objet">
          <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Choisir…</option>
            <option>Achat d&apos;un véhicule</option>
            <option>Location</option>
            <option>Événement</option>
            <option>Recherche d&apos;un véhicule sur commande</option>
            <option>Autre</option>
          </select>
        </Field>
      )}
      {extras.includes("tradeIn") && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marque"><input className="input" value={trade.brand} onChange={(e) => setTrade({ ...trade, brand: e.target.value })} /></Field>
          <Field label="Modèle"><input className="input" value={trade.model} onChange={(e) => setTrade({ ...trade, model: e.target.value })} /></Field>
          <Field label="Année"><input className="input" inputMode="numeric" value={trade.year} onChange={(e) => setTrade({ ...trade, year: e.target.value })} /></Field>
          <Field label="Kilométrage"><input className="input" inputMode="numeric" value={trade.mileageKm} onChange={(e) => setTrade({ ...trade, mileageKm: e.target.value })} /></Field>
          <Field label="État" className="col-span-2">
            <select className="input" value={trade.condition} onChange={(e) => setTrade({ ...trade, condition: e.target.value })}>
              <option>Excellent état</option>
              <option>Bon état</option>
              <option>État correct</option>
              <option>À réparer</option>
            </select>
          </Field>
          <div className="col-span-2">
            <span className="mb-1.5 block text-sm font-medium">Photos du véhicule (facultatif, 6 max.)</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line p-4 text-sm font-semibold text-muted hover:border-ink/40">
              📷 Ajouter des photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []).slice(0, 6 - photos.length);
                  e.target.value = "";
                  const urls = await Promise.all(files.map((f) => compressPhoto(f)));
                  setPhotos((p) => [...p, ...urls].slice(0, 6));
                }}
              />
            </label>
            {photos.length > 0 && (
              <div className="mt-2 grid grid-cols-6 gap-1.5">
                {photos.map((src, i) => (
                  <button key={i} type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} className="relative aspect-square overflow-hidden rounded-lg" aria-label="Retirer la photo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local */}
                    <img src={src} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted">Photos compressées sur votre téléphone avant l&apos;envoi (économie de data).</p>
          </div>
        </div>
      )}
      {extras.includes("slot") && (
        <Field label="Quand êtes-vous disponible ?">
          <select className="input" value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="">Indifférent</option>
            <option>En semaine, le matin</option>
            <option>En semaine, l&apos;après-midi</option>
            <option>Samedi matin</option>
            <option>Samedi après-midi</option>
          </select>
        </Field>
      )}
      <ContactFields value={contact} onChange={setContact} errors={errors} />
      <Field label={messageLabel}>
        <textarea className="input min-h-24" value={message} placeholder={messagePlaceholder} onChange={(e) => setMessage(e.target.value)} />
      </Field>
      {state.kind === "error" && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{state.message}</p>}
      <Button type="submit" variant="primary" size="lg" className={cn("w-full")} disabled={state.kind === "sending"}>
        {state.kind === "sending" && <Spinner />} {submitLabel}
      </Button>
    </form>
  );
}
