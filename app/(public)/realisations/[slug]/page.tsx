import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, MapPin, Users, Wand2 } from "lucide-react";
import { RealisationVisual } from "@/components/public/realisation-card";
import { ServiceTile } from "@/components/public/service-grid";
import { LinkButton } from "@/components/ui";
import { getEventTypes, getRealisationBySlug, getRealisations, getServices } from "@/lib/data/catalog";
import { formatDateLong, formatNumber } from "@/lib/format";

export async function generateStaticParams() {
  return (await getRealisations()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: PageProps<"/realisations/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const r = await getRealisationBySlug(slug);
  return r ? { title: r.title, description: r.description, alternates: { canonical: `/realisations/${r.slug}` } } : {};
}

export default async function RealisationPage(props: PageProps<"/realisations/[slug]">) {
  const { slug } = await props.params;
  const r = await getRealisationBySlug(slug);
  if (!r) notFound();
  const [types, services] = await Promise.all([getEventTypes(), getServices()]);
  const type = types.find((t) => t.id === r.eventTypeId);
  const used = services.filter((s) => r.serviceIds.includes(s.id));
  return (
    <div className="container-page py-8">
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted">
        <Link href="/realisations" className="hover:text-ink">Réalisations</Link>
        <ChevronRight className="size-4" />
        <span>{type?.name}</span>
      </nav>
      <div className="grid gap-3 sm:grid-cols-3">
        <RealisationVisual realisation={r} icon={type?.icon} className="aspect-[4/3] rounded-3xl sm:col-span-2 sm:row-span-2 sm:aspect-auto" />
        <RealisationVisual realisation={{ ...r, palette: [r.palette[1], r.palette[0]] }} icon="Camera" className="aspect-[4/3] rounded-3xl" />
        <RealisationVisual realisation={{ ...r, palette: ["#e5e7eb", r.palette[1]] }} icon="Sparkles" className="aspect-[4/3] rounded-3xl" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow text-event">{type?.name}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{r.title}</h1>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-muted">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{r.city}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" />{formatDateLong(r.eventDate)}</span>
            {r.guests && <span className="inline-flex items-center gap-1.5"><Users className="size-4" />{formatNumber(r.guests)} invités</span>}
          </p>
          <p className="mt-5 text-lg leading-relaxed text-zinc-700">{r.description}</p>
          <h2 className="mt-8 mb-3 text-xl font-bold">Prestations utilisées</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {used.map((s) => (
              <ServiceTile key={s.id} service={s} />
            ))}
          </div>
        </div>
        <aside className="self-start rounded-3xl bg-event p-6 text-white lg:sticky lg:top-24">
          <p className="text-xl font-bold">Un événement similaire en tête ?</p>
          <p className="mt-2 text-white/80">Nous reprenons les mêmes prestations comme point de départ de votre devis.</p>
          <LinkButton href={`/evenementiel/creer?type=${type?.slug ?? ""}&services=${r.serviceIds.join(",")}`} variant="gold" size="lg" className="mt-5 w-full">
            <Wand2 className="size-5" /> Organiser un événement similaire
          </LinkButton>
        </aside>
      </div>
    </div>
  );
}
