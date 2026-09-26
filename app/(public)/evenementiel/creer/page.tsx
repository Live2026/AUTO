import type { Metadata } from "next";
import { Suspense } from "react";
import { EventWizard } from "@/components/public/event-wizard";
import {
  getAllRecommendations,
  getEventTypes,
  getPackages,
  getServiceCategories,
  getServices,
  getSettings,
} from "@/lib/data/catalog";
import { whatsappNumber } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Créer mon événement — devis sur mesure",
  description: "Décrivez votre événement en 2 minutes et recevez un devis personnalisé de BRYAN MULTISERVICES.",
  alternates: { canonical: "/evenementiel/creer" },
};

export default async function CreateEventPage() {
  const [eventTypes, categories, services, packages, recommendations, settings] = await Promise.all([
    getEventTypes(),
    getServiceCategories(),
    getServices(),
    getPackages(),
    getAllRecommendations(),
    getSettings(),
  ]);
  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mx-auto mb-8 max-w-3xl">
        <p className="eyebrow text-event">Créer mon événement</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Décrivez votre projet, on s&apos;occupe du reste</h1>
      </div>
      <Suspense>
        <EventWizard
          eventTypes={eventTypes}
          categories={categories}
          services={services}
          packages={packages}
          recommendations={recommendations}
          cities={settings.cities}
          whatsappNumber={whatsappNumber(settings, "event")}
          whatsappTemplate={settings.whatsappTemplates.event}
        />
      </Suspense>
    </div>
  );
}
