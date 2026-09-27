import { PageHero } from "@/components/public/page-hero";
import type { Metadata } from "next";
import { MyRequestsList } from "@/components/public/favorites-list";

export const metadata: Metadata = { title: "Mes demandes", robots: { index: false } };

export default function MyRequestsPage() {
  return (
    <>
    <PageHero tone="neutral" title="Mes demandes" description={"Retrouvez les demandes envoyées depuis ce téléphone et suivez leur avancement."} crumbs={[["Mes demandes"]]} narrow />
    <div className="container-page max-w-3xl py-8">
      <MyRequestsList />
    </div>
    </>
  );
}
