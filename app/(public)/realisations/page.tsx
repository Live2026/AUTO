import type { Metadata } from "next";
import Link from "next/link";
import { RealisationCard } from "@/components/public/realisation-card";
import { cn } from "@/components/ui";
import { getEventTypes, getRealisations } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Nos réalisations",
  description: "Mariages, séminaires, anniversaires, concerts : découvrez les événements organisés par BRYAN MULTISERVICES.",
  alternates: { canonical: "/realisations" },
};

export default async function RealisationsPage(props: PageProps<"/realisations">) {
  const { type } = await props.searchParams;
  const types = await getEventTypes();
  const current = types.find((t) => t.slug === type);
  const list = await getRealisations(current?.id);
  return (
    <div className="container-page py-10">
      <p className="eyebrow text-event">Réalisations</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Nos réalisations</h1>
      <p className="mt-2 max-w-2xl text-muted">Des événements réellement organisés par nos équipes.</p>
      <div className="scrollbar-none -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Link href="/realisations" className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", !current ? "bg-ink text-white" : "border border-line bg-white")}>Tous</Link>
        {types.map((t) => (
          <Link key={t.id} href={`/realisations?type=${t.slug}`} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", current?.id === t.id ? "bg-ink text-white" : "border border-line bg-white")}>
            {t.name}
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r) => (
          <RealisationCard key={r.id} realisation={r} eventType={types.find((t) => t.id === r.eventTypeId)} />
        ))}
      </div>
      {list.length === 0 && <p className="mt-6 text-muted">Pas encore de réalisation publiée dans cette catégorie.</p>}
    </div>
  );
}
