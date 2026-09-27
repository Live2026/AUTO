import { PageHero } from "@/components/public/page-hero";
import type { Metadata } from "next";
import { Wand2 } from "lucide-react";
import { ServiceTile } from "@/components/public/service-grid";
import { LinkButton } from "@/components/ui";
import { getServiceCategories, getServices } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Nos prestations événementielles",
  description: "Voitures de mariage, cortèges, navettes, décoration, tentes, sonorisation, éclairage, photo, vidéo, animation, hôtesses, sécurité.",
  alternates: { canonical: "/evenementiel/prestations" },
};

export default async function ServicesPage() {
  const [categories, services] = await Promise.all([getServiceCategories(), getServices()]);
  return (
    <>
    <PageHero tone="event" eyebrow="Événementiel" title="Nos prestations" description={"Combinez librement nos services. Les tarifs indiqués sont des points de départ : chaque devis est établi sur mesure."} crumbs={[["Événementiel", "/evenementiel"], ["Prestations"]]} />
    <div className="container-page py-8">
      <div className="mt-10 space-y-10">
        {categories.map((c) => {
          const list = services.filter((s) => s.categoryId === c.id);
          if (!list.length) return null;
          return (
            <section key={c.id}>
              <h2 className="mb-4 text-xl font-bold">{c.name}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
                  <ServiceTile key={s.id} service={s} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div className="mt-12 rounded-3xl bg-event p-8 text-center text-white">
        <p className="text-2xl font-bold">Prêt à composer votre événement ?</p>
        <LinkButton href="/evenementiel/creer" variant="gold" size="lg" className="mt-4"><Wand2 className="size-5" /> Demander mon devis</LinkButton>
      </div>
    </div>
    </>
  );
}
