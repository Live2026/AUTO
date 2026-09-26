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
    <div className="container-page max-w-2xl py-10">
      <p className="eyebrow text-gold-deep">Reprise / échange</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Je souhaite vendre ou échanger mon véhicule</h1>
      <p className="mt-2 text-muted">Décrivez votre véhicule : un conseiller vous recontacte pour une estimation et, si vous le souhaitez, une reprise sur l&apos;achat d&apos;un de nos véhicules.</p>
      <div className="card mt-8 p-5 sm:p-6">
        <RequestForm type="trade_in" summary="Reprise / échange de véhicule" whatsappNumber={whatsappNumber(settings, "sale")} extras={["tradeIn"]} submitLabel="Proposer mon véhicule" defaultMessage="Je souhaite vendre ou échanger mon véhicule." />
      </div>
    </div>
  );
}
