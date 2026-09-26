import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ClipboardList, FileCheck2, MessageCircle, Wand2 } from "lucide-react";
import { DynamicIcon } from "@/components/public/dynamic-icon";
import { RealisationCard } from "@/components/public/realisation-card";
import { LinkButton, SectionHeading } from "@/components/ui";
import { getEventTypes, getPackages, getRealisations } from "@/lib/data/catalog";
import { formatXAF } from "@/lib/format";

export const metadata: Metadata = {
  title: "Événementiel — mariages, entreprises, cérémonies",
  description: "Organisation d'événements au Congo : voitures de mariage, cortèges, transport d'invités, décoration, sonorisation. Devis sur mesure.",
  alternates: { canonical: "/evenementiel" },
};

export default async function EventsPage() {
  const [types, packages, realisations] = await Promise.all([getEventTypes(), getPackages(), getRealisations()]);
  return (
    <>
      <section className="relative overflow-hidden bg-event text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10" />
        <div className="container-page relative py-12 sm:py-16">
          <p className="eyebrow text-white/70">Événementiel</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">Vos événements, orchestrés de A à Z</h1>
          <p className="mt-3 max-w-xl text-white/80">Mobilité, décoration, technique, personnel : composez votre événement, nous vous envoyons un devis détaillé.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href="/evenementiel/creer" variant="gold" size="lg"><Wand2 className="size-5" /> Créer mon événement</LinkButton>
            <LinkButton href="/evenementiel/prestations" variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:border-white">Nos prestations</LinkButton>
          </div>
        </div>
      </section>

      <section className="container-page pt-14">
        <SectionHeading eyebrow="Types d'événements" tone="text-event" title="Quel est votre projet ?" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {types.map((t) => (
            <Link key={t.id} href={`/evenementiel/${t.slug}`} className="group card p-5 transition hover:border-event/40 hover:shadow-lg hover:shadow-event/5">
              <span className="grid size-12 place-items-center rounded-2xl bg-event-soft text-event transition group-hover:bg-event group-hover:text-white">
                <DynamicIcon name={t.icon} className="size-6" />
              </span>
              <p className="mt-4 text-lg font-bold">{t.name}</p>
              <p className="text-sm text-muted">{t.tagline}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-event">Découvrir <ArrowRight className="size-4 transition group-hover:translate-x-1" /></p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pt-16">
        <SectionHeading eyebrow="Comment ça marche" tone="text-event" title="Un devis en 3 étapes" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [ClipboardList, "1. Décrivez votre événement", "Type, date, lieu, invités, services : 2 minutes sur votre téléphone."],
            [MessageCircle, "2. Échangez avec un conseiller", "Par WhatsApp ou téléphone, pour affiner chaque détail."],
            [FileCheck2, "3. Validez votre devis en ligne", "Vous recevez un lien sécurisé : consultez, acceptez ou demandez une modification."],
          ].map(([I, t, d]) => {
            const Icon = I as typeof ClipboardList;
            return (
              <div key={t as string} className="card p-5">
                <Icon className="size-6 text-event" />
                <p className="mt-3 font-bold">{t as string}</p>
                <p className="text-sm text-muted">{d as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {packages.length > 0 && (
        <section className="container-page pt-16">
          <SectionHeading eyebrow="Packages" tone="text-event" title="Nos formules prêtes à l'emploi" />
          <div className="grid gap-4 md:grid-cols-3">
            {packages.map((p) => (
              <div key={p.id} className="card flex flex-col p-5">
                <p className="text-lg font-bold">{p.name}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{p.description}</p>
                <p className="mt-4 text-xl font-extrabold">{p.priceVisible && p.price ? formatXAF(p.price) : "Sur devis"}</p>
                <LinkButton href={`/evenementiel/creer?services=${p.items.map((i) => i.serviceId).join(",")}`} variant="event" size="sm" className="mt-3">Choisir ce pack</LinkButton>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="container-page pt-16">
        <SectionHeading eyebrow="Réalisations" tone="text-event" title="Nos derniers événements" action={<LinkButton href="/realisations" variant="outline">Tout voir</LinkButton>} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {realisations.slice(0, 3).map((r) => (
            <RealisationCard key={r.id} realisation={r} eventType={types.find((t) => t.id === r.eventTypeId)} />
          ))}
        </div>
      </section>
    </>
  );
}
