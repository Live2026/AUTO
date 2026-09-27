import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

export default function PrivacyPage() {
  return (
    <article className="container-page prose-sm max-w-3xl space-y-4 py-10 text-zinc-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink">
      <h1 className="text-3xl font-extrabold text-ink">Politique de confidentialité</h1>
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Modèle à faire valider par le conseil juridique de BRYAN MULTISERVICES (loi n° 29-2019 du 10 octobre 2019).</p>
      <h2>Données collectées</h2>
      <p>Lorsque vous envoyez une demande, nous collectons : nom, téléphone, numéro WhatsApp, e-mail (facultatif), et les informations liées à votre demande (véhicule, dates, événement…). Aucun compte n&apos;est créé.</p>
      <h2>Finalité</h2>
      <p>Ces données servent uniquement à traiter votre demande, vous recontacter et établir un devis. Elles ne sont ni vendues ni cédées.</p>
      <h2>Durée de conservation</h2>
      <p>Les demandes sans suite sont conservées 3 ans après le dernier contact, puis anonymisées.</p>
      <h2>Vos droits</h2>
      <p>Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en nous contactant. Nous répondons dans les meilleurs délais.</p>
      <h2>Données sur votre téléphone</h2>
      <p>Vos favoris, brouillons de formulaires et la liste de vos demandes sont stockés uniquement sur votre appareil (IndexedDB). Vous pouvez les effacer en vidant les données du site dans votre navigateur.</p>
    </article>
  );
}
