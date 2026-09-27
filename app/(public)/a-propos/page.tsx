import type { Metadata } from "next";
import { CalendarHeart, Car, KeyRound } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { getSettings } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "À propos", alternates: { canonical: "/a-propos" } };

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <div className="container-page max-w-4xl py-10">
      <p className="eyebrow text-gold-deep">À propos</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">BRYAN MULTISERVICES, des solutions — pas des formalités</h1>
      <p className="mt-4 text-lg text-zinc-700">
        Basée à {settings.company.city}, BRYAN MULTISERVICES accompagne particuliers et entreprises dans trois domaines complémentaires :
        l&apos;achat de véhicules, la location avec ou sans chauffeur, et l&apos;organisation d&apos;événements.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          [Car, "Automobile", "Des véhicules sélectionnés, inspectés et au juste prix. Recherche sur commande possible.", "/vehicules", "text-gold"],
          [KeyRound, "Location", "Une flotte entretenue, des chauffeurs expérimentés, en ville comme sur les longues distances.", "/location", "text-rent"],
          [CalendarHeart, "Événementiel", "Mariages, cérémonies, séminaires : mobilité, décoration et technique réunies.", "/evenementiel", "text-event"],
        ].map(([I, t, d, href, tone]) => {
          const Icon = I as typeof Car;
          return (
            <div key={t as string} className="card p-5">
              <Icon className={`size-7 ${tone as string}`} />
              <p className="mt-3 text-lg font-bold">{t as string}</p>
              <p className="mt-1 text-sm text-muted">{d as string}</p>
              <LinkButton href={href as string} variant="outline" size="sm" className="mt-4">Découvrir</LinkButton>
            </div>
          );
        })}
      </div>
      <div className="mt-10 rounded-3xl bg-ink p-8 text-white">
        <p className="text-xl font-bold">Notre principe</p>
        <p className="mt-2 text-white/80">Vous ne venez pas créer un compte : vous venez trouver une solution. Découvrir → Choisir → Demander → Échanger → Confirmer → Réaliser.</p>
      </div>
    </div>
  );
}
