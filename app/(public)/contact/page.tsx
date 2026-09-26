import type { Metadata } from "next";
import { Clock, Mail, MapPin } from "lucide-react";
import { CallButton, WhatsAppButton } from "@/components/public/contact-links";
import { RequestForm } from "@/components/public/request-form";
import { getSettings } from "@/lib/data/catalog";
import { formatPhone } from "@/lib/phone";
import { phoneNumber, whatsappNumber } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contactez BRYAN MULTISERVICES par WhatsApp, téléphone ou formulaire. Réponse rapide.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage(props: PageProps<"/contact">) {
  const { sujet } = await props.searchParams;
  const settings = await getSettings();
  const poles = [
    ["Vente automobile", "sale"],
    ["Location", "rental"],
    ["Événementiel", "event"],
  ] as const;
  return (
    <div className="container-page py-10">
      <p className="eyebrow text-gold">Contact</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Parlons de votre projet</h1>
      <p className="mt-2 max-w-2xl text-muted">Le plus rapide : WhatsApp. Vous pouvez aussi nous appeler ou laisser un message, un conseiller vous rappelle.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          {poles.map(([label, pole]) => (
            <div key={pole} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-bold">{label}</p>
                <p className="text-sm text-muted">{formatPhone(settings.contactPhones[pole] ?? settings.contactPhones.default)}</p>
              </div>
              <div className="flex gap-2">
                <WhatsAppButton number={whatsappNumber(settings, pole)} size="sm" pole={pole} message={`Bonjour BRYAN MULTISERVICES (${label}), j'ai une question.`} />
                <CallButton number={phoneNumber(settings, pole)} size="sm" pole={pole} />
              </div>
            </div>
          ))}
          <div className="card space-y-3 p-5 text-sm">
            <p className="flex gap-2"><MapPin className="size-4 shrink-0 text-gold" />{settings.company.address}, {settings.company.city}</p>
            <p className="flex gap-2"><Clock className="size-4 shrink-0 text-gold" />{settings.company.hours}</p>
            <p className="flex gap-2"><Mail className="size-4 shrink-0 text-gold" />{settings.company.email}</p>
            <div className="aspect-[16/9] overflow-hidden rounded-xl bg-[linear-gradient(135deg,#dfe7ef,#c7d4e2)]">
              <div className="grid size-full place-items-center text-center text-sm text-zinc-600">
                <p><MapPin className="mx-auto mb-1 size-6 text-rose-600" />Carte interactive (Google Maps / OpenStreetMap)<br />ajoutée à la mise en production</p>
              </div>
            </div>
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-bold">Envoyer un message</h2>
          <RequestForm
            type="other"
            summary="Message de contact"
            whatsappNumber={whatsappNumber(settings)}
            extras={["subject"]}
            messageLabel="Votre message"
            defaultMessage={typeof sujet === "string" ? `Sujet : ${sujet}\n` : ""}
            basePayload={{ subject: typeof sujet === "string" ? sujet : undefined }}
          />
        </div>
      </div>
    </div>
  );
}
