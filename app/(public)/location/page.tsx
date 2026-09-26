import type { Metadata } from "next";
import Link from "next/link";
import { Bus, CalendarRange, Clock, KeyRound, Plane, ShieldCheck, UserRound } from "lucide-react";
import { BannerStrip } from "@/components/public/banner-strip";
import { RentalSearch } from "@/components/public/rental-search";
import { SectionHeading } from "@/components/ui";
import { getBanners, getRentalVehicles, getSettings, getVehicleCategories } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Location de véhicules avec ou sans chauffeur",
  description: "Louez un SUV, 4x4, berline, minibus ou véhicule de prestige à Pointe-Noire et Brazzaville. Courte ou longue durée, transferts aéroport.",
  alternates: { canonical: "/location" },
};

export default async function RentalPage(props: PageProps<"/location">) {
  const sp = await props.searchParams;
  const driver = sp.chauffeur === "avec" ? "with" : sp.chauffeur === "sans" ? "without" : "";
  const duration = sp.duree === "longue" ? "longue" : sp.duree === "courte" ? "courte" : "";
  const [vehicles, categories, settings] = await Promise.all([getRentalVehicles(), getVehicleCategories("rent"), getSettings()]);
  const usedCats = categories.filter((c) => vehicles.some((v) => v.categoryId === c.id));
  return (
    <>
      <section className="bg-rent text-white">
        <div className="container-page py-10 sm:py-14">
          <p className="eyebrow text-white/90">Location</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Louez selon vos besoins</h1>
          <p className="mt-2 max-w-2xl text-white">Avec ou sans chauffeur, courte ou longue durée. Indiquez vos dates : la disponibilité est vérifiée en temps réel.</p>
          <nav className="mt-5 flex flex-wrap gap-2 text-sm" aria-label="Types de location">
            {[
              ["/location?chauffeur=avec", UserRound, "Avec chauffeur", driver === "with"],
              ["/location?chauffeur=sans", KeyRound, "Sans chauffeur", driver === "without"],
              ["/location?duree=courte", Clock, "Courte durée", duration === "courte"],
              ["/location?duree=longue", CalendarRange, "Longue durée", duration === "longue"],
            ].map(([href, I, l, on]) => {
              const Icon = I as typeof Clock;
              return (
                <Link key={href as string} href={href as string} className={on ? "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-semibold text-rent" : "inline-flex items-center gap-1.5 rounded-full bg-black/20 px-3 py-1.5 hover:bg-black/30"}>
                  <Icon className="size-4" />{l as string}
                </Link>
              );
            })}
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-white"><ShieldCheck className="size-4" />Véhicules assurés</span>
          </nav>
        </div>
      </section>
      <div className="container-page -mt-6">
        <RentalSearch key={`${driver}-${duration}`} vehicles={vehicles} categories={usedCats} cities={settings.cities} initialDriver={driver} initialDuration={duration} />
      </div>

      <BannerStrip placement="rental" fallback={await getBanners()} className="container-page pt-10" />
      <section className="container-page pt-16">
        <SectionHeading eyebrow="Services de transport" tone="text-rent" title="Transferts, navettes et chauffeurs privés" description="Pour vos invités, vos délégations ou vos déplacements professionnels (§27)." />
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [Plane, "Transfert aéroport / hôtel", "Accueil personnalisé à l'aéroport Agostinho-Neto ou Maya-Maya."],
            [Bus, "Transport d'invités", "Minibus 15 places avec chauffeur pour vos cérémonies."],
            [UserRound, "Chauffeur privé", "À la journée ou à la semaine, ville à ville."],
          ].map(([I, t, d]) => {
            const Icon = I as typeof Plane;
            return (
              <Link key={t as string} href={`/contact?sujet=${encodeURIComponent(t as string)}`} className="card p-5 transition hover:border-rent/40">
                <Icon className="size-6 text-rent" />
                <p className="mt-3 font-bold">{t as string}</p>
                <p className="text-sm text-muted">{d as string}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
