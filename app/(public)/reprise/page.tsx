import { PageHero } from "@/components/public/page-hero";
import type { Metadata } from "next";
import { RequestForm } from "@/components/public/request-form";
import { getSettings } from "@/lib/data/catalog";
import { whatsappNumber } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Vendre ou échanger mon véhicule",
  description: "Proposez votre véhicule à la reprise ou à l'échange contre un véhicule BRYAN MULTISERVICES.",
  alternates: { canonical: "/reprise" },
};

export default async function TradeInPage() {
  const settings = await getSettings();
  return (
    <>
    <PageHero tone="auto" eyebrow="Reprise / échange" title="Je souhaite vendre ou échanger mon véhicule" description={"Décrivez votre véhicule : un conseiller vous recontacte pour une estimation et, si vous le souhaitez, une reprise sur l'achat d'un de nos véhicules."} crumbs={[["Véhicules", "/vehicules"], ["Reprise"]]} narrow />
    <div className="container-page max-w-2xl py-8">
      <div className="card mt-8 p-5 sm:p-6">
        <RequestForm type="trade_in" summary="Reprise / échange de véhicule" whatsappNumber={whatsappNumber(settings, "sale")} extras={["tradeIn"]} submitLabel="Proposer mon véhicule" defaultMessage="Je souhaite vendre ou échanger mon véhicule." />
      </div>
    </div>
    </>
  );
}
