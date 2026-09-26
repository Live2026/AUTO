import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Wand2 } from "lucide-react";
import { WhatsAppButton } from "@/components/public/contact-links";
import { DynamicIcon } from "@/components/public/dynamic-icon";
import { RealisationCard } from "@/components/public/realisation-card";
import { ServiceTile } from "@/components/public/service-grid";
import { LinkButton, SectionHeading } from "@/components/ui";
import { getEventTypeBySlug, getEventTypes, getPackages, getRealisations, getRecommendations, getServices, getSettings } from "@/lib/data/catalog";
import { formatXAF } from "@/lib/format";
import { fillTemplate, whatsappNumber } from "@/lib/whatsapp";

export async function generateStaticParams() {
  return (await getEventTypes()).map((t) => ({ type: t.slug }));
}

export async function generateMetadata(props: PageProps<"/evenementiel/[type]">): Promise<Metadata> {
  const { type } = await props.params;
  const t = await getEventTypeBySlug(type);
  if (!t) return {};
  return { title: `${t.name} — ${t.tagline}`, description: t.description, alternates: { canonical: `/evenementiel/${t.slug}` } };
}

export default async function EventTypePage(props: PageProps<"/evenementiel/[type]">) {
  const { type: slug } = await props.params;
  const type = await getEventTypeBySlug(slug);
  if (!type) notFound();
  const [recs, services, packages, realisations, settings] = await Promise.all([
    getRecommendations(type.id),
    getServices(),
    getPackages(type.id),
    getRealisations(type.id),
    getSettings(),
  ]);
  const recServices = recs.map((r) => services.find((s) => s.id === r.serviceId)).filter((s) => !!s);

  return (
    <>
      <section className="bg-event-soft">
        <div className="container-page py-12">
          <span className="grid size-14 place-items-center rounded-2xl bg-event text-white"><DynamicIcon name={type.icon} className="size-7" /></span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">{type.name}</h1>
          <p className="mt-1 text-lg font-semibold text-event">{type.tagline}</p>
          <p className="mt-3 max-w-2xl text-zinc-700">{type.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href={`/evenementiel/creer?type=${type.slug}`} variant="event" size="lg"><Wand2 className="size-5" /> Demander un devis</LinkButton>
            <WhatsAppButton number={whatsappNumber(settings, "event")} message={fillTemplate(settings.whatsappTemplates.event, { type_evenement: type.name.toLowerCase() })} size="lg" pole="event" />
          </div>
        </div>
      </section>

      {recServices.length > 0 && (
        <section className="container-page pt-12">
          <SectionHeading title={`Nos prestations pour votre ${type.name.toLowerCase()}`} tone="text-event" eyebrow="Composez votre solution" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recServices.map((s) => (
              <ServiceTile key={s.id} service={s} />
            ))}
          </div>
        </section>
      )}

      {packages.length > 0 && (
        <section className="container-page pt-12">
          <SectionHeading title="Formules" tone="text-event" eyebrow="Packages" />
          <div className="grid gap-4 md:grid-cols-2">
            {packages.map((p) => (
              <div key={p.id} className="card flex flex-col p-5">
                <p className="text-lg font-bold">{p.name}</p>
                <p className="mt-1 flex-1 text-sm text-muted">{p.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xl font-extrabold">{p.priceVisible && p.price ? formatXAF(p.price) : "Sur devis"}</p>
                  <LinkButton href={`/evenementiel/creer?type=${type.slug}&services=${p.items.map((i) => i.serviceId).join(",")}`} variant="event" size="sm">Choisir</LinkButton>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {realisations.length > 0 && (
        <section className="container-page pt-12">
          <SectionHeading title="Nos réalisations" tone="text-event" eyebrow="Ils nous ont fait confiance" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {realisations.map((r) => (
              <RealisationCard key={r.id} realisation={r} eventType={type} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
