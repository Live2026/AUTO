import type { Metadata } from "next";
import { QuoteView } from "@/components/public/quote-view";
import { getSettings } from "@/lib/data/catalog";
import { phoneNumber, whatsappNumber } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Votre devis", robots: { index: false, follow: false } };

export default async function QuotePage(props: PageProps<"/devis/[token]">) {
  const { token } = await props.params;
  const settings = await getSettings();
  return (
    <div className="container-page max-w-3xl py-8">
      <QuoteView token={token} settings={settings} whatsappNumber={whatsappNumber(settings, "event")} phoneNumber={phoneNumber(settings, "event")} />
    </div>
  );
}
