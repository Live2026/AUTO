import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarHeart, Car, Clock, KeyRound, MessageCircle, ShieldCheck } from "lucide-react";
import { RecentlyViewed } from "@/components/public/recently-viewed";
import { RealisationCard } from "@/components/public/realisation-card";
import { RentalCard, VehicleCard } from "@/components/public/vehicle-card";
import { DynamicIcon } from "@/components/public/dynamic-icon";
import { WhatsAppButton } from "@/components/public/contact-links";
import { LinkButton, SectionHeading } from "@/components/ui";
import {
  getActivePromotions,
  getEventTypes,
  getFeaturedVehicles,
  getRealisations,
  getRentalVehicles,
  getSettings,
} from "@/lib/data/catalog";
import { whatsappNumber } from "@/lib/whatsapp";

export default async function HomePage() {
  const [settings, featured, rentals, eventTypes, realisations, promotions] = await Promise.all([
    getSettings(),
    getFeaturedVehicles(6),
    getRentalVehicles(),
    getEventTypes(),
    getRealisations(),
    getActivePromotions(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: settings.company.name,
    description: settings.company.tagline,
    telephone: settings.contactPhones.default,
    email: settings.company.email,
    address: { "@type": "PostalAddress", streetAddress: settings.company.address, addressLocality: settings.company.city, addressCountry: "CG" },
    openingHours: "Mo-Sa 08:00-18:30",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO (§12) */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(60%_60%_at_80%_0%,rgba(201,162,39,0.35),transparent_70%),radial-gradient(40%_50%_at_0%_100%,rgba(14,116,144,0.35),transparent_70%)]" />
        <div className="container-page relative pt-12 pb-10 sm:pt-20 sm:pb-16">
          <p className="eyebrow text-gold">Automobile • Location • Événementiel</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
            BRYAN <span className="text-gold">MULTISERVICES</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">
            Trouvez votre véhicule, louez selon vos besoins ou construisez votre événement avec nos solutions sur mesure.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <HeroAction href="/vehicules" icon={<Car className="size-6" />} title="Acheter un véhicule" text="Neufs & occasions vérifiées" accent="bg-gold text-ink" />
            <HeroAction href="/location" icon={<KeyRound className="size-6" />} title="Louer un véhicule" text="Avec ou sans chauffeur" accent="bg-rent text-white" />
            <HeroAction href="/evenementiel" icon={<CalendarHeart className="size-6" />} title="Organiser un événement" text="Mariages, entreprises, cérémonies" accent="bg-event text-white" />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <WhatsAppButton number={whatsappNumber(settings)} message="Bonjour BRYAN MULTISERVICES, j'aimerais avoir des informations." label="Réponse rapide sur WhatsApp" />
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4 text-gold" />{settings.company.hours}</span>
          </div>
        </div>
      </section>

      {/* PROMOTIONS */}
      {promotions.length > 0 && (
        <section className="border-b border-line bg-gold-soft">
          <div className="container-page scrollbar-none flex gap-3 overflow-x-auto py-3">
            {promotions.map((p) => (
              <Link
                key={p.id}
                href={p.scope === "sale" ? "/vehicules?tab=promotions" : p.scope === "rental" ? "/location" : "/evenementiel/prestations"}
                className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm"
              >
                <span className="font-bold">{p.title}</span>
                <span className="text-muted max-sm:hidden">{p.description}</span>
                <ArrowRight className="size-4 text-gold" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* AUTOMOBILE — première grande section (§13) */}
      <section className="container-page pt-14">
        <SectionHeading
          eyebrow="Vente automobile"
          title="Véhicules disponibles"
          description="Nouveautés, promotions et baisses de prix : chaque véhicule est inspecté et prêt à rouler."
          action={<LinkButton href="/vehicules" variant="outline">Voir tous les véhicules <ArrowRight className="size-4" /></LinkButton>}
        />
        <div className="scrollbar-none -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {featured.map((v) => (
            <div key={v.id} className="w-[82%] shrink-0 snap-start sm:w-auto">
              <VehicleCard vehicle={v} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ["/vehicules?tab=nouveautes", "Nouveautés"],
            ["/vehicules?tab=promotions", "Promotions"],
            ["/vehicules?tab=baisses", "Baisses de prix"],
            ["/vehicules?category=suv", "SUV"],
            ["/vehicules?category=4x4", "4x4"],
            ["/vehicules?category=premium", "Premium"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium hover:border-ink/40">
              {label}
            </Link>
          ))}
        </div>
      </section>

      <RecentlyViewed />

      {/* LOCATION */}
      <section className="mt-16 bg-rent-soft py-14">
        <div className="container-page">
          <SectionHeading
            eyebrow="Location"
            tone="text-rent"
            title="Louez avec ou sans chauffeur"
            description="Courte ou longue durée, transferts aéroport, transport d'invités : une flotte entretenue et des chauffeurs expérimentés."
            action={<LinkButton href="/location" variant="rent">Rechercher une location <ArrowRight className="size-4" /></LinkButton>}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rentals.slice(0, 4).map((v) => (
              <RentalCard key={v.id} vehicle={v} />
            ))}
          </div>
        </div>
      </section>

      {/* ÉVÉNEMENTIEL */}
      <section className="container-page pt-16">
        <SectionHeading
          eyebrow="Événementiel"
          tone="text-event"
          title="Construisez votre événement"
          description="Choisissez votre type d'événement et les prestations souhaitées : nous vous envoyons un devis sur mesure."
          action={<LinkButton href="/evenementiel/creer" variant="event">Créer mon événement <ArrowRight className="size-4" /></LinkButton>}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {eventTypes.map((e) => (
            <Link key={e.id} href={`/evenementiel/${e.slug}`} className="group card flex flex-col gap-3 p-4 transition hover:border-event/40 hover:shadow-lg hover:shadow-event/5">
              <span className="grid size-11 place-items-center rounded-xl bg-event-soft text-event transition group-hover:bg-event group-hover:text-white">
                <DynamicIcon name={e.icon} className="size-5" />
              </span>
              <span>
                <span className="block font-bold">{e.name}</span>
                <span className="block text-sm text-muted">{e.tagline}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* RÉALISATIONS */}
      <section className="container-page pt-16">
        <SectionHeading
          eyebrow="Nos réalisations"
          tone="text-event"
          title="Ils nous ont fait confiance"
          action={<LinkButton href="/realisations" variant="outline">Toutes les réalisations <ArrowRight className="size-4" /></LinkButton>}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {realisations.slice(0, 3).map((r) => (
            <RealisationCard key={r.id} realisation={r} eventType={eventTypes.find((e) => e.id === r.eventTypeId)} />
          ))}
        </div>
      </section>

      {/* RÉASSURANCE */}
      <section className="container-page pt-16">
        <div className="grid gap-4 rounded-3xl bg-ink p-6 text-white sm:grid-cols-3 sm:p-10">
          {[
            [BadgeCheck, "Véhicules vérifiés", "Historique, entretien et état contrôlés avant la mise en vente."],
            [ShieldCheck, "Réservations fiables", "Aucune double réservation : votre véhicule est garanti une fois confirmé."],
            [MessageCircle, "Un conseiller réel", "Pas de compte à créer : un conseiller vous répond directement."],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof BadgeCheck;
            return (
              <div key={title as string} className="flex gap-3">
                <I className="size-6 shrink-0 text-gold" />
                <div>
                  <p className="font-bold">{title as string}</p>
                  <p className="text-sm text-white/70">{text as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function HeroAction({ href, icon, title, text, accent }: { href: string; icon: React.ReactNode; title: string; text: string; accent: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur transition hover:bg-white/10">
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${accent}`}>{icon}</span>
      <span className="flex-1">
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-white/60">{text}</span>
      </span>
      <ArrowRight className="size-5 text-white/40 transition group-hover:translate-x-1 group-hover:text-white" />
    </Link>
  );
}
